#!/usr/bin/env node
// Mutation testing sensor (non-blocking) — runs Stryker Mutator per app and
// reports a mutation score.
//
// This is the machine-checked half of .agents/AGENTS.md §9.4 ("prove a new
// test can fail"): today that proof is an agent hand-mutating the code once
// and pasting the result into a PR body — a claim nobody re-runs. Stryker
// mutates every statement Vitest can reach (flips a comparison, drops a
// clamp, negates a condition, ...) and reports what fraction of those
// mutants the existing test suite actually kills.
//
// Non-blocking by design (see .agents/AGENTS.md §8's sensor-before-guardrail
// policy, and scripts/stryker.shared.mjs's header for the full rationale):
// this reports a score, it does not fail scripts/test-app.mjs or the harness
// `--gate`. Promoting a score floor to a blocking check is a deliberate,
// later, human decision — the same arc `unit-test-coverage` went through —
// not something this script pre-empts.
//
// Usage:
//   node scripts/run-mutation.mjs <AppName>        # one app, incremental
//   node scripts/run-mutation.mjs --all            # every app under projects/
//   node scripts/run-mutation.mjs <AppName> --full # ignore the incremental cache

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');

export function listApps() {
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

// Pure: reduces a Stryker JSON mutation report (schema: mutation-testing-report-schema)
// down to a single 0-100 score, or null if the report contains no mutants at
// all (an app with no logic modules yet — not the same as a 0% score).
export function summarizeScore(report) {
  let total = 0, survived = 0, noCoverage = 0;
  for (const file of Object.values(report?.files || {})) {
    for (const m of file.mutants || []) {
      total++;
      if (m.status === 'Survived') survived++;
      else if (m.status === 'NoCoverage') noCoverage++;
    }
  }
  if (!total) return null;
  const undetected = survived + noCoverage;
  return ((total - undetected) / total) * 100;
}

function runOne(app, { full }) {
  const appPath = join(projectsDir, app);
  const configPath = join(appPath, 'stryker.config.mjs');
  if (!existsSync(configPath)) {
    console.log(`[${app}] no stryker.config.mjs — skipping (not opted into mutation testing)`);
    return { app, skipped: true, score: null };
  }

  console.log(`\n=== Mutation testing: ${app} ${full ? '(full run)' : '(incremental)'} ===`);
  const args = ['stryker', 'run'];
  if (!full) args.push('--incremental');
  const result = spawnSync('npx', args, { cwd: appPath, stdio: 'inherit', shell: process.platform === 'win32' });

  const reportPath = join(appPath, 'reports', 'mutation', 'mutation.json');
  if (!existsSync(reportPath)) {
    console.log(`[${app}] Stryker produced no JSON report (exit code ${result.status ?? result.error?.message}) — reporting as informational-only failure, not blocking.`);
    return { app, skipped: false, score: null, exitCode: result.status };
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const score = summarizeScore(report);
  console.log(`[${app}] mutation score: ${score === null ? 'n/a (no mutants found)' : score.toFixed(1) + '%'}`);
  return { app, skipped: false, score, exitCode: result.status };
}

function main() {
  const args = process.argv.slice(2);
  const full = args.includes('--full');
  const all = args.includes('--all');
  const appArg = args.find((a) => !a.startsWith('--'));

  const apps = all ? listApps() : appArg ? [appArg] : null;
  if (!apps || apps.length === 0) {
    console.error('Usage: node scripts/run-mutation.mjs <AppName> | --all [--full]');
    process.exit(2);
  }

  const results = apps.map((app) => runOne(app, { full }));

  console.log('\n=== Mutation Score Summary (informational sensor — does not block the gate) ===');
  for (const r of results) {
    if (r.skipped) { console.log(`  ${r.app}: skipped (no stryker.config.mjs)`); continue; }
    console.log(`  ${r.app}: ${r.score === null ? 'no report' : r.score.toFixed(1) + '%'}`);
  }
  // Always exits 0 — see the header. A sensor reports; it does not gate.
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
