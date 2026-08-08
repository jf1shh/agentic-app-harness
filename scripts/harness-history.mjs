#!/usr/bin/env node
// Harness History — makes the LEARN step data-driven instead of ad hoc.
//
// Today, promoting a sensor to blocking (or reconsidering a guardrail that
// never fires) is a judgment call made by whoever happens to notice the
// backlog is closed — that is how `unit-test-coverage` was promoted (see
// .agents/AGENTS.md §8), and it worked, but nothing *noticed* on anyone's
// behalf. This script is the deterministic memory that lets the harness make
// that noticing part of itself: it records one snapshot of "how many times did
// each rule fire" per commit, and reports which non-blocking sensors have been
// clean for long enough to be a promotion candidate, and which guardrails have
// never once fired (a signal the rule may be mis-scoped, not that it is safe
// to delete — that judgment stays human).
//
// This is still zero-LLM and deterministic, same as harness-status.mjs: it
// only aggregates counts harness-status.mjs already computes. It does NOT
// decide anything by itself — promotion/demotion is still a human-or-agent
// action taken via the existing §8 protocol. It only makes the "has this been
// quiet long enough?" question answerable by a command instead of a memory.
//
// harness-history.json is committed to the repo (unlike the gitignored
// harness-status.json snapshot) because its value IS the trend across commits,
// not any single run. Recording is therefore opt-in (--record), never a
// side effect of a read: a file meant to accumulate truth across the team must
// not be silently rewritten by everyone who runs a report.
//
// Usage:
//   node scripts/harness-history.mjs                  # report (read-only, default)
//   node scripts/harness-history.mjs --record          # append/update this commit's snapshot
//   node scripts/harness-history.mjs --record --report # do both
//   node scripts/harness-history.mjs --threshold=15     # override the default streak of 10
//   node scripts/harness-history.mjs --json             # report as machine-readable JSON
//
// Suggested cadence: run `--record` as part of closing out a change set (the
// same moment §8 already asks you to run harness-learn.mjs), and commit the
// updated harness-history.json alongside your other changes — the same
// discipline this repo already applies to other generated-but-tracked files.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { collectStatus, allRuleMeta } from './harness-status.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const historyPath = join(repoRoot, 'harness-history.json');

// Bounds the file's growth. Not "how much history is useful" (more is always
// useful) but "how big may a JSON file in this repo get before it stops being
// a pleasant diff" — a run entry is small (one int per known rule), so this is
// generous on purpose.
const MAX_RUNS = 500;
// How many consecutive clean-commit runs a non-blocking rule must show zero
// findings across before it is surfaced as a promotion candidate, mirroring
// (without hardcoding) the real precedent: `unit-test-coverage` was promoted
// once its whole backlog — not one commit's worth — was gone. Overridable via
// --threshold=N because "long enough" is a judgment call this script cannot
// make on the project's behalf; it can only make the count visible.
const DEFAULT_THRESHOLD = 10;

const C = { cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', gray: '\x1b[90m', reset: '\x1b[0m' };

function loadHistory() {
  if (!existsSync(historyPath)) return { schemaVersion: 1, runs: [] };
  try {
    const parsed = JSON.parse(readFileSync(historyPath, 'utf8'));
    if (!Array.isArray(parsed.runs)) throw new Error('malformed');
    return parsed;
  } catch {
    console.error(`${C.yellow}Warning: ${historyPath} is present but unreadable/malformed. Treating as empty.${C.reset}`);
    return { schemaVersion: 1, runs: [] };
  }
}

function saveHistory(history) {
  writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
}

// Fails open to a 'dirty' commit id (rather than throwing) so this never
// blocks a run just because it executed outside a git checkout.
function currentGitState() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim();
    const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot }).toString();
    return { sha, dirty: porcelain.trim().length > 0 };
  } catch {
    return { sha: null, dirty: true };
  }
}

function record() {
  const status = collectStatus();
  const registry = allRuleMeta();
  const byRule = {};
  for (const ruleId of Object.keys(registry)) byRule[ruleId] = 0;
  for (const f of status.findings) {
    // Every finding has a ruleId as of the rule-registry cross-check in
    // harness-status.test.mjs; this guard is defensive, not load-bearing.
    if (!f.ruleId) continue;
    byRule[f.ruleId] = (byRule[f.ruleId] || 0) + 1;
  }

  const { sha, dirty } = currentGitState();
  const commit = dirty || !sha ? 'dirty' : sha;
  const entry = {
    at: new Date().toISOString(),
    commit,
    totalFindings: status.summary.total,
    blocking: status.summary.blocking,
    byRule,
  };

  const history = loadHistory();
  if (commit === 'dirty') {
    // At most one working-tree snapshot at a time, always the freshest —
    // a dirty run is a live preview, not a data point in the trend.
    history.runs = history.runs.filter((r) => r.commit !== 'dirty');
    history.runs.push(entry);
  } else {
    const idx = history.runs.findIndex((r) => r.commit === commit);
    if (idx === -1) history.runs.push(entry);
    else history.runs[idx] = entry; // idempotent re-record of the same commit (e.g. a CI retry)
  }
  if (history.runs.length > MAX_RUNS) history.runs = history.runs.slice(-MAX_RUNS);

  saveHistory(history);
  console.log(`${C.green}Recorded${C.reset} commit ${C.cyan}${commit === 'dirty' ? 'dirty' : commit.slice(0, 12)}${C.reset} `
    + `(${status.summary.total} finding(s), ${status.summary.blocking} blocking). `
    + `${history.runs.length} run(s) now in ${rel(historyPath)}.`);
  return history;
}

function rel(p) { return p.replace(repoRoot + '/', ''); }

