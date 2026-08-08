#!/usr/bin/env node
/**
 * Guardrail-integrity gate — "who guards the guards".
 *
 * Every other gate in this harness protects application code from regressing.
 * Nothing protects the *gates themselves* from being weakened by the PR that
 * is under pressure to turn green — the fastest way to make a red check pass
 * is not always to fix the code, and `harness-learn.mjs` only enforces that a
 * guardrail cites a lesson, not that it still does what the lesson requires.
 *
 * The idea is lifted from ConcordDev/concord-cognitive-engine's
 * `scripts/autoloop/guard.mjs`, which auto-rejects any diff touching its
 * graders/baselines and separately flags a decreased assertion count in any
 * test file, printing "Do NOT commit. Re-do the unit doing the real work; for
 * invariant edits, escalate to a human." Ported here in a form that fits how
 * this repo's own gates are structured — GUARDRAILS is a living array agents
 * are *supposed* to add to (.agents/AGENTS.md §8's own protocol), so a hard
 * "any touch is rejected" rule would break the sanctioned workflow. Two rules
 * instead, scoped by what kind of file is touched:
 *
 * 1. HARD, unacknowledgeable: a guardrail id present at the merge base and
 *    absent at HEAD (deleted, not refactored), or a protected self-test file
 *    whose assertion count went down. Both are "a check stopped happening" —
 *    there is no PR-body sentence that makes that OK; the gate that shipped
 *    `no-op-assertion` exists because of exactly this failure mode.
 *
 * 2. SOFT, resolved by naming the file in the PR body (same mechanism as
 *    check-enum-blast-radius.mjs's `isAcknowledged`, reused directly): a
 *    touch to a gate script (check-enum-blast-radius.mjs, harness-learn.mjs),
 *    or a touch to harness-status.mjs that is not a pure net addition of new
 *    guardrail id(s). A pure addition — the sanctioned "add a guardrail"
 *    workflow — passes silently so that workflow stays as easy as it is today.
 *
 * Known blind spot, stated plainly rather than hidden: rule 2's "pure
 * addition" check is id-count-based, not per-object. A diff that adds one new
 * guardrail *and* quietly loosens an existing one's regex in the same commit
 * is not caught by this heuristic — catching that would need a brace/string
 * -aware parser of the array (several guardrail `test` functions embed
 * `{`/`}` inside regex literals, e.g. responsive-grid's `\d{4,}`, which is
 * exactly the kind of thing a naive depth counter gets wrong), and that
 * complexity was judged not worth it for a first version. What it does catch:
 * outright deletion, and any edit to gate logic (isBlocking, senseApp, the
 * two other gate scripts) that isn't accompanied by growing the registry.
 *
 * Zero dependencies. Wired into .github/workflows/sdd-sentinel.yml (self-test,
 * then --base/--head/PR_BODY) the same way check-enum-blast-radius.mjs is. Run
 * locally with:
 *   node scripts/check-guardrail-integrity.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';
import { isAcknowledged } from './check-enum-blast-radius.mjs';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/**
 * Files whose own job is deciding what blocks a merge, and how each is
 * checked. `guardrail-registry` gets the id-removal + net-addition rule;
 * `self-test` gets the assertion-count rule; `gate-script` gets a plain
 * "any touch must be named in the PR body" rule.
 */
export const PROTECTED_FILES = [
  { path: 'scripts/harness-status.mjs', kind: 'guardrail-registry' },
  { path: 'scripts/harness-status.test.mjs', kind: 'self-test' },
  { path: 'scripts/check-enum-blast-radius.mjs', kind: 'gate-script' },
  { path: 'scripts/check-enum-blast-radius.test.mjs', kind: 'self-test' },
  { path: 'scripts/harness-learn.mjs', kind: 'gate-script' },
];

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/** Every `id: '...'` inside the `const GUARDRAILS = [...]` array, in order. */
export function extractGuardrailIds(source) {
  const m = source.match(/const GUARDRAILS = \[([\s\S]*?)\n\];/);
  if (!m) return [];
  return [...m[1].matchAll(/id:\s*'([^']+)'/g)].map((x) => x[1]);
}

/** Guardrail ids present at base and gone at head — deleted, not refactored. */
export function removedGuardrails(baseSource, headSource) {
  const before = new Set(extractGuardrailIds(baseSource));
  const after = new Set(extractGuardrailIds(headSource));
  return [...before].filter((id) => !after.has(id));
}

