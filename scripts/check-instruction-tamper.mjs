#!/usr/bin/env node
/**
 * Instruction-file tamper sensor — diff-shaped, zero-dependency.
 *
 * check-guardrail-integrity.mjs detects when a guardrail is deleted or a
 * self-test shrinks. It does not notice when an agent subtly weakens a
 * prose rule in .agents/AGENTS.md (e.g. removing a "MUST" or adding an
 * exception clause), or when a workflow gains `continue-on-error: true` or
 * `--no-verify` on a line the PR added.
 *
 * Inspired by Agent-Gate/MergeWarden, which found that ~4% of agent PRs
 * modified instruction files, nearly all unreviewed.
 *
 * Three heuristics, each scoped to the files where the signal is useful:
 *
 *   1. Rule weakening — a removed line in an instruction file that contained
 *      a directive keyword (MUST, NEVER, always, mandatory, blocking,
 *      required). Removing a mandatory rule is the fastest way to make a
 *      red gate pass.
 *
 *   2. Gate bypass — an added line in a workflow or config file that
 *      introduces --no-verify, continue-on-error: true, or if: false.
 *      Each one silently disables a safety mechanism.
 *
 *   3. Scope expansion — an added line in a workflow or test config that
 *      adds entries to exclude: arrays. Widening an exclusion list shrinks
 *      what the gate checks.
 *
 * Non-blocking (sensor, not guardrail) — exits 0 always but prints a
 * prominent warning. Promote to blocking once the false-positive rate is
 * understood (same sensor→guardrail arc as senseUnitTests).
 *
 * Diff-shaped like check-enum-blast-radius.mjs: compares HEAD against the
 * merge base.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-instruction-tamper.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * Instruction files: prose rule documents that agents are expected to follow.
 * Changes to these files are always worth flagging for human review.
 */
export const INSTRUCTION_FILES = [
  '.agents/AGENTS.md',
  'AGENTS.md',
  'CLAUDE.md',
];

/**
 * Workflow/config files: CI pipelines and gate configurations.
 * Gate-bypass and scope-expansion heuristics apply here.
 */
export const WORKFLOW_GLOBS = [
  '.github/workflows/*.yml',
];

/** Whether a file path matches a workflow glob. */
export function isWorkflowFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const dir = norm.slice(0, norm.lastIndexOf('/'));
  return dir === '.github/workflows' && norm.endsWith('.yml');
}

/** Whether a file path is an instruction file. */
export function isInstructionFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return INSTRUCTION_FILES.includes(norm);
}

/** Whether a file is relevant to this sensor at all. */
export function isRelevantFile(filePath) {
  return isInstructionFile(filePath) || isWorkflowFile(filePath);
}

/**
 * Directive keywords whose removal from an instruction file signals
 * rule weakening. Case-insensitive word-boundary match.
 */
export const DIRECTIVE_KEYWORDS = [
  'MUST', 'NEVER', 'always', 'mandatory', 'blocking', 'required',
];

const DIRECTIVE_RE = new RegExp(
  `\\b(${DIRECTIVE_KEYWORDS.join('|')})\\b`, 'i',
);

/**
 * Gate bypass patterns — strings whose presence on an *added* line in a
 * workflow file signals that a safety mechanism was disabled.
 */
export const BYPASS_PATTERNS = [
  '--no-verify',
  'continue-on-error: true',
  'if: false',
];

/**
 * Scope expansion — an added line that introduces or extends an exclude:
 * array. Detected by a line starting with whitespace + "- " after an
 * "exclude:" context, or by the "exclude:" keyword itself being added.
 */
export const EXCLUDE_RE = /^\s*exclude\s*:/i;

/**
 * Lines present at baseSource but not at headSource (removed lines).
 */
export function removedLines(baseSource, headSource) {
  const after = new Set(headSource.split('\n'));
  return baseSource.split('\n').filter((line) => line.trim() !== '' && !after.has(line));
}

/**
 * Lines present at headSource but not at baseSource (added lines).
 */
export function addedLines(baseSource, headSource) {
  const before = new Set(baseSource.split('\n'));
  return headSource.split('\n').filter((line) => line.trim() !== '' && !before.has(line));
}

/**
 * Detect rule-weakening: removed lines from instruction files that
 * contained a directive keyword.
 */
