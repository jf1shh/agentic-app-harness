#!/usr/bin/env node
/**
 * Loop-stats drift gate — "the rulebook's lesson count is load-bearing data".
 *
 * `projects/portfolio-hub` derives its displayed loop stats from the live
 * `scripts/harness-status.mjs` (guardrail count) and `.agents/AGENTS.md`
 * (§6 lesson bullets counted), written to
 * `projects/portfolio-hub/src/data/loopStats.generated.ts` by
 * `generate-loop-stats.mjs`. PR #217 added one §6 lesson and pushed without
 * regenerating that fixture; the drift surfaced as a cryptic
 * `expected 47 to be 46` unit-test failure in CI's `test (portfolio-hub)` leg
 * — a red round-trip on a change to an entirely different app, one commit too
 * late (.agents/AGENTS.md §6, "The Rulebook's Lesson Count Is Load-Bearing
 * Data, Not Documentation").
 *
 * This gate recomputes the same counts from the same source files the
 * generator reads, compares them against the committed fixture, and fails fast
 * with the regenerate command instead of a unit-test backtrace.
 *
 * It is **file-shaped**, not diff-shaped (unlike check-enum-blast-radius.mjs):
 * "does the committed fixture match what the rulebook says right now" is
 * answerable on any checkout with no merge-base, so it runs at the earliest,
 * cheapest gate rather than only on the PR that happens to touch the rulebook.
 * The comparison is exact by construction — it imports `computeLoopStats`, the
 * one dependency-free implementation the generator and portfolio-hub's own
 * `loopStats.generated.test.ts` already share — so the count cannot be wrong
 * in a third different way in a third different place.
 *
 * Zero dependencies. Run with:
 *   node scripts/check-loop-stats.mjs   # exit 1 on drift, print the fix
 */

import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLoopStats } from '../projects/portfolio-hub/scripts/loopStatsCompute.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * The committed `{ guardrailCount, lessonCount, appCount }` object from
 * `loopStats.generated.ts`, or null when the file has no parseable
 * `RAW_LOOP_STATS: LoopStats = { … };` block (e.g. it was hand-edited).
 * The generator writes `JSON.stringify(stats, null, 2)`, so the block is
 * valid JSON.
 */
export function extractCommittedStats(source) {
  const m = source.match(/const RAW_LOOP_STATS: LoopStats = (\{[\s\S]*?\n\});/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * App count, computed the same way generate-loop-stats.mjs computes it: one
 * `id: '...'` project entry per line in projectsData.ts. Mirrored here (the
 * generator does not export it) so `npm run generate:loop-stats` always
 * resolves any drift this gate reports.
 */
export function countAppIds(projectsDataSource) {
  return [...projectsDataSource.matchAll(/^\s*id: '[a-z0-9-]+',/gm)].length;
}

/**
 * The fields whose committed value differs from the freshly recomputed one,
 * as `{ key, committed, fresh }` entries (empty when the fixture is in sync).
 */
export function driftReport(committed, fresh) {
  const out = [];
  for (const key of ['guardrailCount', 'lessonCount', 'appCount']) {
    if (committed[key] !== fresh[key]) out.push({ key, committed: committed[key], fresh: fresh[key] });
  }
  return out;
}

/* -------------------------------------------------------------------- */
/* CLI                                                                    */
/* -------------------------------------------------------------------- */

const LABELS = {
  guardrailCount: 'guardrail count (scripts/harness-status.mjs)',
  lessonCount: '§6 lesson count (.agents/AGENTS.md)',
  appCount: 'app count (projectsData.ts)',
};

function main() {
  const repoRoot = join(__dirname, '..');
  const paths = {
    agents: join(repoRoot, '.agents', 'AGENTS.md'),
    harness: join(repoRoot, 'scripts', 'harness-status.mjs'),
    projectsData: join(repoRoot, 'projects', 'portfolio-hub', 'src', 'data', 'projectsData.ts'),
    fixture: join(repoRoot, 'projects', 'portfolio-hub', 'src', 'data', 'loopStats.generated.ts'),
  };

  const fixtureSource = readFileSync(paths.fixture, 'utf8');
  const committed = extractCommittedStats(fixtureSource);
  if (committed === null) {
    console.error(
      `${C.red}LOOP-STATS gate FAILED.${C.reset} Could not parse RAW_LOOP_STATS from ` +
        `${relative(process.cwd(), paths.fixture)} — was the generated file hand-edited?\n` +
        `Regenerate it:\n  cd projects/portfolio-hub && npm run generate:loop-stats`,
    );
    process.exit(1);
  }

  let fresh;
  try {
    fresh = computeLoopStats({
      agentsMdContent: readFileSync(paths.agents, 'utf8'),
      harnessStatusContent: readFileSync(paths.harness, 'utf8'),
      appCount: countAppIds(readFileSync(paths.projectsData, 'utf8')),
    });
  } catch (err) {
    console.error(`${C.red}LOOP-STATS gate FAILED.${C.reset} ${err.message}`);
    process.exit(1);
  }

  const drift = driftReport(committed, fresh);
  if (drift.length === 0) {
    console.log(
      `${C.green}LOOP-STATS gate PASSED.${C.reset} Committed fixture matches the rulebook ` +
        `and guardrail registry (${fresh.guardrailCount} guardrails, ${fresh.lessonCount} lessons, ` +
        `${fresh.appCount} apps).`,
    );
    return;
  }

  console.error(`${C.red}LOOP-STATS gate FAILED.${C.reset}`);
  for (const d of drift) {
    console.error(
      `  ${C.cyan}${d.key}${C.reset} (${LABELS[d.key]}): committed ${C.yellow}${d.committed}${C.reset} ` +
        `but recomputed ${C.yellow}${d.fresh}${C.reset}.`,
    );
  }
  console.error(
    `\n${C.dim}Regenerate the fixture so the committed value matches the rulebook, then re-run its suite:\n` +
      `  cd projects/portfolio-hub && npm run generate:loop-stats\n` +
      `  cd projects/portfolio-hub && npm test${C.reset}`,
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-loop-stats.mjs');
if (invokedDirectly) main();
