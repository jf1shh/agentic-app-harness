#!/usr/bin/env node
// Harness Status — the deterministic "senses" of the agentic loop.
//
// Scans every app in projects/ against the harness mandates (see
// .agents/AGENTS.md) plus the anti-pattern guardrails distilled from the
// "Learned Lessons" section, and emits:
//   1. A human-readable report to stdout.
//   2. A machine-readable harness-status.json at the repo root, consumed by
//      emit-tasks.mjs to generate agent work orders.
//
// This layer never calls an LLM and needs no API key: it only senses and
// reports. Any AI agent (Claude Code, Cursor, Copilot, Aider, ...) is the
// interchangeable actuator that acts on the tasks this produces.
//
// Usage:
//   node scripts/harness-status.mjs            # report + write status file
//   node scripts/harness-status.mjs --strict   # exit 1 if ANY finding exists
//   node scripts/harness-status.mjs --gate     # VERIFY gate: exit 1 only on
//                                              #   blocking findings (guardrail
//                                              #   regressions + missing spec)
//   node scripts/harness-status.mjs --quiet    # write status file, minimal stdout
//
// This module is also importable (e.g. by harness-status.test.mjs): the run
// block only executes when invoked directly, and GUARDRAILS / senseApp /
// collectStatus / isBlocking are exported.

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { senseTokenBudget } from './token-budget.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');
const specsDir = join(repoRoot, 'specs');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'out', '.vite', 'coverage', 'android', 'playwright-report', 'test-results']);

// ---------------------------------------------------------------------------
// Harness composition primitives.
//
// These keep the implementation functional and zero-dependency while making
// the four deliberate patterns explicit:
//   - Pipeline: deterministic stages transform one value in sequence.
//   - Chain of Responsibility: every registered sensor handler contributes its
//     findings without knowing about the other handlers.
//   - Strategy: blocking policy is injectable instead of hard-coded at callers.
//   - Adapter: project-specific filesystem conventions are normalized behind a
//     small interface.
// ---------------------------------------------------------------------------
export function runPipeline(initialValue, stages) {
  return stages.reduce((value, stage) => stage(value), initialValue);
}

export function createSensorChain(handlers) {
  return (context) => handlers.flatMap((handler) => handler(context) || []);
}

export function createBlockingStrategy(rules) {
  const policy = rules || [
    (finding) => finding.type === 'guardrail',
    (finding) => finding.type === 'unit-test-coverage',
    (finding) => finding.type === 'missing-artifact' && finding.severity === 'high',
  ];
  return (finding) => policy.some((rule) => rule(finding));
}

const defaultBlockingStrategy = createBlockingStrategy();

export function createProjectAdapter(app, projPath) {
  return {
    app,
    root: projPath,
    path: (...parts) => join(projPath, ...parts),
    files: (exts) => walk(projPath, exts),
    read: (file) => readSafe(file),
    relative: (file) => rel(file),
  };
}

// A test file, by either convention this monorepo uses: co-located `foo.test.ts`
// (elder-care-planner, smart-recipe-app), a `__tests__/` sibling (mood-diner,
// portfolio-hub) or an app-root `__tests__/` (travel-packing-app).
const TEST_FILE_RE = /\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/;
const isE2EPath = (p) => /[\\/]e2e[\\/]/.test(p);
// A *unit* test is any test file that is not a Playwright E2E spec. The split
// matters: `e2e/*.spec.ts` is already sensed separately (BDD check, sensor 4),
// and Vitest is configured everywhere to exclude `e2e/**`.
const isUnitTestPath = (p) => TEST_FILE_RE.test(p) && !isE2EPath(p);

