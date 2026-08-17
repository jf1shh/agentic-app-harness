#!/usr/bin/env node
/**
 * Agent containment gate — diff-shaped, zero-dependency.
 *
 * The harness's other gates protect application code from regressing. This one
 * protects the harness infrastructure itself from being modified by an agent PR
 * without explicit human acknowledgment. loopgate_harness calls this pattern
 * "containment" — agents are forbidden from editing the harness directory, and
 * violations are auto-unstaged. We keep the lighter posture this repo already
 * uses for check-guardrail-integrity.mjs: the PR may touch a protected file,
 * but the body must name it (or use the [containment-override: path] marker),
 * so a reviewer sees the intent.
 *
 * check-guardrail-integrity.mjs already protects seven specific gate scripts
 * and self-tests with HARD/SOFT rules and assertion-count analysis. This gate
 * is broader (all harness infra, CI, instruction files) but shallower — it
 * does not inspect file contents, only whether the file was touched and
 * acknowledged. The two gates complement each other: integrity catches a
 * weakened guardrail regex even when this gate is satisfied, and this gate
 * catches a modified workflow or instruction file that integrity doesn't cover.
 *
 * Diff-shaped like check-enum-blast-radius.mjs: compares HEAD against the
 * merge base, so it cannot run as a line-level guardrail in harness-status.mjs.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-containment.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';
import { sep } from 'node:path';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * Glob-like patterns for files the harness infrastructure owns. An agent PR
 * that touches any of these must acknowledge the touch in its body.
 *
 * Each entry is a { pattern, description } where pattern is matched by
 * `matchesContainment`. Patterns use a minimal glob: `*` matches any
 * single path segment, `**` is not needed (every pattern is anchored).
 */
export const CONTAINED_PATHS = [
  { pattern: 'scripts/*.mjs', description: 'harness scripts' },
  { pattern: '.agents/AGENTS.md', description: 'authoritative rulebook' },
  { pattern: 'AGENTS.md', description: 'universal agent entry point' },
  { pattern: 'CLAUDE.md', description: 'Claude-specific instructions' },
  { pattern: '.github/workflows/*.yml', description: 'CI pipelines' },
  { pattern: '.githooks/*', description: 'local gate hooks' },
  { pattern: 'specs/templates/*', description: 'spec format definitions' },
];

/**
 * Whether a file path matches a containment pattern.
 *
 * Supports two forms:
 *   'dir/*.ext'   — matches any file directly in dir/ with that extension
 *   'exact/path'  — exact match
 */
export function matchesContainment(filePath, pattern) {
  const norm = filePath.split(sep).join('/');
  if (!pattern.includes('*')) return norm === pattern;

  const slashIdx = pattern.lastIndexOf('/');
  const dir = pattern.slice(0, slashIdx);
  const glob = pattern.slice(slashIdx + 1);

  const fileDir = norm.slice(0, norm.lastIndexOf('/'));
  const fileName = norm.slice(norm.lastIndexOf('/') + 1);

  if (fileDir !== dir) return false;

  const extGlob = glob.replace('*', '');
  if (extGlob.startsWith('.')) return fileName.endsWith(extGlob);
  return true;
}

/**
 * For a list of touched files, returns those that match any containment
 * pattern, along with which pattern matched and its description.
 */
export function findViolations(touchedFiles, patterns = CONTAINED_PATHS) {
  const violations = [];
  for (const file of touchedFiles) {
    for (const { pattern, description } of patterns) {
      if (matchesContainment(file, pattern)) {
        violations.push({ file, pattern, description });
        break;
      }
    }
  }
  return violations;
}

/**
 * Whether a file is acknowledged in the PR body via [containment-override: path]
 * or by simply naming the file path (two-segment minimum, same as blast-radius).
 */
export function isContainmentAcknowledged(body, filePath) {
  if (!body) return false;
  const norm = filePath.split(sep).join('/');

  const marker = `[containment-override: ${norm}]`;
  if (body.includes(marker)) return true;

  const segments = norm.split('/');
  for (let i = 0; i <= segments.length - 2; i += 1) {
    if (body.includes(segments.slice(i).join('/'))) return true;
  }
  return false;
}

/**
 * The gate decision: which violations are unacknowledged.
 */
export function unacknowledgedViolations(violations, touchedFiles, body) {
  return violations.filter((v) => !isContainmentAcknowledged(body, v.file));
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

  const touched = git(['diff', '--name-only', mergeBase, head])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const violations = findViolations(touched);

  if (violations.length === 0) {
    console.log(`${C.dim}No contained infrastructure file touched in this diff. Nothing to check.${C.reset}`);
    return;
  }

  const unacked = unacknowledgedViolations(violations, touched, body);
  const acked = violations.filter((v) => !unacked.includes(v));

  for (const v of acked) {
    console.log(`${C.green}  ✓ ${v.file}${C.reset} ${C.dim}(${v.description} — acknowledged)${C.reset}`);
  }

  if (unacked.length === 0) {
    console.log(`\n${C.green}CONTAINMENT gate PASSED.${C.reset}`);
    return;
  }

  console.error(`\n${C.red}CONTAINMENT gate FAILED.${C.reset}`);
  console.error(`\n  ${unacked.length} harness infrastructure file(s) modified without acknowledgment:\n`);
  for (const v of unacked) {
    console.error(`    ${C.red}${v.file}${C.reset} ${C.dim}(${v.description})${C.reset}`);
  }
  console.error(
    `\n${C.dim}Agent PRs that modify harness infrastructure must be acknowledged in the PR body.\n` +
      'For each file, either:\n' +
      '  • Name the file path in the PR body (two-segment minimum), or\n' +
      '  • Add [containment-override: <path>] on its own line.\n\n' +
      `See .agents/AGENTS.md §8 for the protocol.${C.reset}`,
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-containment.mjs');
if (invokedDirectly) main();
