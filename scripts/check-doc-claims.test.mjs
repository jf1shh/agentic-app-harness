#!/usr/bin/env node
// Self-test for the doc-claims prototype (see check-doc-claims.mjs header).
//
// The fixtures below are lifted from a real drift found while writing this
// script: CLAUDE.md's "What this repo is" section says "~20 line-level
// 'guardrails'"; scripts/harness-status.mjs's GUARDRAILS array currently has
// 7. That is exactly the kind of stale figure this script exists to catch.
//
// Zero dependencies; run with:
//   node scripts/check-doc-claims.test.mjs

import { parseClaims, extractActual, evaluateClaim, checkMarkdown } from './check-doc-claims.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- parseClaims ------------------------------------------------------ */

const GOOD_DOC = [
  '<!-- doc-claim: cmd="node scripts/count-guardrails.mjs" -->',
  'This harness enforces **7** blocking guardrails.',
].join('\n');

const claims1 = parseClaims(GOOD_DOC);
ok(claims1.length === 1, 'parseClaims finds one marker');
ok(claims1[0].cmd === 'node scripts/count-guardrails.mjs', 'parseClaims extracts cmd');
ok(claims1[0].claimed === '7', 'parseClaims extracts the bold claimed value');
ok(!claims1[0].error, 'a well-formed claim has no error');

const WITH_MATCH = [
  '<!-- doc-claim: cmd="npx vitest run" match="(\\d+) passed" -->',
  'The suite has **142** passing tests.',
].join('\n');
const claims2 = parseClaims(WITH_MATCH);
ok(claims2[0].match === '(\\d+) passed', 'parseClaims extracts an optional match regex');

const NO_CMD = '<!-- doc-claim: match="x" -->\n**7** things.';
ok(parseClaims(NO_CMD)[0].error?.includes('cmd'), 'a marker with no cmd is reported as an error');

const NO_BOLD_NEXT = '<!-- doc-claim: cmd="echo 7" -->\nno bold value here at all.';
ok(
  parseClaims(NO_BOLD_NEXT)[0].error?.includes('bold'),
  'a marker with no bold value on the next line is reported as an error',
);

const BLANK_LINE_BETWEEN = [
  '<!-- doc-claim: cmd="echo 7" -->',
  '',
  'This repo enforces **7** guardrails.',
].join('\n');
ok(
  parseClaims(BLANK_LINE_BETWEEN)[0].claimed === '7',
  'parseClaims skips a blank line to find the claimed value',
);

/* ---- extractActual ----------------------------------------------------- */

ok(extractActual('  7\n', null) === '7', 'extractActual trims when no match pattern is given');
ok(
  extractActual('142 passed, 0 failed', '(\\d+) passed') === '142',
  'extractActual applies the capture group of a match pattern',
);
ok(
  extractActual('nothing relevant here', '(\\d+) passed') === null,
  'extractActual returns null when the match pattern finds nothing',
);

/* ---- evaluateClaim (runCmd injected, never actually spawns) ----------- */

const claim = { line: 1, cmd: 'node scripts/count-guardrails.mjs', match: null, claimed: '7' };
ok(evaluateClaim(claim, () => '7\n').ok === true, 'evaluateClaim passes when output matches');
ok(evaluateClaim(claim, () => '20\n').ok === false, 'evaluateClaim fails when output disagrees');
ok(
  evaluateClaim(claim, () => {
    throw new Error('boom');
  }).error?.includes('boom'),
  'evaluateClaim reports a thrown command as a failure, not a crash',
);
ok(
  evaluateClaim({ line: 1, error: 'no cmd' }, () => '7').ok === false,
  'evaluateClaim short-circuits a claim that failed to parse',
);

/* ---- checkMarkdown: the real CLAUDE.md drift, reproduced -------------- */

const CLAUDE_MD_EXCERPT = [
  '<!-- doc-claim: cmd="node scripts/count-guardrails.mjs" -->',
  'plus ~20 line-level **"guardrails"** distilled from real bugs',
].join('\n');
// The bold token is the literal claimed text, quotes and all — parseClaims
// takes the first **...** verbatim; a doc author choosing to bold the
// number itself (as the fixtures above do) gets a cleaner comparison than
// bolding a descriptive word.
const staleClaim = checkMarkdown(CLAUDE_MD_EXCERPT, () => '7\n')[0];
ok(staleClaim.ok === false, 'the real "~20 guardrails" claim fails against the real count of 7');

const CORRECTED = [
  '<!-- doc-claim: cmd="node scripts/count-guardrails.mjs" -->',
  'plus **7** line-level "guardrails" distilled from real bugs',
].join('\n');
const correctedClaim = checkMarkdown(CORRECTED, () => '7\n')[0];
ok(correctedClaim.ok === true, 'the corrected claim of 7 passes against the real count');

/* ---- summary ------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
