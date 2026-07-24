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
];

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

  return findings;
}

// ---------------------------------------------------------------------------
// Blocking policy — the VERIFY gate. A finding blocks a merge only if it is a
// regression we have already paid for: a guardrail violation, or a missing
// spec (the hard SDD mandate). Spec drift and manual-review findings are
// legitimate open work and only inform — blocking them would paint every PR
// red until every spec is 100% implemented.
// ---------------------------------------------------------------------------
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
