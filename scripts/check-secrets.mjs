#!/usr/bin/env node
/**
 * Secret-scanning gate — diff-shaped, zero-dependency.
 *
 * `npm audit` (scripts/test-app.mjs's "Security & dependency audit" step) only
 * catches known-vulnerable *dependencies*. It does nothing for a credential an
 * agent pastes into a fixture, an `.env`, or a debug log — and this repo's own
 * agents run with the same session-level Anthropic API access every real
 * commit could plausibly leak. Nothing currently checks for that at all.
 *
 * Patterns are lifted from ConcordDev/concord-cognitive-engine's
 * `.gitleaks.toml`, deliberately kept to a short list of high-confidence,
 * provider-specific key shapes (Anthropic, OpenAI, Google, xAI, AWS, GitHub,
 * Slack, PEM private-key blocks) rather than a broad generic
 * `password\s*=\s*.+` heuristic — the same discipline the `no-op-assertion`
 * guardrail already applies for the same reason: a check narrow enough to
 * never false-positive real work is the one that survives being turned on.
 *
 * Diff-shaped like check-enum-blast-radius.mjs and check-guardrail-integrity.mjs:
 * only lines *added* by this diff are scanned, so a secret already sitting in
 * history before this gate existed isn't re-flagged on every unrelated PR
 * forever (that's a real, separate problem — a one-time full-tree audit, not
 * this gate's job). "Added" here means "present in the file at HEAD but not
 * anywhere in the file at the merge base", a line-set difference rather than a
 * real unified-diff hunk parse — simpler to implement and test, and the same
 * complexity/value call check-guardrail-integrity.mjs already made for its own
 * "pure addition" check. Known gap: a line that is reordered but unchanged is
 * correctly treated as pre-existing; a line edited in place looks like a wholly
 * new line and is correctly scanned.
 *
 * Unlike the other two gates, there is no PR-body acknowledgment escape hatch.
 * A real committed secret is never something to wave through with a note — see
 * check-guardrail-integrity.mjs's own HARD category for the same posture.
 *
 * Matches are never printed in full, even for an obviously-fake test fixture —
 * the scanner must not become the leak vector its own CI log ships to every
 * reader with access to build output.
 *
 * Zero dependencies. Not yet wired into CI. Run locally with:
 *   node scripts/check-secrets.mjs --base origin/master --head HEAD
 *   node scripts/check-secrets.mjs --tree     # one-time full-tree audit
 */

import { execFileSync } from 'node:child_process';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', dim: '\x1b[90m', cyan: '\x1b[36m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

export const SECRET_PATTERNS = [
  { id: 'anthropic-api-key', re: /\bsk-ant-[a-zA-Z0-9_-]{50,}\b/ },
  { id: 'openai-api-key', re: /\bsk-[a-zA-Z0-9]{40,}\b/ },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'xai-api-key', re: /\bxai-[a-zA-Z0-9_-]{40,}\b/ },
  { id: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: 'private-key-block', re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
];

/** Every secret pattern that matches `text`, as `{ id, match }`. */
export function findSecrets(text) {
  const found = [];
  for (const { id, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) found.push({ id, match: m[0] });
  }
  return found;
}

/** Show enough to identify the finding without ever printing the full secret. */
export function redact(match) {
  if (match.length <= 10) return '*'.repeat(match.length);
  return `${match.slice(0, 4)}…${match.slice(-4)}`;
}

// Extensions git diff can hand back that are never worth scanning as text —
// scanning binary content for these patterns is wasted work at best and a
// source of garbled false positives at worst.
const BINARY_EXT_RE = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|eot|otf|mp4|mp3|wav|pdf|zip|gz|tar|wasm|ort)$/i;

export function isScannable(path) {
  return !BINARY_EXT_RE.test(path);
}

/** Lines present at `headSource` but not anywhere in `baseSource`. */
export function addedLines(baseSource, headSource) {
  const before = new Set(baseSource.split('\n'));
  return headSource.split('\n').filter((line) => line.trim() !== '' && !before.has(line));
}

/** Findings for one file's diff: `{ path, lineNumber, id, match }[]`. */
export function scanFile({ path, baseSource, headSource }) {
  if (!isScannable(path)) return [];
  const findings = [];
  const headLines = headSource.split('\n');
  const before = new Set(baseSource.split('\n'));
  headLines.forEach((line, idx) => {
    if (line.trim() === '' || before.has(line)) return;
    for (const { id, match } of findSecrets(line)) {
      findings.push({ path, lineNumber: idx + 1, id, match });
    }
  });
  return findings;
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
    return ''; // absent at that ref (new file, or binary git show can't decode as utf8)
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function report(findings) {
  if (findings.length === 0) {
    console.log(`${C.green}SECRETS gate PASSED. No high-confidence secret patterns found.${C.reset}`);
    return;
  }
  console.error(`${C.red}SECRETS gate FAILED.${C.reset}`);
  for (const f of findings) {
    console.error(
      `\n  ${C.cyan}${f.path}:${f.lineNumber}${C.reset} — ${C.red}${f.id}${C.reset} ` +
        `(${redact(f.match)})`,
    );
  }
  console.error(
    `\n${C.dim}A committed credential is not fixed by removing it in a later commit — it stays in\n` +
      'git history. Rotate the credential first, then remove it from the working tree. Not\n' +
      `resolvable by a PR-body note.${C.reset}`,
  );
  process.exit(1);
}

function runDiffMode() {
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
    .split('\n').map((s) => s.trim()).filter(Boolean);

  const findings = [];
  for (const path of touched) {
    findings.push(...scanFile({
      path, baseSource: fileAt(mergeBase, path), headSource: fileAt(head, path),
    }));
  }
  report(findings);
}

function runTreeMode() {
  const files = git(['ls-files']).split('\n').map((s) => s.trim()).filter(Boolean);
  const findings = [];
  for (const path of files) {
    // Tree mode: everything currently on disk is "added" relative to nothing.
    findings.push(...scanFile({ path, baseSource: '', headSource: fileAt('HEAD', path) }));
  }
  report(findings);
}

function main() {
  if (process.argv.includes('--tree')) runTreeMode();
  else runDiffMode();
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('check-secrets.mjs');
if (invokedDirectly) main();