export function detectRuleWeakening(path, baseSource, headSource) {
  if (!isInstructionFile(path)) return [];
  const removed = removedLines(baseSource, headSource);
  const findings = [];
  for (const line of removed) {
    const m = line.match(DIRECTIVE_RE);
    if (m) {
      findings.push({
        path,
        heuristic: 'rule-weakening',
        keyword: m[1],
        line: line.trim(),
      });
    }
  }
  return findings;
}

/**
 * Detect gate-bypass: added lines in workflow files that introduce
 * --no-verify, continue-on-error: true, or if: false.
 */
export function detectGateBypass(path, baseSource, headSource) {
  if (!isWorkflowFile(path)) return [];
  const added = addedLines(baseSource, headSource);
  const findings = [];
  for (const line of added) {
    for (const pat of BYPASS_PATTERNS) {
      if (line.includes(pat)) {
        findings.push({
          path,
          heuristic: 'gate-bypass',
          pattern: pat,
          line: line.trim(),
        });
      }
    }
  }
  return findings;
}

/**
 * Detect scope-expansion: added lines in workflow/config files that
 * introduce or extend exclude: arrays.
 */
export function detectScopeExpansion(path, baseSource, headSource) {
  if (!isWorkflowFile(path)) return [];
  const added = addedLines(baseSource, headSource);
  const findings = [];
  for (const line of added) {
    if (EXCLUDE_RE.test(line)) {
      findings.push({
        path,
        heuristic: 'scope-expansion',
        line: line.trim(),
      });
    }
  }
  return findings;
}

/**
 * Run all heuristics on a single file's diff.
 */
export function analyzeFile(path, baseSource, headSource) {
  return [
    ...detectRuleWeakening(path, baseSource, headSource),
    ...detectGateBypass(path, baseSource, headSource),
    ...detectScopeExpansion(path, baseSource, headSource),
  ];
}

/* -------------------------------------------------------------------- */
/* git plumbing + reporting                                              */
/* -------------------------------------------------------------------- */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function fileAt(ref, path) {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const base = arg('--base', 'origin/master');
  const head = arg('--head', 'HEAD');

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

  const relevant = touched.filter(isRelevantFile);

  if (relevant.length === 0) {
    console.log(`${C.dim}No instruction or workflow file touched in this diff. Nothing to check.${C.reset}`);
    return;
  }

  const allFindings = [];
  for (const path of relevant) {
    const baseSource = fileAt(mergeBase, path);
    const headSource = fileAt(head, path);
    const findings = analyzeFile(path, baseSource, headSource);
    if (findings.length === 0) {
      console.log(`${C.green}  ✓ ${path}${C.reset} ${C.dim}(no tamper signals detected)${C.reset}`);
    } else {
      allFindings.push(...findings);
    }
  }

  if (allFindings.length === 0) {
    console.log(`\n${C.green}INSTRUCTION-TAMPER sensor PASSED. No tamper signals detected.${C.reset}`);
    return;
  }

  console.error(`\n${C.yellow}INSTRUCTION-TAMPER sensor: ${allFindings.length} signal(s) detected.${C.reset}`);
  console.error(`${C.dim}(Non-blocking — informational only. Review these changes carefully.)${C.reset}\n`);

  for (const f of allFindings) {
    const hTag = f.heuristic === 'rule-weakening'
      ? `${C.red}[RULE WEAKENED]${C.reset}`
      : f.heuristic === 'gate-bypass'
        ? `${C.red}[GATE BYPASS]${C.reset}`
        : `${C.yellow}[SCOPE EXPANDED]${C.reset}`;
    const detail = f.keyword
      ? `removed directive "${f.keyword}"`
      : f.pattern
        ? `added "${f.pattern}"`
        : 'added exclude: directive';
    console.error(`  ${hTag} ${C.cyan}${f.path}${C.reset}: ${detail}`);
    console.error(`    ${C.dim}${f.line}${C.reset}`);
  }

  console.error(
    `\n${C.dim}Agent PRs that modify instruction files or weaken CI gates should be reviewed carefully.\n` +
      'These signals do not block the merge but are flagged for human attention.\n' +
      `See .agents/AGENTS.md §8 for the containment protocol.${C.reset}`,
  );
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-instruction-tamper.mjs');
if (invokedDirectly) main();
