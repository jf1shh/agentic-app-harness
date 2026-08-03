#!/usr/bin/env node
/**
 * Doc-claims gate — prototype (not yet wired into any gate or CI workflow).
 *
 * §9.1 of .agents/AGENTS.md already says "never self-certify verification":
 * write only what a command actually printed. That rule protects PR bodies,
 * but nothing protects the numbers that live in checked-in docs themselves —
 * e.g. CLAUDE.md's "~20 line-level 'guardrails'" claim, which this script
 * catches as stale the moment it's annotated (see check-doc-claims.test.mjs
 * for a fixture built from that exact drift: the array it describes has 7
 * entries, not ~20).
 *
 * A doc makes a checkable claim by pairing an HTML comment with the line it
 * annotates:
 *
 *   <!-- doc-claim: cmd="node scripts/count-guardrails.mjs" -->
 *   This harness enforces **7** blocking guardrails.
 *
 * The script runs `cmd`, takes its trimmed stdout (or the first capture
 * group of `match`, if given, applied to that stdout), and compares it
 * against the first **bold** token on the next non-blank line. A mismatch
 * means the doc drifted from the thing it claims to describe.
 *
 * Zero dependencies. Run with:
 *   node scripts/check-doc-claims.mjs [file ...]   # defaults below
 *   node scripts/check-doc-claims.mjs --gate       # exit 1 on any mismatch
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

const DEFAULT_FILES = ['README.md', 'AGENTS.md', '.agents/AGENTS.md', 'CLAUDE.md'];

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

const CLAIM_RE = /<!--\s*doc-claim:\s*(.*?)\s*-->/;
const ATTR_RE = /(\w+)="([^"]*)"/g;
const BOLD_RE = /\*\*(.+?)\*\*/;

function parseAttrs(raw) {
  const attrs = {};
  for (const m of raw.matchAll(ATTR_RE)) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * Every `<!-- doc-claim: ... -->` marker in `markdown`, paired with the
 * claimed value on the next non-blank line. A marker with no `cmd`, or no
 * bold token on the following line, is reported with `error` set rather than
 * silently skipped — a malformed claim is itself a defect in the doc.
 */
export function parseClaims(markdown) {
  const lines = markdown.split('\n');
  const claims = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(CLAIM_RE);
    if (!m) continue;
    const attrs = parseAttrs(m[1]);
    const claim = { line: i + 1, cmd: attrs.cmd ?? null, match: attrs.match ?? null };
    if (!claim.cmd) {
      claims.push({ ...claim, error: 'doc-claim comment has no cmd="..." attribute' });
      continue;
    }
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j += 1;
    const bold = j < lines.length ? lines[j].match(BOLD_RE) : null;
    if (!bold) {
      claims.push({ ...claim, error: 'no **bold** claimed value found on the next line' });
      continue;
    }
    claims.push({ ...claim, claimed: bold[1] });
  }
  return claims;
}

/** Apply `match` (if given) to `output`; else the trimmed output as-is. */
export function extractActual(output, matchPattern) {
  const trimmed = output.trim();
  if (!matchPattern) return trimmed;
  const re = new RegExp(matchPattern);
  const m = trimmed.match(re);
  if (!m) return null;
  return m[1] ?? m[0];
}

/**
 * Evaluate one parsed claim against reality. `runCmd` is injectable so the
 * self-test never actually spawns a process — same shape as `findConsumers`
 * taking an injectable `readDir`/`read` in check-enum-blast-radius.mjs.
 */
export function evaluateClaim(claim, runCmd) {
  if (claim.error) return { ...claim, ok: false };
  let output;
  try {
    output = runCmd(claim.cmd);
  } catch (err) {
    return { ...claim, ok: false, error: `command failed: ${err.message}` };
  }
  const actual = extractActual(output, claim.match);
  if (actual === null) {
    return { ...claim, ok: false, error: `match pattern found nothing in command output` };
  }
  return { ...claim, actual, ok: actual === claim.claimed };
}

/** All claims in `markdown`, evaluated. */
export function checkMarkdown(markdown, runCmd) {
  return parseClaims(markdown).map((c) => evaluateClaim(c, runCmd));
}

/* -------------------------------------------------------------------- */
/* CLI                                                                    */
/* -------------------------------------------------------------------- */

function defaultRunCmd(cmd) {
  return execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--gate');
  const gate = process.argv.includes('--gate');
  const files = args.length ? args : DEFAULT_FILES;

  let total = 0;
  let failed = 0;

  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // a default-list file that doesn't exist in this repo isn't a claims failure
    }
    const results = checkMarkdown(text, defaultRunCmd);
    if (results.length === 0) continue;

    console.log(`\n${C.cyan}${relative(process.cwd(), file)}${C.reset}`);
    for (const r of results) {
      total += 1;
      if (r.error) {
        failed += 1;
        console.error(`  ${C.red}✗ line ${r.line}: ${r.error}${C.reset}`);
      } else if (r.ok) {
        console.log(`  ${C.green}✓ line ${r.line}: "${r.claimed}" matches ${r.cmd}${C.reset}`);
      } else {
        failed += 1;
        console.error(
          `  ${C.red}✗ line ${r.line}: doc claims "${r.claimed}" but ${r.cmd} ` +
            `printed "${r.actual}"${C.reset}`,
        );
      }
    }
  }

  if (total === 0) {
    console.log(`${C.dim}No <!-- doc-claim --> markers found.${C.reset}`);
    return;
  }

  console.log(
    failed === 0
      ? `\n${C.green}${total} doc claim(s) verified.${C.reset}`
      : `\n${C.red}${failed}/${total} doc claim(s) failed.${C.reset}`,
  );
  if (failed > 0 && gate) process.exit(1);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('check-doc-claims.mjs');
if (invokedDirectly) main();