// Longest run of the most recent clean commits with byRule[ruleId] === 0,
// stopping at the first run where the rule fired OR the first run that
// predates the rule existing in the registry (a missing key, not a zero,
// since crediting "before we were watching" as clean would be dishonest).
function cleanStreak(cleanRuns, ruleId) {
  let streak = 0;
  for (let i = cleanRuns.length - 1; i >= 0; i--) {
    const v = cleanRuns[i].byRule[ruleId];
    if (v === undefined) break;
    if (v > 0) break;
    streak++;
  }
  return streak;
}

function totalRunsTracking(cleanRuns, ruleId) {
  return cleanRuns.filter((r) => r.byRule[ruleId] !== undefined).length;
}

function lastFired(cleanRuns, ruleId) {
  for (let i = cleanRuns.length - 1; i >= 0; i--) {
    if ((cleanRuns[i].byRule[ruleId] || 0) > 0) return cleanRuns[i].at;
  }
  return null;
}

function analyze(history, threshold) {
  const cleanRuns = history.runs.filter((r) => r.commit !== 'dirty');
  const registry = allRuleMeta();

  const promotionCandidates = [];
  const neverFiredGuardrails = [];
  const chronicallyFiring = [];

  for (const [ruleId, meta] of Object.entries(registry)) {
    const runsTracking = totalRunsTracking(cleanRuns, ruleId);
    if (runsTracking === 0) continue; // never recorded at all yet
    const streak = cleanStreak(cleanRuns, ruleId);

    if (!meta.blocking && streak >= threshold && runsTracking >= threshold) {
      promotionCandidates.push({ ruleId, meta, streak, runsTracking });
    }
    if (meta.type === 'guardrail' && runsTracking >= threshold) {
      const total = cleanRuns.reduce((sum, r) => sum + (r.byRule[ruleId] || 0), 0);
      if (total === 0) neverFiredGuardrails.push({ ruleId, meta, runsTracking });
    }
    const latest = cleanRuns[cleanRuns.length - 1];
    if (meta.blocking && latest && (latest.byRule[ruleId] || 0) > 0) {
      chronicallyFiring.push({ ruleId, meta, count: latest.byRule[ruleId], since: lastFired(cleanRuns, ruleId) });
    }
  }

  promotionCandidates.sort((a, b) => b.streak - a.streak);
  return { cleanRunCount: cleanRuns.length, promotionCandidates, neverFiredGuardrails, chronicallyFiring };
}

function report(history, { threshold, json }) {
  const analysis = analyze(history, threshold);

  if (json) {
    console.log(JSON.stringify({ historyRuns: history.runs.length, threshold, ...analysis }, null, 2));
    return;
  }

  console.log(`${C.cyan}=========================================${C.reset}`);
  console.log(`${C.cyan} Harness History — Learn signal${C.reset}`);
  console.log(`${C.cyan}=========================================${C.reset}`);

  if (history.runs.length === 0) {
    console.log(`${C.gray}No history recorded yet. Run 'node scripts/harness-history.mjs --record' after a\n`
      + `commit to start tracking trends, and commit the resulting harness-history.json.${C.reset}`);
    return;
  }

  const hasDirty = history.runs.some((r) => r.commit === 'dirty');
  console.log(`${analysis.cleanRunCount} recorded commit(s) tracked` + (hasDirty ? ' (plus one local uncommitted snapshot, excluded from analysis).' : '.'));
  console.log(`Streak threshold: ${threshold} consecutive clean runs (override with --threshold=N).\n`);

  if (analysis.promotionCandidates.length) {
    console.log(`${C.green}Promotion candidates${C.reset} (non-blocking, clean for their entire tracked streak):`);
    for (const c of analysis.promotionCandidates) {
      console.log(`  ${C.green}✓${C.reset} ${c.ruleId} — clean for ${c.streak}/${c.runsTracking} recorded run(s). `
        + `Per .agents/AGENTS.md §8: consider promoting via isBlocking() once a human confirms the backlog is really gone.`);
    }
    console.log('');
  }

  if (analysis.neverFiredGuardrails.length) {
    console.log(`${C.yellow}Never fired${C.reset} (guardrails with zero hits across their whole tracked history):`);
    for (const c of analysis.neverFiredGuardrails) {
      console.log(`  ${C.yellow}?${C.reset} ${c.ruleId} — 0 hits across ${c.runsTracking} recorded run(s). `
        + `Could mean it is working preventively, or that its pattern is too narrow to ever match. Worth a human look, not an auto-removal.`);
    }
    console.log('');
  }

  if (analysis.chronicallyFiring.length) {
    console.log(`${C.yellow}Still firing on the latest recorded commit${C.reset} (unexpected for a blocking rule — check for a bypassed gate):`);
    for (const c of analysis.chronicallyFiring) {
      console.log(`  ${C.yellow}⚠${C.reset} ${c.ruleId} — ${c.count} hit(s) on the latest recorded commit.`);
    }
    console.log('');
  }

  if (!analysis.promotionCandidates.length && !analysis.neverFiredGuardrails.length && !analysis.chronicallyFiring.length) {
    console.log(`${C.gray}Nothing to report yet — no rule has a long enough streak, and no guardrail is silent across ${threshold}+ runs.${C.reset}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const doRecord = args.includes('--record');
  const explicitReport = args.includes('--report');
  const json = args.includes('--json');
  const thresholdArg = args.find((a) => a.startsWith('--threshold='));
  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : DEFAULT_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 1) {
    console.error(`Invalid --threshold value (must be a positive integer).`);
    process.exit(1);
  }

  let history;
  if (doRecord) history = record();
  if (!doRecord || explicitReport) {
    history = history || loadHistory();
    report(history, { threshold, json });
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) main();

export { analyze, cleanStreak, totalRunsTracking, loadHistory };
