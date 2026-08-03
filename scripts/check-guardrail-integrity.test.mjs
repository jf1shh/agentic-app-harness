#!/usr/bin/env node
// Self-test for the guardrail-integrity gate (see check-guardrail-integrity.mjs
// header for the full rationale). The gate protects the other gates, so it is
// itself gated the same way check-enum-blast-radius.mjs is: a known-bad case
// that must fire, a known-good case that must stay silent.
//
// Zero dependencies; run with:
//   node scripts/check-guardrail-integrity.test.mjs

import { readFileSync } from 'node:fs';
import {
  extractGuardrailIds,
  removedGuardrails,
  countAssertions,
  evaluateProtectedFile,
  PROTECTED_FILES,
} from './check-guardrail-integrity.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- extractGuardrailIds: must survive the actual landmine in this repo -- */
// responsive-grid's real `test` function contains `\d{4,}` inside a regex
// literal — a naive brace-depth parser would miscount on it. This script
// deliberately never parses braces; it only scans for the `id: '...'` shape,
// so the landmine should not matter. Prove it against the REAL file on disk,
// not just a fixture standing in for it.

const REAL_HARNESS_STATUS = readFileSync(
  new URL('./harness-status.mjs', import.meta.url), 'utf8',
);
const realIds = extractGuardrailIds(REAL_HARNESS_STATUS);
ok(
  realIds.includes('responsive-grid'),
  'extractGuardrailIds finds responsive-grid despite the \\d{4,} regex-brace landmine in its test fn',
);
ok(
  ['viewport-no-zoom', 'explicit-any', 'root-service-worker', 'pbkdf2-salt-buffer',
    'responsive-grid', 'capacitor-absolute-base', 'no-op-assertion']
    .every((id) => realIds.includes(id)),
  'extractGuardrailIds finds every known guardrail id in the real harness-status.mjs on disk',
);

/* ---- removedGuardrails --------------------------------------------------- */

const BASE_GUARDRAILS = `
const GUARDRAILS = [
  {
    id: 'viewport-no-zoom',
    test: (line) => /user-scalable\\s*=\\s*no/i.test(line),
  },
  {
    id: 'responsive-grid',
    test: (line) => /minmax\\(\\s*([3-9]\\d\\d|\\d{4,})px/.test(line),
  },
];
`;

const HEAD_REMOVED_ONE = `
const GUARDRAILS = [
  {
    id: 'viewport-no-zoom',
    test: (line) => /user-scalable\\s*=\\s*no/i.test(line),
  },
];
`;

const HEAD_ADDED_ONE = `
const GUARDRAILS = [
  {
    id: 'viewport-no-zoom',
    test: (line) => /user-scalable\\s*=\\s*no/i.test(line),
  },
  {
    id: 'responsive-grid',
    test: (line) => /minmax\\(\\s*([3-9]\\d\\d|\\d{4,})px/.test(line),
  },
  {
    id: 'explicit-any',
    test: (line) => /\\bas any\\b/.test(line),
  },
];
`;

ok(
  removedGuardrails(BASE_GUARDRAILS, HEAD_REMOVED_ONE).length === 1
    && removedGuardrails(BASE_GUARDRAILS, HEAD_REMOVED_ONE)[0] === 'responsive-grid',
  'removedGuardrails catches a deleted id, unbroken by a brace inside a regex literal',
);
ok(
  removedGuardrails(BASE_GUARDRAILS, HEAD_ADDED_ONE).length === 0,
  'removedGuardrails is silent when nothing was deleted',
);
ok(
  removedGuardrails(BASE_GUARDRAILS, BASE_GUARDRAILS).length === 0,
  'removedGuardrails is silent on an unchanged array',
);

/* ---- countAssertions ------------------------------------------------------ */

ok(countAssertions("ok(x === 1, 'a');\nok(y === 2, 'b');") === 2, 'countAssertions counts ok( calls');
ok(
  countAssertions("if (!g.test(line)) { console.error('x'); failures++; }\nfailures += 1;") === 2,
  'countAssertions counts failures++ and failures += 1',
);
ok(
  countAssertions('const ok = (cond, label) => { /* ... */ };') === 0,
  "countAssertions does not count the helper's own definition line — it reads `ok = (`, not `ok(`",
);

/* ---- evaluateProtectedFile: self-test kind (the guard.mjs-equivalent rule) */