// Two idioms this repo's own self-tests already use for "one thing checked":
// `ok(cond, label)` (check-enum-blast-radius.test.mjs, check-doc-claims.test.mjs)
// and `failures++` / `failures += 1` (harness-status.test.mjs's per-case loop).
// A third idiom introduced later just needs a pattern added here — the count
// is deliberately a density proxy, the same trade-off guard.mjs makes with its
// own broad assert/expect/toBe/toEqual/toThrow regex.
const ASSERTION_PATTERNS = [
  /\bok\(/g,
  /\bfailures\s*(?:\+\+|\+=\s*1)/g,
];

/** A density proxy for "how many things this test file checks". */
export function countAssertions(source) {
  return ASSERTION_PATTERNS.reduce((n, re) => n + (source.match(re) || []).length, 0);
}

/**
 * Violations for one protected file, given its source at both ends of the
 * diff and the PR body (for the soft, nameable-in-body rule). `path` here is
 * the repo-relative path exactly as listed in PROTECTED_FILES — the same
 * shape `isAcknowledged` expects a consumer path in.
 */
export function evaluateProtectedFile({ path, kind, baseSource, headSource, body }) {
  if (kind === 'self-test') {
    const before = countAssertions(baseSource);
    const after = countAssertions(headSource);
    if (after < before) {
      return [{
        path, severity: 'hard',
        message: `assertion count dropped from ${before} to ${after} — a check was removed ` +
          'instead of the code under it being fixed. Not resolvable by a PR-body note; restore ' +
          'the check or explain in review why the removed case no longer applies.',
      }];
    }
    return [];
  }

  if (kind === 'guardrail-registry') {
    const violations = [];
    const removed = removedGuardrails(baseSource, headSource);
    if (removed.length) {
      violations.push({
        path, severity: 'hard',
        message: `removed guardrail(s): ${removed.join(', ')} — enforcement was deleted. Not ` +
          'resolvable by a PR-body note; this needs explicit human sign-off in review.',
      });
    }
    const before = extractGuardrailIds(baseSource).length;
    const after = extractGuardrailIds(headSource).length;
    const pureAddition = removed.length === 0 && after > before;
    if (!pureAddition && !isAcknowledged(body, path)) {
      violations.push({
        path, severity: 'soft',
        message: 'touched without adding a net-new guardrail and without being named in the PR ' +
          'body — could be a legitimate fix to an existing guardrail, or gate logic (isBlocking, ' +
          'senseApp) changing underneath it. Name the file in the PR body to pass.',
      });
    }
    return violations;
  }

  // gate-script
  if (!isAcknowledged(body, path)) {
    return [{
      path, severity: 'soft',
      message: 'touched without being named in the PR body — this file\'s own logic decides ' +
        'what blocks a merge. Name the file in the PR body to pass.',
    }];
  }
  return [];
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
    return ''; // absent at that ref
  }
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

  const touched = new Set(
    git(['diff', '--name-only', mergeBase, head]).split('\n').map((s) => s.trim()).filter(Boolean),
  );

  const relevant = PROTECTED_FILES.filter((f) => touched.has(f.path));
  if (relevant.length === 0) {
    console.log(`${C.dim}No protected harness file touched in this diff. Nothing to check.${C.reset}`);
    return;
  }

  const allViolations = [];
  for (const { path, kind } of relevant) {
    const baseSource = fileAt(mergeBase, path);
    const headSource = fileAt(head, path);
    const violations = evaluateProtectedFile({ path, kind, baseSource, headSource, body });
    if (violations.length === 0) {
      console.log(`${C.green}  ✓ ${path}${C.reset}`);
    } else {
      allViolations.push(...violations);
    }
  }

  if (allViolations.length === 0) {
    console.log(`\n${C.green}GUARDRAIL-INTEGRITY gate PASSED.${C.reset}`);
    return;
  }

  console.error(`\n${C.red}GUARDRAIL-INTEGRITY gate FAILED.${C.reset}`);
  for (const v of allViolations) {
    const tag = v.severity === 'hard' ? `${C.red}[HARD]${C.reset}` : `${C.yellow}[SOFT]${C.reset}`;
    console.error(`\n  ${tag} ${C.cyan}${v.path}${C.reset}\n    ${v.message}`);
  }
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-guardrail-integrity.mjs');
if (invokedDirectly) main();