// ---------------------------------------------------------------------------
// Guardrails: anti-patterns distilled from AGENTS.md "Learned Lessons". Each
// one is a regression we have paid for once; encoding it here means the harness
// catches it deterministically instead of hoping the next agent read the prose.
//
// LEARN invariant (enforced by harness-learn.mjs): every guardrail must carry a
// `lesson` back-reference, and its `id` must be tagged `[guardrail: <id>]` on the
// motivating bullet in .agents/AGENTS.md. No orphan rules, no undocumented rules.
//
// Optional `appliesTo(projPath)` narrows a guardrail to the apps it is true for.
// Some anti-patterns are only anti-patterns in a specific deployment target (e.g.
// a hardcoded Pages subpath is correct for a web-only app and fatal for one with
// a native container), so scoping keeps the rule sharp instead of forcing a
// false-positive on every other app. The line-level `test` contract is unchanged,
// so the self-test in harness-status.test.mjs still covers every guardrail.
// ---------------------------------------------------------------------------
const GUARDRAILS = [
  {
    id: 'viewport-no-zoom',
    label: 'Accessible viewport (no user-scalable=no / maximum-scale)',
    lesson: 'Mobile PWA Viewport Accessibility',
    exts: ['.html'],
    test: (line) => /user-scalable\s*=\s*no/i.test(line) || /maximum-scale\s*=\s*(1(\.0)?)\b/i.test(line),
    severity: 'high',
    gate: 'guardrails',
    why: 'Disabling zoom fails @axe-core WCAG 1.4.4. Use width=device-width, initial-scale=1.0, viewport-fit=cover.',
  },
  {
    id: 'explicit-any',
    label: 'No explicit `any` in application source',
    lesson: 'Strict TypeScript in Harness',
    exts: ['.ts', '.tsx'],
    excludePath: (p) => /\.(test|spec)\.tsx?$/.test(p) || /[\\/]e2e[\\/]/.test(p),
    test: (line) => /\bas any\b/.test(line) || /:\s*any(\[\])?(\s|;|,|\)|>|=|$)/.test(line),
    severity: 'medium',
    gate: 'guardrails',
    why: 'The harness enforces @typescript-eslint/no-explicit-any. Define explicit interfaces instead.',
  },
  {
    id: 'root-service-worker',
    label: 'Subpath-safe service worker registration (no absolute /sw.js)',
    lesson: 'PWA Service Worker Subpath Scoping',
    exts: ['.html', '.ts', '.tsx', '.js'],
    test: (line) => /register\(\s*['"`]\/[^'"`]*sw\.js/i.test(line),
    severity: 'high',
    gate: 'guardrails',
    why: 'Root-absolute /sw.js 404s under GitHub Pages subpaths. Derive the path from window.location.pathname.',
  },
  {
    id: 'pbkdf2-salt-buffer',
    label: 'WebCrypto PBKDF2 salt normalization (no salt*.buffer)',
    lesson: 'Node WebCrypto TypedArray Buffer Normalization',
    exts: ['.ts', '.tsx', '.js'],
    test: (line) => /salt[A-Za-z0-9_]*\.buffer\b/.test(line),
    severity: 'high',
    gate: 'guardrails',
    why: 'Passing saltBytes.buffer to deriveKey throws in Node 20 WebCrypto. Pass new Uint8Array(saltBytes) as BufferSource.',
  },
  {
    id: 'responsive-grid',
    label: 'Responsive grids (no fixed multi-column inline grids / oversized minmax)',
    lesson: 'Responsive Grid Layouts',
    exts: ['.ts', '.tsx', '.css'],
    test: (line) => {
      // (a) Inline fixed multi-track grid: media queries cannot override inline
      // styles, so `gridTemplateColumns: '1fr 1fr'` (or '1fr 2fr', '200px 1fr', …)
      // never collapses on phones. A responsive value uses repeat/auto-fit/minmax.
      const m = line.match(/gridTemplateColumns:\s*['"`]([^'"`]+)['"`]/);
      if (m && /\S\s+\S/.test(m[1]) && !/repeat|auto-fit|auto-fill|minmax|min\(/.test(m[1])) return true;
      // (b) Fixed grid track basis >= 300px overflows narrow viewports. Wrap it as
      // minmax(min(<basis>px, 100%), 1fr) so the track never exceeds the container.
      if (/minmax\(\s*([3-9]\d\d|\d{4,})px/.test(line)) return true;
      return false;
    },
    severity: 'medium',
    gate: 'guardrails',
    why: 'Fixed multi-track inline grids do not collapse and minmax() mins >= 300px overflow phones. Use repeat(auto-fit, minmax(min(BASIS, 100%), 1fr)) or a media query.',
  },
  {
    id: 'capacitor-absolute-base',
    label: 'WebView-safe bundler base (no hardcoded deploy subpath in a Capacitor app)',
    lesson: 'Capacitor Absolute Base Path',
    // Only apps that actually ship a native container are in scope: for a
    // web-only app a Pages subpath base is the correct configuration.
    appliesTo: (projPath) => existsSync(join(projPath, 'capacitor.config.ts'))
      || existsSync(join(projPath, 'capacitor.config.json'))
      || existsSync(join(projPath, 'android')),
    exts: ['.ts', '.js', '.mjs'],
    // Scope to the bundler config — a subpath string anywhere else (a route, a
    // fetch URL, an asset href) is not this bug.
    excludePath: (p) => !/[\\/](vite|next)\.config\.(ts|js|mjs)$/.test(p),
    // Fires on a root-absolute, multi-segment base literal ('/foo…'), including
    // inside a ternary. Stays silent on the WebView-safe values './' and '/'.
    test: (line) => /\b(base|basePath):\s*.*['"`]\/[A-Za-z0-9._-]+/.test(line),
    severity: 'high',
    gate: 'guardrails',
    why: "Capacitor serves the bundle from https://localhost/ in the Android WebView, so a hardcoded '/<repo>/<app>/' base makes every asset URL 404 and the app boots to a white screen. Use a relative base ('./'), which resolves under both the Pages subpath and the WebView origin.",
  },
  {
    id: 'no-op-assertion',
    label: 'Assertions that can actually fail (no bare expect(), no self-satisfying type check)',
    lesson: 'Prove a New Test Can Fail',
    exts: ['.ts', '.tsx'],
    // Test files only — `expect(...)` outside a test is not this bug, and the
    // type-tautology shape is only a lie when it is claimed as coverage.
    excludePath: (p) => !TEST_FILE_RE.test(p),
    test: (line) => {
      // (a) An `expect(x)` with no matcher chained onto it evaluates x and
      // asserts nothing. Three things keep legitimate code out of scope:
      // the `).`-anywhere exclusion (a matcher on this line), requiring the
      // call to *close* here (so a wrapped `expect(` whose matcher is below is
      // untouched), and requiring a terminating `;` — because the other way to
      // wrap a chain puts the matcher on the NEXT line:
      //     expect(Schema.parse(x))
      //       .toEqual(y);
      // That first line closes the call and is a complete statement by shape,
      // so only the absent semicolon distinguishes it from the real defect.
      // Cost of the semicolon requirement: a genuinely bare `expect(x)` written
      // without one is missed. Accepted deliberately — every app here lints
      // under ESLint with semicolons, and a false positive on a normal chain
      // would block real work, which is far worse for a blocking guardrail.
      if (/^\s*(await\s+)?expect\(.+\)\s*;\s*$/.test(line) && !/\)\s*\./.test(line)) return true;
      // (b) A value annotated as `typeof X` and cast back to `typeof X` is the
      // same type on both sides, so no change to X can ever make it fail.
      // This is the exact shape PR #41 shipped as a "drift tripwire" (§9.4).
      if (/:\s*typeof\s+(\w+)\s*=\s*.*\bas\s+.*\btypeof\s+\1\b/.test(line)) return true;
      return false;
    },
    severity: 'high',
    gate: 'guardrails',
    why: 'A test that cannot fail is not weak coverage — it is a false statement about what is covered, and it displaces the real test nobody now thinks to write. Chain a matcher onto every expect(), and assert behaviour rather than annotating a type against itself.',
  },
  {
    id: 'unpinned-deps',
    label: 'Pinned dependency versions (no ^ ~ >= > < * or "latest")',
    lesson: 'Unpinned Dependencies Drift Without Code Changes',
    exts: ['.json'],
    // Only package.json files — other JSON files may legitimately use version ranges.
    excludePath: (p) => !/[\\/]package\.json$/.test(p),
    test: (line) => {
      // Match dependency entries whose version value starts with an unpinned specifier.
      // Pinned versions are digits-and-dots only (e.g. "1.2.3").
      // We look for: "key": "<unpinned>", optionally with trailing comma.
      const m = line.match(/^\s*"[^"]+"\s*:\s*"([^"]+)"\s*,?\s*$/);
      if (!m) return false;
      const version = m[1];
      // Exclude special fields that aren't package versions.
      if (version === 'workspace:*') return false;
      // Pinned: digits and dots only (optionally with a leading 'v').
      if (/^(v?\d+\.\d+\.\d+([-.][\w.]+)?)$/.test(version)) return false;
      // Unpinned: starts with ^ ~ >= > < * or is literally 'latest'.
      return /^[\^~>=<*]/.test(version) || version === 'latest';
    },
    severity: 'medium',
    gate: 'guardrails',
    why: 'Unpinned dependency ranges (^1.0.0, ~1.0.0, >=1.0.0, latest) allow a fresh npm install to resolve a different version than the one the suite passed against. A dependency bump is only safe when it moves with a tracked change — an unpinned range is a silent drift on every install. Pin to an exact version ("1.2.3").',
  },
  {
    id: 'ease-in-on-enter',
    label: 'Enter animations use ease-out (no ease-in on mount/enter)',
    lesson: 'Ease-In Timing On Enter Animations Feels Jarring',
    exts: ['.tsx', '.jsx', '.css'],
    excludePath: (p) => /\.(test|spec)\.(tsx?|jsx?)$/.test(p) || /[\\/]e2e[\\/]/.test(p),
    test: (line) => {
      // (a) Tailwind: the bare `ease-in` utility class (not ease-in-out or ease-in-*).
      if (/\bease-in(?!-)\b/.test(line)) return true;
      // (b) Framer Motion / JS animation: `ease: "easeIn"` or `ease: 'easeIn'`.
      if (/ease:\s*["'`]easeIn["'`]/.test(line)) return true;
      // (c) CSS standard ease-in cubic bezier: cubic-bezier(0.4, 0, 1, 1).
      if (/cubic-bezier\(\s*0\.4\s*,\s*0\s*,\s*1\s*,\s*1\s*\)/.test(line)) return true;
      return false;
    },
    severity: 'low',
    gate: 'guardrails',
    why: 'Ease-in (decelerating into position) on enter/mount animations feels sluggish — the element appears to slow down as it arrives. Use ease-out instead: the element accelerates into view and settles naturally. Ease-in is correct for exit/leave transitions, but those are rare in UI work compared to enter. If this line is on an exit animation, ignore the finding.',
  },
  {
    id: 'text-truncate-missing',
    label: 'Truncated text shows an indicator (no overflow-hidden + whitespace-nowrap without truncate/ellipsis)',
    lesson: 'Hidden Text Overflow Must Indicate Truncation',
    exts: ['.tsx', '.jsx'],
    excludePath: (p) => /\.(test|spec)\.(tsx?|jsx?)$/.test(p) || /[\\/]e2e[\\/]/.test(p),
    test: (line) => {
      // The anti-pattern: overflow-hidden + whitespace-nowrap but no truncate
      // indicator. Catches both Tailwind `className="... overflow-hidden ... whitespace-nowrap ..."`
      // and inline styles where the compound pattern exists without truncate/ellipsis/line-clamp.
      if (!/\boverflow-hidden\b/.test(line)) return false;
      if (!/\bwhitespace-nowrap\b/.test(line)) return false;
      // Has the escape hatch: truncate or text-ellipsis means the user knows
      // text is being cut off, which is the right behaviour.
      if (/\btruncate\b/.test(line)) return false;
      if (/\btext-ellipsis\b/.test(line)) return false;
      if (/\bline-clamp-\d\b/.test(line)) return false;
      return true;
    },
    severity: 'low',
    gate: 'guardrails',
    why: 'overflow-hidden + whitespace-nowrap clips text invisibly — the user sees a sentence stop mid-word with no ellipsis or fade, and has no way to know content was hidden. Add `truncate` (Tailwind) or `text-ellipsis` alongside the overflow classes so the truncation is visually indicated.',
  },
];

// Guardrails that start non-blocking despite living in GUARDRAILS — see the
// unpinned-deps comment at their call site in senseApp() for why. This set is
// the single source of truth for "is this guardrail's finding type blocking
// or manual-review": both senseApp() (real findings) and allRuleMeta() (the
// rule registry harness-history.mjs reads to judge "chronically firing" vs.
// "clean") must derive a guardrail's finding type from it, or the registry
// and the actual gate can disagree about whether a rule blocks — exactly the
// kind of drift check-guardrail-integrity.mjs exists to catch, one level up.
const GUARDRAIL_NON_BLOCKING_IDS = new Set(['unpinned-deps']);
const guardrailFindingType = (g) => GUARDRAIL_NON_BLOCKING_IDS.has(g.id) ? 'manual-review' : 'guardrail';

// ---------------------------------------------------------------------------
// Mobile release readiness — an INFORMATIONAL sensor for apps that ship a
// native container. These are *absence* checks (no signing config, an unbranded
// launcher icon, a missing privacy policy), which cannot be expressed as the
// line-level `test(line)` predicate that GUARDRAILS and their self-test require
// — hence a separate sensor rather than a guardrail.
//
// Deliberately NON-BLOCKING: findings carry type 'mobile-readiness', which
// isBlocking() does not gate on, so an in-progress store submission informs
// without painting every PR red. If one of these ever becomes line-detectable
// and must never regress, promote it to a real guardrail under the §8 protocol.
//
// Everything here is scoped to apps with a native container, so the four
// web-only apps are untouched.
// ---------------------------------------------------------------------------

// sha256 of the launcher icons emitted by `npx cap add android` (Capacitor 8).
// An app still shipping these has never been branded. Fail-open by design: a
// different Capacitor default simply won't match, so a real custom icon can
// never be false-flagged.
const CAPACITOR_DEFAULT_ICON_SHA256 = new Set([
  '72b71c3581ca3b5a23b1c168d69b9d855b3f184fa079902a01f088eb4f0607d5', // mipmap-hdpi/ic_launcher.png
  '27ed3603010ebc278f64f8645741ab132ff517abb5308eb9df6c8e42a48956b2', // mipmap-mdpi/ic_launcher.png
  'd35dbfff175b83c13ef59cf924abfc810f7b6a158595d7417c5498ea8c7c7ed1', // mipmap-xhdpi/ic_launcher.png
  'ed346eb1e3f0280f15709393705899b3ff55c20b88f4e0308006b3c33cf5fe14', // mipmap-xxhdpi/ic_launcher.png
  '87cb2f2ffe992652bb4fa768c73719a37b5852ab17fbf8e170e888f7a42b0761', // mipmap-xxxhdpi/ic_launcher.png
]);

function hasNativeContainer(projPath) {
  return existsSync(join(projPath, 'android'))
    || existsSync(join(projPath, 'capacitor.config.ts'))
    || existsSync(join(projPath, 'capacitor.config.json'));
}

// policyRoots is injectable so the self-test can drive it from a fixture rather
// than depending on the real repo root's contents.
export function senseMobileRelease(app, projPath, workflowsDir,
  policyRoots = [projPath, join(projPath, 'public'), repoRoot]) {
  const findings = [];
  if (!hasNativeContainer(projPath)) return findings;

  const add = (id, severity, title, detail) => findings.push({
    id: `${app}-mobile-${id}`, ruleId: `mobile-readiness:${id}`, type: 'mobile-readiness', severity,
    gate: 'manual-review', title, detail,
  });

  const androidDir = join(projPath, 'android');

  // 1. Release signing — Play will not accept an unsigned artifact.
  const gradle = readSafe(join(androidDir, 'app', 'build.gradle'));
  if (gradle && !/signingConfigs?\s*\{/.test(gradle)) {
    add('no-signing-config', 'high',
      `No release signing config in ${app} android/app/build.gradle`,
      'Play requires an App Bundle signed with an upload key. Add a signingConfigs block (reading the keystore path/passwords from env or local.properties — never commit them) and reference it from buildTypes.release.');
  }

  // 2. Version bump — every upload after the first needs a higher versionCode.
  if (/versionCode\s+1\b/.test(gradle)) {
    add('default-version-code', 'medium',
      `${app} still declares versionCode 1`,
      'versionCode is hardcoded to 1, so a second upload would be rejected. Drive it from CI (build number) or bump it deliberately per release.');
  }

  // 3. Branding — a stock Capacitor icon is an obvious placeholder.
  const resDir = join(androidDir, 'app', 'src', 'main', 'res');
  const defaultIcons = [];
  let mipmapDirs = [];
  try {
    mipmapDirs = readdirSync(resDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('mipmap'))
      .map((e) => join(resDir, e.name));
  } catch { /* no res/ yet (config without a generated platform) */ }
  for (const d of mipmapDirs) {
    const icon = join(d, 'ic_launcher.png');
    if (!existsSync(icon)) continue;
    try {
      if (CAPACITOR_DEFAULT_ICON_SHA256.has(createHash('sha256').update(readFileSync(icon)).digest('hex'))) {
        defaultIcons.push(rel(icon));
      }
    } catch { /* unreadable icon is not a finding */ }
  }
  if (defaultIcons.length) {
    add('default-launcher-icon', 'high',
      `${app} ships the stock Capacitor launcher icon (${defaultIcons.length} density${defaultIcons.length > 1 ? ' variants' : ''})`,
      `Placeholder branding in a store listing. Replace the launcher icons with the app's own artwork:\n${defaultIcons.map((f) => `  - ${f}`).join('\n')}`);
  }

  // 4. Display name — the raw directory slug is not a store-facing name.
  const strings = readSafe(join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'));
  const label = strings.match(/<string name="app_name">([^<]*)<\/string>/)?.[1];
  if (label && (label === app || /[-_]/.test(label))) {
    add('slug-app-name', 'medium',
      `${app} app_name is the raw slug '${label}'`,
      `The launcher label and store listing show '${label}'. Set a human display name in android/app/src/main/res/values/strings.xml.`);
  }

  // 5. Web manifest icons that do not resolve on disk.
  const publicDir = join(projPath, 'public');
  const manifestRaw = readSafe(join(publicDir, 'manifest.json'));
  if (manifestRaw) {
    try {
      const missing = (JSON.parse(manifestRaw).icons || [])
        .map((i) => i.src)
        .filter((src) => src && !/^https?:/i.test(src))
        .filter((src) => !existsSync(join(publicDir, src.replace(/^\.?\//, ''))));
      if (missing.length) {
        add('manifest-icons-missing', 'high',
          `${app} manifest.json references ${missing.length} icon(s) that do not exist`,
          `These 404 at runtime, breaking PWA installability and the store icon pipeline: ${missing.join(', ')}`);
      }
    } catch { /* malformed manifest is out of scope for this sensor */ }
  }

  // 6. Privacy policy — mandatory for every Play listing.
  const hasPolicy = policyRoots.some((base) => {
    try { return readdirSync(base).some((f) => /privacy/i.test(f)); } catch { return false; }
  });
  if (!hasPolicy) {
    add('no-privacy-policy', 'high',
      `No privacy policy found for ${app}`,
      'Play requires a privacy policy URL for every listing, and a Data safety declaration consistent with it. Add one and link it from the app and the listing.');
  }

  // 7. CI produces no installable artifact, so nothing verifies the native build.
  // Scoped per-app: a workflow file only counts if it both runs an Android build
  // step AND references this app's own projects/<app> path. Without the second
  // half, one app's android-release.yml (e.g. mood-diner's) would silently
  // satisfy this check for every other app in the repo too, since they all share
  // the same workflows directory — this sensor would then never fire again even
  // for a brand-new native app added with no CI of its own.
  const wfFiles = workflowsDir && existsSync(workflowsDir) ? readdirSync(workflowsDir) : [];
  const hasAndroidCi = wfFiles.some((f) => {
    const c = readSafe(join(workflowsDir, f));
    return /gradlew|bundleRelease|assembleRelease|cap\s+sync/.test(c) && c.includes(`projects/${app}`);
  });
  if (!hasAndroidCi) {
    add('no-android-ci', 'medium',
      `No CI job builds the ${app} Android artifact`,
      'The workflows only build and test the web bundle, so a broken native build reaches a release unnoticed. Add a job that runs the Capacitor sync and a Gradle release build, and uploads the AAB.');
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Production-bundle test coverage — an INFORMATIONAL sensor.
//
// A Playwright suite pointed only at the dev server proves nothing about the
// artifact that ships: the dev server rewrites away the deploy-specific
// configuration (`base`/`basePath`, asset URLs, hashed chunk names) that breaks
// real deployments. This is the absence check for the lesson "Test the Artifact
// You Ship, at Every Origin It Ships To" — a test that does not exist cannot be
// caught by a line-level guardrail, so it lives here.
//
// Non-blocking, like senseMobileRelease: this describes missing coverage rather
// than a regression, and blocking it would fail every PR on apps that have not
// adopted it yet. See scripts/serve-dist.mjs for the shared server that makes
// adoption a config line rather than new code.
// ---------------------------------------------------------------------------
const PLAYWRIGHT_CONFIGS = ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs'];

// A webServer that compiles the app or serves a built directory. Matching the
// config (rather than the specs) is what distinguishes "loads the built output"
// from "asserts about production" — only the server decides what is served.
const BUILDS_PRODUCTION = /\b(vite|next|rollup|webpack)\s+build\b|npm\s+run\s+build\b|serve-dist|\bserve\b[^\n]*\b(dist|out|build)\b|http-server/;

export function senseProductionBundleTest(app, projPath) {
  const findings = [];
  const cfgPath = PLAYWRIGHT_CONFIGS.map((f) => join(projPath, f)).find((p) => existsSync(p));
  // No Playwright config at all is a different (already sensed) problem.
  if (!cfgPath) return findings;

  const cfg = readSafe(cfgPath);
  if (!cfg || BUILDS_PRODUCTION.test(cfg)) return findings;

  findings.push({
    id: `${app}-no-production-bundle-test`,
    ruleId: 'production-bundle-test-missing',
    type: 'test-coverage',
    severity: 'high',
    gate: 'manual-review',
    title: `E2E for ${app} never loads the production build`,
    detail: 'Every webServer in this config runs a dev server, so no test exercises the built '
      + 'output — the deploy-specific config (base/basePath, asset URLs, chunk names) is never '
      + 'checked. Add a webServer that builds the app and serves it with '
      + '`node ../../scripts/serve-dist.mjs --dist <dir> --port <n> [--prefix <deploy path>]`, '
      + 'and a spec that loads it and fails on any response >= 400. Prove it works by mutation: '
      + 'break the base path and confirm the new test actually fails. '
      + 'See projects/mood-diner/e2e/production-bundle.spec.ts.',
    evidence: [{ file: rel(cfgPath), line: 1, snippet: 'webServer runs a dev server only' }],
  });
  return findings;
}

// ---------------------------------------------------------------------------
// Dead public assets — an INFORMATIONAL sensor.
//
// public/ is copied verbatim into every web build (and the Capacitor
// container), so a file nothing references is pure payload on every ship. The
// 2026-08 optimization audits found this class twice, only by hand:
// mood-diner's obsolete public/playstore-banner.jpg (681 KB) and
// icon-512.jpg (489 KB), and five unreferenced create-next-app placeholder
// SVGs in each of travel-packing-app and smart-recipe-app.
//
// "No file references this asset" is an *absence* check across the whole tree
// — the reference can be several files away (index.html -> manifest.json ->
// icon-512.png) and any extension — so no test(line) predicate can express it:
// a sensor, not a guardrail.
//
// Deliberately NON-BLOCKING, per the §8 sensor policy: deleting an asset can
// need product judgement (a brand asset, a store-listing source, a privacy
// policy intentionally hosted standalone), so this reports and becomes a work
// order instead of painting PRs red. It can be promoted to blocking only once
// it has been quiet long enough to describe a regression — and even then it
// stays a sensor, because the check is a whole-tree property, not a line.
//
// What it deliberately does NOT claim: a *referenced* but oversized asset (a
// 500 KB icon the manifest really uses) is a size-tuning question, not this
// bug — re-encoding wants a human eyeball and is out of scope here.
// ---------------------------------------------------------------------------
export function senseDeadPublicAssets(app, projPath) {
  const findings = [];
  const publicDir = join(projPath, 'public');
  if (!existsSync(publicDir)) return findings;

  const assets = readdirSync(publicDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(publicDir, e.name));
  if (!assets.length) return findings;
  const assetNames = assets.map((a) => basename(a));

  // Every app file an asset could be referenced from — including public/*
  // itself, so the index.html -> manifest.json -> icon-512.png chain resolves,
  // and markdown/e2e/store-listing docs (a privacy.html the README links is a
  // live asset). Excludes vendored/native/build trees: node_modules, android,
  // dist/out/.next*/build outputs, and the fixture caches.
  const sources = [];
  const stack = [projPath];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.next')) stack.push(full);
      } else {
        sources.push(full);
      }
    }
  }

  const assetByPath = new Map(assets.map((a) => [a, basename(a)]));
  const referenced = new Set();
  for (const f of sources) {
    const content = readSafe(f);
    if (!content) continue;
    const selfName = assetByPath.get(f);
    for (const name of assetNames) {
      // A file does not count as its own reference (a manifest naming its own
      // file, an sw.js containing the string 'sw.js', ...).
      if (name === selfName || referenced.has(name)) continue;
      if (content.includes(name)) referenced.add(name);
    }
  }

  for (const asset of assets) {
    const name = basename(asset);
    if (referenced.has(name)) continue;
    let size = 0;
    try { size = statSync(asset).size; } catch { /* raced deletion */ }
    findings.push({
      id: `${app}-dead-public-asset-${name}`,
      ruleId: 'dead-public-asset',
      type: 'manual-review',
      severity: 'medium',
      gate: 'manual-review',
      title: `Unreferenced public asset in projects/${app}: public/${name}`,
      detail: `No file in projects/${app} (src, html, json, markdown, e2e, store-listing, or other public files) references '${name}', yet public/ is copied verbatim into every web build and Capacitor container — ${size} bytes of dead payload per ship. If it is intentionally standalone (a privacy policy page, a store-listing source), keep it and say so; otherwise delete it.`,
      evidence: [{ file: rel(asset), line: 1, snippet: `${name} (${size} bytes), no references` }],
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Unit-test-driven development — an INFORMATIONAL sensor.
//
// .agents/AGENTS.md §5 mandates unit tests for all core logic and BDD
// (Given -> When -> Then) formatting for *every* test scenario, unit and E2E
// alike. Until this sensor existed only the E2E half was ever checked: sensor 4
// scans `*.spec.ts` for Given/When/Then, so a core-logic module could ship with
// no unit test at all, or with a unit test written in no particular style, and
// nothing in the loop would say so. That is the gap between "we have unit
// tests" and "unit tests drive the work".
//
// Four checks, all *absence* checks — which is why this is a sensor and not a
// guardrail: no `test(line)` predicate can express "no file anywhere imports
// this module". (The one line-detectable half of the same lesson — an assertion
// that cannot fail — IS a guardrail: `no-op-assertion` above.)
//
// Deliberately NON-BLOCKING, per the §8 sensor policy: these describe missing
// coverage rather than a regression, and gating them would paint every PR on
// every app red until a backlog that predates the sensor is closed. They report,
// they become work orders via emit-tasks.mjs, and they are promoted to blocking
// once the backlog is gone.
//
// What this sensor does NOT claim: that a covered module is *well* tested. It
// answers "is this module reached by any unit test?", which is the question a
// zero-dependency scan can answer honestly. Depth is a line-coverage question,
// and a line-coverage tool is the right instrument for it.
// ---------------------------------------------------------------------------

// Directories under src/ that hold logic a unit test can address. Everything
// else (routes, pages, components) is E2E and a11y territory: a sensor that
// demanded a unit test per React component would report a hundred findings
// describing a testing strategy this repo has not chosen.
const LOGIC_DIRS = new Set(['lib', 'utils', 'services', 'engine', 'core', 'domain', 'data', 'hooks', 'store', 'state']);

// A module with no runtime export declares only types, so there is nothing for
// a unit test to execute (`src/types.ts` is `export type { … } from './schemas'`).
// Fail-open by design: an unusual runtime re-export simply is not sensed, which
// keeps the sensor free of findings nobody can act on.
const RUNTIME_EXPORT_RE = /^\s*export\s+(default\s+)?(async\s+)?(const|let|var|function|class)\b/m;

// `from '…'`, `import('…')`, `require('…')`. Deliberately excludes `vi.mock('…')`:
// mocking a module is the opposite of exercising it, and crediting a mock as
// coverage would let a module be "tested" by a suite that stubs it out.
const IMPORT_SPEC_RE = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

const VITEST_CONFIGS = ['vitest.config.ts', 'vitest.config.mts', 'vitest.config.js', 'vite.config.ts', 'vite.config.js'];

function resolveImport(spec, fromFile, srcDir) {
  let base;
  if (spec.startsWith('.')) base = join(dirname(fromFile), spec);
  else if (spec.startsWith('@/') || spec.startsWith('~/')) base = join(srcDir, spec.slice(2));
  else return null; // a bare package specifier is not a module of this app
  for (const suffix of ['', '.ts', '.tsx', '.js', '.jsx', join(sep, 'index.ts'), join(sep, 'index.tsx')]) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function senseUnitTests(app, projPath) {
  const findings = [];
  const srcDir = join(projPath, 'src');
  if (!existsSync(srcDir)) return findings;

  const add = (id, severity, title, detail, evidence) => findings.push({
    id: `${app}-unit-${id}`, ruleId: `unit-test-coverage:${id}`, type: 'unit-test-coverage', severity,
    gate: 'validate-specs --strict', title, detail,
    ...(evidence?.length ? { evidence } : {}),
  });

  // --- 1. Vitest scoping. An implicit `include` lets Vitest reach for whatever
  // the default glob finds, which is how a Playwright spec ends up being run by
  // the unit runner (the "Vitest vs. Playwright Test Separation" §6 lesson says
  // to set it explicitly, and nothing checked that it had been).
  const cfgPath = VITEST_CONFIGS.map((f) => join(projPath, f)).find((p) => existsSync(p));
  if (cfgPath) {
    const cfg = readSafe(cfgPath);
    if (/\btest\s*:\s*\{/.test(cfg) && !/\binclude\s*:/.test(cfg)) {
      add('vitest-unscoped', 'medium',
        `Vitest config for ${app} has no explicit 'include'`,
        "Without an explicit include, Vitest falls back to its default glob and can pick up files the unit runner was never meant to execute (the Playwright e2e specs are the recurring case). Set include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] alongside the existing exclude. See the 'Vitest vs. Playwright Test Separation' lesson in .agents/AGENTS.md §6.",
        [{ file: rel(cfgPath), line: 1, snippet: "test: { … } with no include" }]);
    }
  }

  // --- 2. Which modules hold logic, and which are reached by a unit test.
  const modules = walk(srcDir, ['.ts']).filter((f) => {
    if (/\.d\.ts$/.test(f) || isUnitTestPath(f)) return false;
    const segs = relative(srcDir, f).split(sep);
    // Either a top-level module (src/schemas.ts) or inside a logic directory.
    if (!(segs.length === 1 || LOGIC_DIRS.has(segs[0]))) return false;
    return RUNTIME_EXPORT_RE.test(readSafe(f));
  });

  const unitTests = walk(projPath, ['.ts', '.tsx']).filter(isUnitTestPath);

  const covered = new Set();
  for (const t of unitTests) {
    const content = readSafe(t);
    for (const m of content.matchAll(IMPORT_SPEC_RE)) {
      const resolved = resolveImport(m[1], t, srcDir);
      if (resolved) covered.add(resolved);
    }
    // Naming-convention fallback, scoped to the same directory or a `__tests__`
    // sibling. This exists so a test that reaches its subject through a mock
    // boundary or a barrel file is not miscounted as absent; it never reaches
    // across the tree, so two same-named modules in different directories
    // cannot credit each other.
    const stem = basename(t).replace(TEST_FILE_RE, '');
    const dirs = [dirname(t)];
    if (basename(dirname(t)) === '__tests__') dirs.push(dirname(dirname(t)));
    for (const d of dirs) {
      for (const ext of ['.ts', '.tsx']) {
        const candidate = join(d, stem + ext);
        if (existsSync(candidate)) covered.add(candidate);
      }
    }
  }

  if (modules.length && unitTests.length === 0) {
    add('no-unit-tests', 'high',
      `No unit tests at all in projects/${app}`,
      `${modules.length} core-logic module(s) ship with no Vitest suite. §5 mandates unit tests for all core logic. Add *.test.ts files covering each module's behaviour, written Given -> When -> Then, and prove each new test can fail by breaking the code once (§9.4).`,
      modules.slice(0, 25).map((f) => ({ file: rel(f), line: 1, snippet: 'no unit test' })));
  } else {
    const untested = modules.filter((f) => !covered.has(f));
    if (untested.length) {
      add('untested-modules', 'medium',
        `${untested.length}/${modules.length} core-logic module(s) have no unit test in projects/${app}`,
        `No unit test directly imports these modules, so nothing but the E2E suite (and whatever reaches them transitively) exercises them — and an E2E failure localises to a page, not a function. Add a *.test.ts per module (Given -> When -> Then), and prove each new test can fail by breaking the code once (§9.4). A module that genuinely has no behaviour to assert should export only types, which takes it out of this sensor's scope.`,
        untested.slice(0, 25).map((f) => ({ file: rel(f), line: 1, snippet: 'no unit test imports this module' })));
    }
  }

  // --- 3. BDD formatting of unit tests. §5 requires it of every scenario, but
  // only the E2E specs were ever checked for it.
  const nonBdd = unitTests.filter((f) => {
    const c = readSafe(f);
    return !(/given/i.test(c) && /when/i.test(c) && /then/i.test(c));
  });
  if (nonBdd.length) {
    add('bdd-noncompliant', 'medium',
      `${nonBdd.length}/${unitTests.length} unit test file(s) not BDD-formatted in projects/${app}`,
      'The BDD Specification Standard (§5) applies to unit tests, not only E2E specs: describe the Given (context), When (action) and Then (outcome) in the test names so a failure reads as a broken behaviour rather than a broken function call.',
      nonBdd.slice(0, 25).map((f) => ({ file: rel(f), line: 1, snippet: 'no Given/When/Then' })));
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function walk(root, exts) {
  const out = [];
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) stack.push(full);
      } else if (!exts || exts.includes(extname(e.name))) {
        out.push(full);
      }
    }
  }
  return out;
}

function readSafe(file) {
  try {
    if (statSync(file).size > 1_500_000) return ''; // skip oversized/minified blobs
    return readFileSync(file, 'utf8');
  } catch { return ''; }
}

function findSpec(app) {
  if (!existsSync(specsDir)) return null;
  const match = readdirSync(specsDir).find((f) => f.includes(app) && f.endsWith('.md'));
  return match ? join(specsDir, match) : null;
}

function rel(p) { return relative(repoRoot, p).split('\\').join('/'); }

// ---------------------------------------------------------------------------
// Sensors — each returns zero or more findings for an app.
// ---------------------------------------------------------------------------
// projPathOverride/specPathOverride exist for the self-test: senseApp's real
// callers (collectStatus) always resolve both from the real repo tree, but
// the rule-registry cross-check needs a fixture app that cannot collide with
// (or write into) the actual projects/ or specs/ directories.
function senseApp(app, projPathOverride, specPathOverride) {
  const projPath = projPathOverride || join(projectsDir, app);
  const project = createProjectAdapter(app, projPath);
  const findings = [];
  const add = (f) => findings.push({ app, ...f });

  // 1. Spec presence (hard mandate).
  const specPath = specPathOverride !== undefined ? specPathOverride : findSpec(app);
  if (!specPath) {
    add({ id: `${app}-missing-spec`, ruleId: 'missing-spec', type: 'missing-artifact', severity: 'high', gate: 'validate-specs',
      title: `Missing spec for '${app}'`,
      detail: `No file in specs/ matches '${app}'. The spec is the single source of truth and is a hard CI gate.` });
  }

  // 2. README presence.
  if (!existsSync(join(projPath, 'README.md'))) {
    add({ id: `${app}-missing-readme`, ruleId: 'missing-readme', type: 'missing-artifact', severity: 'low', gate: 'validate-specs',
      title: `Missing README in projects/${app}`,
      detail: `Add a projects/${app}/README.md describing the app and pointing to its spec.` });
  }

  const srcFiles = project.files(['.ts', '.tsx']).filter((f) => {
    const relativePath = f.slice(project.root.length);
    return relativePath.startsWith(`${sep}src${sep}`) || relativePath.startsWith('/src/');
  });

  // 3. Contract-first Zod usage.
  const usesZod = srcFiles.some((f) => {
    const c = readSafe(f);
    return /from\s+['"]zod['"]/.test(c) || /\bz\.(object|infer|string|number|boolean|enum|array)\b/.test(c);
  });
  if (srcFiles.length && !usesZod) {
    add({ id: `${app}-no-zod`, ruleId: 'no-zod-schema', type: 'contract', severity: 'medium', gate: 'validate-specs --strict',
      title: `No Zod runtime schemas in projects/${app}/src`,
      detail: `Contract-first mandate: define data models as Zod schemas and infer types via z.infer<typeof Schema>.` });
  }

  // 4. BDD spec presence + Given/When/Then compliance.
  const specTests = walk(projPath, ['.ts']).filter((f) => f.endsWith('.spec.ts'));
  if (specTests.length === 0) {
    add({ id: `${app}-no-bdd`, ruleId: 'e2e-missing', type: 'test-coverage', severity: 'medium', gate: 'validate-specs --strict',
      title: `No E2E *.spec.ts tests in projects/${app}`,
      detail: `Add Playwright E2E specs following Given -> When -> Then.` });
  } else {
    const nonCompliant = specTests.filter((f) => {
      const c = readSafe(f);
      return !(/given/i.test(c) && /when/i.test(c) && /then/i.test(c));
    });
    if (nonCompliant.length) {
      add({ id: `${app}-bdd-noncompliant`, ruleId: 'e2e-bdd-noncompliant', type: 'test-coverage', severity: 'medium', gate: 'validate-specs --strict',
        title: `${nonCompliant.length}/${specTests.length} spec file(s) not BDD-formatted in projects/${app}`,
        detail: `Reformat to Given -> When -> Then: ${nonCompliant.map(rel).join(', ')}` });
    }
  }

  // 5. Spec drift — features declared in the spec but not marked complete.
  if (specPath) {
    const specText = readSafe(specPath);
    const unchecked = [...specText.matchAll(/^\s*-\s*\[ \]\s*(.+)$/gm)].map((m) => m[1].trim());
    if (unchecked.length) {
      add({ id: `${app}-spec-drift`, ruleId: 'spec-drift', type: 'drift', severity: 'medium', gate: 'manual-review',
        title: `${unchecked.length} spec feature(s) not marked complete for ${app}`,
        detail: `Implement (or explicitly defer) these unchecked spec items:\n${unchecked.map((u) => `  - ${u}`).join('\n')}`,
        specRef: rel(specPath) });
    }
  }

  // 6. Guardrail scans.
  for (const g of GUARDRAILS) {
    if (g.appliesTo && !g.appliesTo(projPath)) continue;
    const files = project.files(g.exts).filter((f) => !(g.excludePath && g.excludePath(f)));
    const evidence = [];
    for (const f of files) {
      const c = readSafe(f);
      if (!c) continue;
      const lines = c.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (g.test(lines[i])) evidence.push({ file: rel(f), line: i + 1, snippet: lines[i].trim().slice(0, 160) });
      }
    }
    if (evidence.length) {
      // unpinned-deps starts non-blocking per §8 policy: it is a full-file scan,
      // not diff-shaped, and would fail CI on every existing ^/~ in package.json
      // files that are already locked by package-lock.json. The correct promotion
      // path requires a diff-shaped check that only fires on NEW unpinned additions.
      // ease-in-on-enter and text-truncate-missing had zero hits — promoted to
      // blocking immediately (no backlog to clear).
      const gtype = guardrailFindingType(g);
      add({ id: `${app}-guardrail-${g.id}`, ruleId: `guardrail:${g.id}`, type: gtype, severity: g.severity, gate: g.gate,
        title: `Guardrail '${g.label}' violated in projects/${app} (${evidence.length} hit${evidence.length > 1 ? 's' : ''})`,
        detail: g.why,
        evidence: evidence.slice(0, 25) });
    }
  }

  // 7–10. Supplemental sensors are a chain: each handler contributes findings,
  // and one new sensor can be registered without editing the others.
  const supplementalSensors = createSensorChain([
    ({ app: sensorApp, project: sensorProject }) => senseMobileRelease(
      sensorApp, sensorProject.root, join(repoRoot, '.github', 'workflows')),
    ({ app: sensorApp, project: sensorProject }) => senseProductionBundleTest(
      sensorApp, sensorProject.root),
    ({ app: sensorApp, project: sensorProject }) => senseDeadPublicAssets(
      sensorApp, sensorProject.root),
    ({ app: sensorApp, project: sensorProject }) => senseUnitTests(
      sensorApp, sensorProject.root),
    () => senseTokenBudget(),
  ]);
  for (const f of supplementalSensors({ app, project })) add(f);

  return findings;
}

// ---------------------------------------------------------------------------
// Blocking policy — the VERIFY gate. A finding blocks a merge only if it is a
// regression we have already paid for: a guardrail violation, or a missing
// spec (the hard SDD mandate). Spec drift and manual-review findings are
// legitimate open work and only inform — blocking them would paint every PR
// red until every spec is 100% implemented.
// ---------------------------------------------------------------------------
// 'mobile-readiness' is intentionally absent below: store-submission gaps are
// real work, but a partially-prepared release must not block unrelated PRs.
// They surface in the report and become work orders; they never fail the gate.
//
// 'unit-test-coverage' IS blocking, as of the change set that closed the
// backlog. It was deliberately non-blocking when the sensor was introduced,
// because it then described 15 untested modules and 12 unformatted test files
// that predated it — gating that would have reddened every PR on every app for
// work nobody had yet been asked to do. Those are now all closed, which is the
// promotion criterion §8 sets out: a check is promoted once it stops describing
// history and starts describing a regression. From here, a logic module added
// without a unit test fails the gate in the PR that adds it, which is what
// "unit tests drive development" has to mean to be more than a preference.
//
// If this needs to be relaxed — a spike, a vendored module, a deliberate
// exception — take the type out of this function rather than deleting the
// sensor, so the finding stays visible while it stops blocking.
export function isBlocking(f, strategy) {
  const selectedStrategy = typeof strategy === 'function' ? strategy : defaultBlockingStrategy;
  return selectedStrategy(f);
}

// Collect findings across all apps into a status object (no I/O).
export function collectStatus() {
  const apps = existsSync(projectsDir)
    ? readdirSync(projectsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];

  const severityRank = { high: 0, medium: 1, low: 2 };
  const findings = runPipeline(apps, [
    (appNames) => appNames.flatMap((app) => senseApp(app)),
    (allFindings) => allFindings.sort((a, b) =>
      (Number(isBlocking(b)) - Number(isBlocking(a))) ||
      (severityRank[a.severity] - severityRank[b.severity]) ||
      a.app.localeCompare(b.app)),
    (allFindings) => allFindings.map((finding) => ({
      ...finding,
      blocking: isBlocking(finding),
    })),
  ]);

  const byType = {}, bySeverity = {};
  for (const f of findings) {
    byType[f.type] = (byType[f.type] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }
  const blocking = findings.filter((f) => f.blocking).length;

  return {
    generatedAt: new Date().toISOString(),
    repo: 'jf1shh/agentic-app-harness',
    appsScanned: apps,
    summary: { total: findings.length, blocking, byType, bySeverity },
    findings,
  };
}

// ---------------------------------------------------------------------------
// Run (only when invoked directly, so the module stays importable for tests)
// ---------------------------------------------------------------------------
function main() {
  const args = new Set(process.argv.slice(2));
  const strict = args.has('--strict');
  const gate = args.has('--gate');
  const quiet = args.has('--quiet');

  const status = collectStatus();
  const { findings } = status;
  const outPath = join(repoRoot, 'harness-status.json');
  writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n');

  if (!quiet) {
    const C = { cyan: '\x1b[36m', yellow: '\x1b[33m', red: '\x1b[31m', green: '\x1b[32m', gray: '\x1b[90m', reset: '\x1b[0m' };
    const sevColor = { high: C.red, medium: C.yellow, low: C.gray };
    console.log(`${C.cyan}=========================================${C.reset}`);
    console.log(`${C.cyan} Harness Status${gate ? ' — VERIFY Gate' : ' — Deterministic Senses'}${C.reset}`);
    console.log(`${C.cyan}=========================================${C.reset}`);
    console.log(`Apps scanned: ${status.appsScanned.length} | Findings: ${findings.length} | Blocking: ${status.summary.blocking}`);
    if (findings.length === 0) {
      console.log(`${C.green}\nNo findings. All sensed gates are clean.${C.reset}`);
    } else {
      let currentApp = null;
      for (const f of findings) {
        if (f.app !== currentApp) { currentApp = f.app; console.log(`\n${C.yellow}[${f.app}]${C.reset}`); }
        const sc = sevColor[f.severity] || '';
        const flag = f.blocking ? `${C.red}⛔ BLOCKS MERGE${C.reset} ` : '';
        console.log(`  ${flag}${sc}[${f.severity.toUpperCase()}]${C.reset} (${f.type}) ${f.title}`);
        if (f.evidence?.length) console.log(`${C.gray}      e.g. ${f.evidence[0].file}:${f.evidence[0].line}${C.reset}`);
      }
      console.log(`\n${C.cyan}Summary:${C.reset} ` + Object.entries(status.summary.bySeverity).map(([k, v]) => `${v} ${k}`).join(' | ') + ` | ${status.summary.blocking} blocking`);
    }
    if (gate) {
      if (status.summary.blocking > 0) {
        console.log(`\n${C.red}VERIFY gate FAILED: ${status.summary.blocking} blocking finding(s) must be resolved before merge.${C.reset}`);
      } else {
        console.log(`\n${C.green}VERIFY gate PASSED: no blocking findings.${C.reset}`);
        if (findings.length) console.log(`${C.gray}(${findings.length} informational finding(s) above do not block.)${C.reset}`);
      }
    } else {
      console.log(`\n${C.gray}Wrote ${rel(outPath)} — run 'node scripts/emit-tasks.mjs' to generate agent work orders.${C.reset}`);
    }
  }

  if (gate && status.summary.blocking > 0) process.exit(1);
  if (strict && findings.length > 0) process.exit(1);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) main();

// ---------------------------------------------------------------------------
// Rule registry — every ruleId a finding can carry, independent of which app
// it fires in. harness-history.mjs needs this to tell "clean because nothing
// to report" apart from "clean because nobody was watching": a rule only
// contributes a zero-hit data point to a run's history if the run knew to
// look for it. Guardrail entries are derived from GUARDRAILS itself so the
// two lists cannot drift apart; every other ruleId is a static id assigned at
// its `add(...)` call site above. Mirrored here the same way GUARDRAILS
// mirrors AGENTS.md's lesson bullets — add the id here when you add the call
// site, or history silently stops tracking it. harness-status.test.mjs
// cross-checks this list against a live senseApp() run so an unregistered
// ruleId fails the self-test rather than fading out of history unnoticed.
// ---------------------------------------------------------------------------
const SENSOR_RULES = [
  { ruleId: 'missing-spec', type: 'missing-artifact', severity: 'high' },
  { ruleId: 'missing-readme', type: 'missing-artifact', severity: 'low' },
  { ruleId: 'no-zod-schema', type: 'contract', severity: 'medium' },
  { ruleId: 'e2e-missing', type: 'test-coverage', severity: 'medium' },
  { ruleId: 'e2e-bdd-noncompliant', type: 'test-coverage', severity: 'medium' },
  { ruleId: 'spec-drift', type: 'drift', severity: 'medium' },
  { ruleId: 'production-bundle-test-missing', type: 'test-coverage', severity: 'high' },
  { ruleId: 'dead-public-asset', type: 'manual-review', severity: 'medium' },
  { ruleId: 'mobile-readiness:no-signing-config', type: 'mobile-readiness', severity: 'high' },
  { ruleId: 'mobile-readiness:default-version-code', type: 'mobile-readiness', severity: 'medium' },
  { ruleId: 'mobile-readiness:default-launcher-icon', type: 'mobile-readiness', severity: 'high' },
  { ruleId: 'mobile-readiness:slug-app-name', type: 'mobile-readiness', severity: 'medium' },
  { ruleId: 'mobile-readiness:manifest-icons-missing', type: 'mobile-readiness', severity: 'high' },
  { ruleId: 'mobile-readiness:no-privacy-policy', type: 'mobile-readiness', severity: 'high' },
  { ruleId: 'mobile-readiness:no-android-ci', type: 'mobile-readiness', severity: 'medium' },
  { ruleId: 'unit-test-coverage:vitest-unscoped', type: 'unit-test-coverage', severity: 'medium' },
  { ruleId: 'unit-test-coverage:no-unit-tests', type: 'unit-test-coverage', severity: 'high' },
  { ruleId: 'unit-test-coverage:untested-modules', type: 'unit-test-coverage', severity: 'medium' },
  { ruleId: 'unit-test-coverage:bdd-noncompliant', type: 'unit-test-coverage', severity: 'medium' },
  { ruleId: 'token-budget:context-warning', type: 'token-budget', severity: 'medium' },
  { ruleId: 'token-budget:context-critical', type: 'token-budget', severity: 'high' },
  { ruleId: 'token-budget:context-trending-up', type: 'token-budget', severity: 'medium' },
];

// Map of every known ruleId -> { type, severity, blocking }, blocking computed
// through the same isBlocking() the gate itself uses so the two can never say
// different things about the same rule.
export function allRuleMeta() {
  const guardrailRules = GUARDRAILS.map((g) => ({ ruleId: `guardrail:${g.id}`, type: guardrailFindingType(g), severity: g.severity }));
  const byId = {};
  for (const r of [...guardrailRules, ...SENSOR_RULES]) {
    byId[r.ruleId] = { type: r.type, severity: r.severity, blocking: isBlocking(r) };
  }
  return byId;
}

export { GUARDRAILS, senseApp };