const selfTestShrunk = evaluateProtectedFile({
  path: 'scripts/check-enum-blast-radius.test.mjs',
  kind: 'self-test',
  baseSource: "ok(a, 'x');\nok(b, 'y');\nok(c, 'z');",
  headSource: "ok(a, 'x');\nok(b, 'y');",
  body: '',
});
ok(
  selfTestShrunk.length === 1 && selfTestShrunk[0].severity === 'hard',
  'a self-test whose assertion count drops is a HARD violation',
);
ok(
  !isAcknowledgeable(selfTestShrunk, 'scripts/check-enum-blast-radius.test.mjs mentioned'),
  'a HARD self-test violation cannot be rescued by naming the file in the PR body',
);

const selfTestGrew = evaluateProtectedFile({
  path: 'scripts/check-enum-blast-radius.test.mjs',
  kind: 'self-test',
  baseSource: "ok(a, 'x');\nok(b, 'y');",
  headSource: "ok(a, 'x');\nok(b, 'y');\nok(c, 'z');",
  body: '',
});
ok(selfTestGrew.length === 0, 'a self-test whose assertion count grows or stays flat is silent');

/* ---- evaluateProtectedFile: guardrail-registry kind ----------------------- */

const pureAddition = evaluateProtectedFile({
  path: 'scripts/harness-status.mjs',
  kind: 'guardrail-registry',
  baseSource: BASE_GUARDRAILS,
  headSource: HEAD_ADDED_ONE,
  body: '', // deliberately no PR body — pure addition must not need one
});
ok(pureAddition.length === 0, 'a pure net-addition of a guardrail passes silently, even with an empty PR body');

const deletion = evaluateProtectedFile({
  path: 'scripts/harness-status.mjs',
  kind: 'guardrail-registry',
  baseSource: BASE_GUARDRAILS,
  headSource: HEAD_REMOVED_ONE,
  body: 'scripts/harness-status.mjs — removed responsive-grid, it was replaced by a CSS lint rule',
});
ok(
  deletion.some((v) => v.severity === 'hard'),
  'a deleted guardrail is a HARD violation even when the PR body explains the removal',
);

const modifiedNotAcked = evaluateProtectedFile({
  path: 'scripts/harness-status.mjs',
  kind: 'guardrail-registry',
  baseSource: BASE_GUARDRAILS,
  headSource: BASE_GUARDRAILS.replace('no/i', 'no/'), // same ids, body text changed, no addition
  body: '',
});
ok(
  modifiedNotAcked.length === 1 && modifiedNotAcked[0].severity === 'soft',
  'touching an existing guardrail with no net addition and no PR-body mention is a SOFT violation',
);

const modifiedAcked = evaluateProtectedFile({
  path: 'scripts/harness-status.mjs',
  kind: 'guardrail-registry',
  baseSource: BASE_GUARDRAILS,
  headSource: BASE_GUARDRAILS.replace('no/i', 'no/'),
  body: 'Tightened scripts/harness-status.mjs — dropped a redundant case-insensitive flag.',
});
ok(
  modifiedAcked.length === 0,
  'the same touch is silent once the PR body names the file',
);

/* ---- evaluateProtectedFile: gate-script kind ------------------------------ */

const gateScriptTouched = evaluateProtectedFile({
  path: 'scripts/harness-learn.mjs',
  kind: 'gate-script',
  baseSource: 'export function main() { return 1; }',
  headSource: 'export function main() { return 2; }',
  body: '',
});
ok(
  gateScriptTouched.length === 1 && gateScriptTouched[0].severity === 'soft',
  'any touch to a gate-script file with no PR-body mention is a SOFT violation',
);

const gateScriptAcked = evaluateProtectedFile({
  path: 'scripts/harness-learn.mjs',
  kind: 'gate-script',
  baseSource: 'export function main() { return 1; }',
  headSource: 'export function main() { return 2; }',
  body: 'Fixed scripts/harness-learn.mjs to also check the ".agents" prefix.',
});
ok(gateScriptAcked.length === 0, 'the same touch is silent once named in the PR body');

/* ---- PROTECTED_FILES is well-formed --------------------------------------- */

ok(
  PROTECTED_FILES.every((f) => ['guardrail-registry', 'self-test', 'gate-script'].includes(f.kind)),
  'every entry in PROTECTED_FILES has a kind evaluateProtectedFile knows how to handle',
);

/* ---- helpers --------------------------------------------------------------- */

function isAcknowledgeable(violations, _note) {
  // A HARD violation ignores the PR body entirely by construction — this
  // helper exists only to make that assertion read as a statement about the
  // violation's severity, not a re-implementation of the acknowledgment check.
  return violations.every((v) => v.severity !== 'hard');
}

/* ---- summary --------------------------------------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}
