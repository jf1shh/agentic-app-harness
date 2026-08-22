#!/usr/bin/env node
// Harness Doctor — fast local pre-push diagnostic.
//
// Runs every gate that completes in under a second, reports pass/fail per
// check with fix prescriptions, and exits 0 only when every check is green.
// Inspired by `agent-reach doctor` — a diagnosis, not a treatment.
//
// Usage:
//   node scripts/harness-doctor.mjs               # report pass/fail
//   node scripts/harness-doctor.mjs --fix-hints   # include exact fix commands
//   node scripts/harness-doctor.mjs --json        # machine-readable JSON
//   node scripts/harness-doctor.mjs --quiet       # exit code only, no output
//
// Zero dependencies. No network calls. Exits 0 on all-green, 1 otherwise.
// Not a replacement for `node scripts/test-app.mjs <AppName>` — that's the
// full gate; this is the "did I break anything obvious" signal.

import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const SCRIPTS_DIR = join(repoRoot, 'scripts');

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m',
};

// ---------------------------------------------------------------------------
// Check definitions — each one is a command + label + fix prescription.
// `fix` is a template; `{repo}` is substituted with the relative repo root.
// `extractSummary` parses stdout for a one-line status description.
// ---------------------------------------------------------------------------

const CHECKS = [
  {
    id: 'harness-gate',
    label: 'harness gate',
    cmd: 'node',
    args: ['scripts/harness-status.mjs', '--gate'],
    fix: 'Resolve blocking findings (guardrail regressions or missing specs). Re-run `node scripts/harness-status.mjs --gate` to confirm.',
    extractSummary(stdout) {
      const m = stdout.match(/VERIFY gate (PASSED|FAILED)/);
      if (!m) return null;
      if (m[1] === 'PASSED') {
        const blocking = stdout.match(/(\d+) blocking finding/);
        return blocking && blocking[1] === '0' ? 'no blocking findings' : 'gate passed';
      }
      const count = stdout.match(/(\d+) blocking finding/);
      return count ? `${count[1]} blocking finding(s)` : 'gate failed';
    },
  },
  {
    id: 'guardrail-traceability',
    label: 'guardrail traceability',
    cmd: 'node',
    args: ['scripts/harness-learn.mjs'],
    fix: 'Every guardrail in `scripts/harness-status.mjs` must trace to a `[guardrail: <id>]` tag in `.agents/AGENTS.md`. See `.agents/AGENTS.md` section on "Protocol: adding a learned lesson."',
    extractSummary(stdout) {
      const m = stdout.match(/(\d+) guardrails each trace to/);
      return m ? `${m[1]} guardrails trace to documented lessons` : null;
    },
  },
  {
    id: 'doc-claims',
    label: 'doc claims',
    cmd: 'node',
    args: ['scripts/check-doc-claims.mjs', '--gate'],
    fix: 'Checked-in docs (README.md, AGENTS.md, CLAUDE.md, .agents/AGENTS.md) must match what they claim. Edit the doc or the source-of-truth command output so they agree.',
    extractSummary(stdout) {
      if (!stdout) return 'no doc claims to check';
      const m = stdout.match(/DOC-CLAIMS gate (PASSED|FAILED)/);
      if (m) {
        if (m[1] === 'PASSED') return 'doc claims match reality';
        const details = stdout.match(/Mismatch.*?: (.*)/);
        return details ? `mismatch: ${details[1]}` : 'doc claims out of sync';
      }
      // gate-mode: the script exits 0 with per-file output but no all-caps gate header.
      const verified = stdout.match(/(\d+) doc claim\(s\) verified/);
      if (verified) return 'doc claims match reality';
      return null;
    },
  },
  {
    id: 'loop-stats',
    label: 'loop stats',
    cmd: 'node',
    args: ['scripts/check-loop-stats.mjs'],
    fix: 'The committed portfolio-hub loop stats fixture is stale. Regenerate:\n  cd projects/portfolio-hub && npm run generate:loop-stats',
    extractSummary(stdout) {
      const m = stdout.match(/LOOP-STATS gate (PASSED|FAILED)/);
      if (!m) return null;
      if (m[1] === 'PASSED') {
        const stats = stdout.match(/(\d+) guardrails?, (\d+) lessons?, (\d+) apps/);
        return stats ? `${stats[1]} guardrails, ${stats[2]} lessons, ${stats[3]} apps` : 'fixture in sync';
      }
      return 'fixture out of sync with rulebook';
    },
  },
  {
    id: 'peer-consistency',
    label: 'peer consistency',
    cmd: 'node',
    args: ['scripts/check-peer-consistency.mjs'],
    fix: 'A dependency and its peer have split majors (e.g. react 18 with react-dom 19). Move the entire peer set together. See `.agents/AGENTS.md` section on "A Dependency Bump Is Only Safe If Its Peers Move With It."',
    extractSummary(stdout) {
      const m = stdout.match(/PEER-CONSISTENCY gate (PASSED|FAILED)/);
      if (!m) return null;
      if (m[1] === 'PASSED') return 'all peer sets consistent';
      return 'split peer set detected';
    },
  },
  {
    id: 'token-budget',
    label: 'token budget',
    cmd: 'node',
    args: ['scripts/token-budget.mjs', '--quiet'],
    fix: 'The always-loaded context has grown past threshold. Review recent additions to .agents/AGENTS.md and CLAUDE.md. The slim rulebook proposal in docs/SLIM_RULEBOOK_PROPOSAL.md tracks this — consider prioritising it.',
    extractSummary(stdout) {
      if (!stdout) return 'no budget data yet';
      const clean = stdout.match(/TOKEN-BUDGET:.*below thresholds/);
      if (clean) return 'context budget healthy';
      const noData = stdout.match(/no sessions recorded/);
      if (noData) return 'no sessions recorded';
      const m = stdout.match(/TOKEN-BUDGET: (\d+) threshold/);
      return m ? `${m[1]} threshold(s) crossed` : 'budget data present';
    },
  },
  {
    id: 'security-smoke',
    label: 'security smoke',
    cmd: 'node',
    args: ['scripts/security-smoke.mjs', '--quiet'],
    fix: 'High/critical npm advisories found. Most are transitive — run `npm audit` per app to triage, and `npm audit fix` where safe. New direct advisories are a regression; flag them in the PR.',
    extractSummary(stdout) {
      if (!stdout) return 'audit skipped (no package.json)';
      const clean = stdout.match(/SECURITY-SMOKE: clean/);
      if (clean) return 'no high/critical advisories';
      const counts = stdout.match(/SECURITY-SMOKE: (\d+) high\/critical/);
      return counts ? `${counts[1]} advisorie(s) found` : 'advisories found';
    },
  },
  {
    id: 'full-sweep',
    label: 'full sense sweep',
    cmd: 'node',
    args: ['scripts/harness-status.mjs'],
    fix: 'Review informational findings. Most are non-blocking (drift, manual-review) — these generate work orders via `node scripts/emit-tasks.mjs` rather than blocking the merge.',
    extractSummary(stdout) {
      const m = stdout.match(/(\d+) (?:blocking|findings?)/g);
      if (!m) return 'no findings detected';
      const total = stdout.match(/Findings: (\d+)/);
      if (total && total[1] === '0') return 'no findings';
      const blocking = stdout.match(/Blocking: (\d+)/);
      return blocking
        ? `${total ? total[1] : '?'} findings (${blocking[1]} blocking)`
        : 'findings present (non-blocking)';
    },
  },
];

