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
import { join, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');
const specsDir = join(repoRoot, 'specs');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'out', '.vite', 'coverage', 'android', 'playwright-report', 'test-results']);

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
];

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
export function senseMobileRelease(app, projPath, workflowsDir, policyRoots = [projPath, repoRoot]) {
  const findings = [];
  if (!hasNativeContainer(projPath)) return findings;

  const add = (id, severity, title, detail) => findings.push({
    id: `${app}-mobile-${id}`, type: 'mobile-readiness', severity,
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
  const wf = workflowsDir && existsSync(workflowsDir)
    ? readdirSync(workflowsDir).map((f) => readSafe(join(workflowsDir, f))).join('\n')
    : '';
  if (!/gradlew|bundleRelease|assembleRelease|cap\s+sync/.test(wf)) {
    add('no-android-ci', 'medium',
      `No CI job builds the ${app} Android artifact`,
      'The workflows only build and test the web bundle, so a broken native build reaches a release unnoticed. Add a job that runs the Capacitor sync and a Gradle release build, and uploads the AAB.');
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
function senseApp(app) {
  const projPath = join(projectsDir, app);
  const findings = [];
  const add = (f) => findings.push({ app, ...f });

  // 1. Spec presence (hard mandate).
  const specPath = findSpec(app);
  if (!specPath) {
    add({ id: `${app}-missing-spec`, type: 'missing-artifact', severity: 'high', gate: 'validate-specs',
      title: `Missing spec for '${app}'`,
      detail: `No file in specs/ matches '${app}'. The spec is the single source of truth and is a hard CI gate.` });
  }

  // 2. README presence.
  if (!existsSync(join(projPath, 'README.md'))) {
    add({ id: `${app}-missing-readme`, type: 'missing-artifact', severity: 'low', gate: 'validate-specs',
      title: `Missing README in projects/${app}`,
      detail: `Add a projects/${app}/README.md describing the app and pointing to its spec.` });
  }

  const srcFiles = walk(join(projPath, 'src'), ['.ts', '.tsx']);

  // 3. Contract-first Zod usage.
  const usesZod = srcFiles.some((f) => {
    const c = readSafe(f);
    return /from\s+['"]zod['"]/.test(c) || /\bz\.(object|infer|string|number|boolean|enum|array)\b/.test(c);
  });
  if (srcFiles.length && !usesZod) {
    add({ id: `${app}-no-zod`, type: 'contract', severity: 'medium', gate: 'validate-specs --strict',
      title: `No Zod runtime schemas in projects/${app}/src`,
      detail: `Contract-first mandate: define data models as Zod schemas and infer types via z.infer<typeof Schema>.` });
  }

  // 4. BDD spec presence + Given/When/Then compliance.
  const specTests = walk(projPath, ['.ts']).filter((f) => f.endsWith('.spec.ts'));
  if (specTests.length === 0) {
    add({ id: `${app}-no-bdd`, type: 'test-coverage', severity: 'medium', gate: 'validate-specs --strict',
      title: `No E2E *.spec.ts tests in projects/${app}`,
      detail: `Add Playwright E2E specs following Given -> When -> Then.` });
  } else {
    const nonCompliant = specTests.filter((f) => {
      const c = readSafe(f);
      return !(/given/i.test(c) && /when/i.test(c) && /then/i.test(c));
    });
    if (nonCompliant.length) {
      add({ id: `${app}-bdd-noncompliant`, type: 'test-coverage', severity: 'medium', gate: 'validate-specs --strict',
        title: `${nonCompliant.length}/${specTests.length} spec file(s) not BDD-formatted in projects/${app}`,
        detail: `Reformat to Given -> When -> Then: ${nonCompliant.map(rel).join(', ')}` });
    }
  }

  // 5. Spec drift — features declared in the spec but not marked complete.
  if (specPath) {
    const specText = readSafe(specPath);
    const unchecked = [...specText.matchAll(/^\s*-\s*\[ \]\s*(.+)$/gm)].map((m) => m[1].trim());
    if (unchecked.length) {
      add({ id: `${app}-spec-drift`, type: 'drift', severity: 'medium', gate: 'manual-review',
        title: `${unchecked.length} spec feature(s) not marked complete for ${app}`,
        detail: `Implement (or explicitly defer) these unchecked spec items:\n${unchecked.map((u) => `  - ${u}`).join('\n')}`,
        specRef: rel(specPath) });
    }
  }

  // 6. Guardrail scans.
  for (const g of GUARDRAILS) {
    if (g.appliesTo && !g.appliesTo(projPath)) continue;
    const files = walk(projPath, g.exts).filter((f) => !(g.excludePath && g.excludePath(f)));
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
      add({ id: `${app}-guardrail-${g.id}`, type: 'guardrail', severity: g.severity, gate: g.gate,
        title: `Guardrail '${g.label}' violated in projects/${app} (${evidence.length} hit${evidence.length > 1 ? 's' : ''})`,
        detail: g.why,
        evidence: evidence.slice(0, 25) });
    }
  }

  // 7. Mobile release readiness (informational; native-container apps only).
  for (const f of senseMobileRelease(app, projPath, join(repoRoot, '.github', 'workflows'))) add(f);

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
export function isBlocking(f) {
  if (f.type === 'guardrail') return true;
  if (f.type === 'missing-artifact' && f.severity === 'high') return true; // missing spec
  return false;
}

// Collect findings across all apps into a status object (no I/O).
export function collectStatus() {
  const apps = existsSync(projectsDir)
    ? readdirSync(projectsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
    : [];

  let findings = [];
  for (const app of apps) findings = findings.concat(senseApp(app));

  const severityRank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) =>
    (Number(isBlocking(b)) - Number(isBlocking(a))) ||
    (severityRank[a.severity] - severityRank[b.severity]) ||
    a.app.localeCompare(b.app));

  for (const f of findings) f.blocking = isBlocking(f);

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

export { GUARDRAILS, senseApp };
