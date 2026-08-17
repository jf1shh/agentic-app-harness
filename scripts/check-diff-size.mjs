#!/usr/bin/env node
/**
 * Diff-size gate — diff-shaped, zero-dependency.
 *
 * Large diffs from agents are a reliable signal of scope creep, vibe coding,
 * or a change that should have been split. loopgate_harness warns at 300 and
 * blocks at 400 changed lines; agentlint flags large diffs. This repo had no
 * equivalent — a 2,000-line agent PR passed the same gate as a 50-line one.
 *
 * Thresholds are deliberately higher than loopgate's because this is a
 * monorepo: a single-app change that legitimately adds a spec feature, its
 * engine, its tests, and its E2E spec routinely lands around 300-400 lines,
 * and blocking that would teach agents to split artificially rather than
 * ship coherently. The warn/block thresholds below were chosen so that only
 * a genuinely oversized change triggers.
 *
 * Generated/lock files are excluded from the count — a lockfile churn of
 * 10,000 lines from a single dep bump is not the signal this gate looks for.
 *
 * Diff-shaped like check-enum-blast-radius.mjs: compares HEAD against the
 * merge base.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-diff-size.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

export const WARN_THRESHOLD = 400;
export const BLOCK_THRESHOLD = 800;

/**
 * Paths excluded from the line count. Matched by exact filename (last
 * segment) or by glob suffix.
 */
export const EXCLUDED_PATTERNS = [
  'package-lock.json',
  '.generated.ts',
  '.generated.test.ts',
  'harness-status.json',
  'harness-history.json',
];

/** Whether a file path is excluded from the diff-size count. */
export function isExcluded(filePath) {
  for (const pat of EXCLUDED_PATTERNS) {
    if (filePath === pat || filePath.endsWith('/' + pat) || filePath.endsWith(pat)) {
      return true;
    }
  }
  if (filePath.includes('playwright-report/') || filePath.includes('test-results/')) {
    return true;
  }
  return false;
}

/**
 * Parse `git diff --numstat` output into per-file stats.
 *
 * Each line is: `<added>\t<deleted>\t<path>` (or `-\t-\t<path>` for binary).
 * Returns `{ path, added, deleted }[]` with binary files excluded.
 */
export function parseNumstat(numstatOutput) {
  return numstatOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [addedStr, deletedStr, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      if (addedStr === '-' || deletedStr === '-') return null; // binary
      return { path, added: parseInt(addedStr, 10), deleted: parseInt(deletedStr, 10) };
    })
    .filter(Boolean);
}

/**
 * Compute the diff-size verdict.
 *
 * Returns { totalAdded, totalDeleted, totalChanged, excludedLines,
 *   perApp, verdict: 'pass' | 'warn' | 'block' }.
 */
export function computeDiffSize(fileStats, warnAt = WARN_THRESHOLD, blockAt = BLOCK_THRESHOLD) {
  let countedAdded = 0;
  let countedDeleted = 0;
  let excludedLines = 0;
  const perApp = {};

  for (const { path, added, deleted } of fileStats) {
    if (isExcluded(path)) {
      excludedLines += added + deleted;
      continue;
    }
    countedAdded += added;
    countedDeleted += deleted;

    const appMatch = path.match(/^projects\/([^/]+)\//);
    const app = appMatch ? appMatch[1] : '(root)';
    if (!perApp[app]) perApp[app] = { added: 0, deleted: 0 };
    perApp[app].added += added;
    perApp[app].deleted += deleted;
  }

  const totalChanged = countedAdded + countedDeleted;

  let verdict = 'pass';
  if (totalChanged >= blockAt) verdict = 'block';
  else if (totalChanged >= warnAt) verdict = 'warn';

  return {
    totalAdded: countedAdded,
    totalDeleted: countedDeleted,
    totalChanged,
    excludedLines,
    perApp,
    verdict,
  };
}

/**
 * Whether the PR body contains the large-diff acknowledgment marker.
 */
export function isLargeDiffAcknowledged(body) {
  return typeof body === 'string' && body.includes('[large-diff-acknowledged]');
}

/* -------------------------------------------------------------------- */
/* git plumbing + reporting                                              */
/* -------------------------------------------------------------------- */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const base = arg('--base', 'origin/master');
  const head = arg('--head', 'HEAD');
  const body = process.env.PR_BODY ?? '';

  let mergeBase;
  try {
    mergeBase = git(['merge-base', base, head]).trim();
  } catch {
    console.error(
      `${C.red}Could not find a merge base for ${base}...${head}.${C.reset}\n` +
        'A shallow clone cannot compute this — the workflow needs fetch-depth: 0.',
    );
    process.exit(2);
  }

  const numstat = git(['diff', '--numstat', mergeBase, head]);
  const fileStats = parseNumstat(numstat);
  const result = computeDiffSize(fileStats);

  // Per-app breakdown
  const apps = Object.entries(result.perApp).sort((a, b) =>
    (b[1].added + b[1].deleted) - (a[1].added + a[1].deleted),
  );

  if (result.totalChanged === 0) {
    console.log(`${C.dim}Empty diff. Nothing to check.${C.reset}`);
    return;
  }

  console.log(
    `\n  Diff size: ${C.cyan}+${result.totalAdded} -${result.totalDeleted}${C.reset}` +
      ` = ${C.cyan}${result.totalChanged}${C.reset} net changed lines` +
      (result.excludedLines > 0 ? ` ${C.dim}(${result.excludedLines} excluded)${C.reset}` : ''),
  );

  if (apps.length > 1 || (apps.length === 1 && apps[0][0] !== '(root)')) {
    console.log(`${C.dim}  Breakdown:${C.reset}`);
    for (const [app, stats] of apps) {
      console.log(`    ${app}: +${stats.added} -${stats.deleted}`);
    }
  }

  if (result.verdict === 'pass') {
    console.log(`\n${C.green}DIFF-SIZE gate PASSED.${C.reset}`);
    return;
  }

  if (result.verdict === 'warn') {
    console.log(
      `\n${C.yellow}DIFF-SIZE warning: ${result.totalChanged} lines changed ` +
        `(warn threshold: ${WARN_THRESHOLD}).${C.reset}` +
        `\n${C.dim}Consider splitting this into smaller, focused changes.${C.reset}`,
    );
    console.log(`\n${C.green}DIFF-SIZE gate PASSED (warning only).${C.reset}`);
    return;
  }

  // verdict === 'block'
  if (isLargeDiffAcknowledged(body)) {
    console.log(
      `\n${C.yellow}DIFF-SIZE: ${result.totalChanged} lines changed ` +
        `(block threshold: ${BLOCK_THRESHOLD}) — [large-diff-acknowledged] found in PR body.${C.reset}`,
    );
    console.log(`\n${C.green}DIFF-SIZE gate PASSED (acknowledged).${C.reset}`);
    return;
  }

  console.error(`\n${C.red}DIFF-SIZE gate FAILED.${C.reset}`);
  console.error(
    `\n  ${result.totalChanged} lines changed exceeds the block threshold of ${BLOCK_THRESHOLD}.`,
  );
  console.error(
    `\n${C.dim}Large diffs from agents are a reliable signal of scope creep or a change that\n` +
      'should have been split. If this is a legitimate large change (new app scaffold,\n' +
      'bulk data update), add [large-diff-acknowledged] to the PR body with an\n' +
      `explanation on the following line.${C.reset}`,
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-diff-size.mjs');
if (invokedDirectly) main();
