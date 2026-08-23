#!/usr/bin/env node
// Dependency vulnerability audit (non-blocking sensor) — runs `npm audit
// --json` once against the shared root lockfile and reports every advisory
// by severity.
//
// Why this exists: `test-app.mjs` already runs `npm audit --audit-level=high`
// as an advisory step, but it runs it six times (once per app, against the
// same shared lockfile) and only ever prints to that app's own console
// output — nothing tracks it across commits or surfaces it as a single,
// readable summary. In practice 11 real advisories (1 high, 8 moderate,
// 2 low, at the time this was written) accumulated silently for weeks: the
// only place they surfaced was a `remote:` warning line on `git push`, which
// nobody was reading. This script is the fix — one clear, always-run report
// instead of a warning nobody scrolls to.
//
// Deliberately outside harness-status.mjs's senseApp() sweep, for the same
// reason mutation testing (run-mutation.mjs) and the RAG eval gate are: that
// sweep is a zero-dependency, sub-second, offline scan, and `npm audit`
// needs network access, a resolved node_modules, and can take real
// wall-clock seconds. Folding it in would break the sense layer's speed
// contract for every future user of it (see .agents/AGENTS.md §8).
//
// Non-blocking per §8's sensor-before-guardrail policy: this reports advisory
// counts, it does not fail scripts/test-app.mjs or the harness --gate.
// Promoting a severity floor to a blocking check is a deliberate, later,
// human decision — the same arc unit-test-coverage went through — once the
// backlog is at zero and stays there.
//
// Usage:
//   node scripts/check-dependency-audit.mjs             # run npm audit, report
//   node scripts/check-dependency-audit.mjs --json       # machine-readable summary
//   node scripts/check-dependency-audit.mjs --fixture <path>
//     # parse a saved `npm audit --json` file instead of running npm — used
//     # by the self-test, so the test never depends on network or the live
//     # advisory database (the same principle as the "live third-party API"
//     # lesson in .agents/AGENTS.md §6).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const C = {
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info', 'unknown'];
const severityRank = (sev) => {
  const i = SEVERITY_ORDER.indexOf(sev);
  return i === -1 ? SEVERITY_ORDER.length : i;
};

/* -------------------------------------------------------------------- */
/* Pure core — what the self-test exercises. Takes npm's own `npm audit    */
/* --json` shape and reduces it to a stable, sorted summary.               */
/* -------------------------------------------------------------------- */

export function summarizeAudit(auditJson) {
  const vulns = auditJson?.vulnerabilities || {};
  const bySeverity = {};
  const entries = [];

  for (const [name, v] of Object.entries(vulns)) {
    const severity = v.severity || 'unknown';
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    entries.push({
      name,
      severity,
      range: v.range || null,
      fixAvailable: !!v.fixAvailable,
      via: (v.via || [])
        .map((x) => (typeof x === 'string' ? x : x.title || x.source || x.name))
        .filter(Boolean),
    });
  }

  entries.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.name.localeCompare(b.name));

  return { total: entries.length, bySeverity, entries };
}

/* -------------------------------------------------------------------- */
/* I/O — running the real audit. Kept separate from summarizeAudit() so    */
/* the self-test never needs network or a live advisory database.          */
/* -------------------------------------------------------------------- */

export function runNpmAudit(cwd) {
  try {
    const out = execFileSync('npm', ['audit', '--json'], {
      cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
    });
    return JSON.parse(out);
  } catch (e) {
    // `npm audit` exits non-zero the moment it finds any vulnerability —
    // that's not a script failure, its stdout is still the real report.
    if (e.stdout) {
      try { return JSON.parse(e.stdout); } catch { /* fall through to rethrow */ }
    }
    throw e;
  }
}

/* -------------------------------------------------------------------- */
/* Reporting                                                              */
/* -------------------------------------------------------------------- */

function report(summary, { json }) {
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`${C.cyan}=========================================${C.reset}`);
  console.log(`${C.cyan} Dependency Vulnerability Audit (informational)${C.reset}`);
  console.log(`${C.cyan}=========================================${C.reset}`);

  if (summary.total === 0) {
    console.log(`${C.green}No known vulnerabilities in the resolved dependency tree.${C.reset}`);
    return;
  }

  for (const e of summary.entries) {
    const sc = { critical: C.red, high: C.red, moderate: C.yellow }[e.severity] || C.dim;
    console.log(`  ${sc}[${e.severity.toUpperCase()}]${C.reset} ${e.name}${e.range ? ` ${e.range}` : ''}` +
      `${e.fixAvailable ? ' (fix available)' : ''}`);
  }

  const bySevText = SEVERITY_ORDER
    .filter((s) => summary.bySeverity[s])
    .map((s) => `${summary.bySeverity[s]} ${s}`)
    .join(', ');
  console.log(`\n${C.cyan}Summary:${C.reset} ${summary.total} advisor${summary.total === 1 ? 'y' : 'ies'} — ${bySevText}`);
  console.log(`${C.dim}Informational only — does not block CI. Run 'npm audit' locally for full detail,\n` +
    `'npm audit fix' for safe in-range fixes, or add a scoped root "overrides" entry\n` +
    `(see package.json) for a vulnerable nested/transitive dependency a direct bump\n` +
    `can't reach — see .agents/AGENTS.md §8's "Dependency vulnerability audit" section.${C.reset}`);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function main() {
  const jsonOut = process.argv.includes('--json');
  const fixturePath = arg('--fixture');

  const auditJson = fixturePath
    ? JSON.parse(readFileSync(fixturePath, 'utf8'))
    : runNpmAudit(repoRoot);

  report(summarizeAudit(auditJson), { json: jsonOut });

  // Always exits 0 — this is a sensor, not a gate. See the header.
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