// ---------------------------------------------------------------------------
// Core — run checks, collect results
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, label: string, passed: boolean, summary: string|null,
 *   exitCode: number, stderr: string, timedOut: boolean }} CheckResult
 */

/**
 * Run a single check. Returns a CheckResult.
 */
export function runCheck(check, opts = {}) {
  const { timeoutMs = 10_000 } = opts;
  let timedOut = false;
  try {
    const result = spawnSync(check.cmd, check.args, {
      cwd: repoRoot,
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // spawnSync with timeout throws on ETIMEDOUT only when the signal
    // fails; the actual timeout path sets error.code.
    if (result.error && result.error.code === 'ETIMEDOUT') timedOut = true;
    const exitCode = timedOut ? -1 : (result.status ?? 1);
    const stdout = (result.stdout || '').trim();
    const stderr = (result.stderr || '').trim();
    const passed = exitCode === 0;
    const summary = check.extractSummary ? check.extractSummary(stdout) : null;
    return { id: check.id, label: check.label, passed, summary, exitCode, stderr, timedOut };
  } catch (err) {
    return {
      id: check.id, label: check.label, passed: false,
      summary: `error: ${err.message}`, exitCode: -1, stderr: err.message, timedOut: false,
    };
  }
}

/**
 * Run all checks sequentially. Returns an array of CheckResults.
 */
export function runAllChecks(checks, opts) {
  return checks.map((c) => runCheck(c, opts));
}

/**
 * Core report generator — returns { allGreen, lines } for the terminal report.
 */
export function generateReport(results, opts = {}) {
  const { fixHints = false, quiet = false } = opts;
  const lines = [];
  const allGreen = results.every((r) => r.passed);

  if (!quiet) {
    lines.push(`${C.bold}Harness Doctor${C.reset}`);
    lines.push('');

    let maxLabelLen = 0;
    for (const r of results) maxLabelLen = Math.max(maxLabelLen, r.label.length);

    for (const r of results) {
      const icon = r.passed ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
      const labelPadded = r.label.padEnd(maxLabelLen + 2);
      const summary = r.summary ? `${C.dim}${r.summary}${C.reset}` : `${C.dim}(no output)${C.reset}`;
      lines.push(`  ${icon} ${labelPadded} ${summary}`);

      if (!r.passed && fixHints) {
        const check = CHECKS.find((c) => c.id === r.id);
        const fix = check ? check.fix : 'Unknown — check the script output above.';
        const indent = '  '.repeat(1) + ' '.repeat(labelPadded.length);
        for (const fline of fix.split('\n')) {
          lines.push(`${C.dim}${indent}Fix:${C.reset} ${fline}`);
        }
      }
      if (!r.passed && r.stderr && !fixHints) {
        // Show first relevant error line from stderr
        const errLines = r.stderr.split('\n').filter((l) => l.trim()).slice(0, 3);
        for (const el of errLines) {
          lines.push(`${C.dim}        ${el.trim().slice(0, 120)}${C.reset}`);
        }
      }
    }

    lines.push('');
    if (allGreen) {
      lines.push(`${C.green}All ${results.length} checks passed.${C.reset}`);
    } else {
      const failed = results.filter((r) => !r.passed).length;
      lines.push(`${C.red}${failed}/${results.length} checks failed.${C.reset} Run with ${C.bold}--fix-hints${C.reset} for fix prescriptions.`);
    }
  }

  return { allGreen, lines };
}

/**
 * JSON output — machine-readable results array.
 */
export function generateJsonReport(results) {
  return results.map((r) => ({
    id: r.id,
    label: r.label,
    passed: r.passed,
    summary: r.summary,
    exitCode: r.exitCode,
    stderr: r.stderr || undefined,
    timedOut: r.timedOut,
  }));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const fixHints = args.includes('--fix-hints');
  const json = args.includes('--json');
  const quiet = args.includes('--quiet');

  const results = runAllChecks(CHECKS);

  if (json) {
    process.stdout.write(JSON.stringify(generateJsonReport(results), null, 2) + '\n');
  } else {
    const { lines } = generateReport(results, { fixHints, quiet });
    if (lines.length) process.stdout.write(lines.join('\n') + '\n');
  }

  const allGreen = results.every((r) => r.passed);
  if (!allGreen) process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('harness-doctor.mjs');
if (invokedDirectly) main();