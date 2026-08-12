#!/usr/bin/env node
// Self-test for the PROPOSE step (see emit-tasks.mjs header).
//
// Zero dependencies; run with:
//   node scripts/emit-tasks.test.mjs

import { evidenceBlock, workOrder, findStale } from './emit-tasks.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- evidenceBlock ------------------------------------------------------ */

ok(evidenceBlock({}) === '', 'a finding with no evidence field produces an empty block');
ok(evidenceBlock({ evidence: [] }) === '', 'a finding with an empty evidence array produces an empty block');

const withEvidence = evidenceBlock({
  evidence: [
    { file: 'src/foo.ts', line: 12, snippet: 'const x: any = y;' },
    { file: 'src/bar.ts', line: 3, snippet: 'let z: any;' },
  ],
});
ok(withEvidence.includes('## Evidence'), 'a non-empty evidence array gets an "## Evidence" heading');
ok(withEvidence.includes('src/foo.ts:12'), 'each evidence row cites its file and line');
ok(withEvidence.includes('const x: any = y;'), 'each evidence row cites its snippet');
ok(withEvidence.includes('src/bar.ts:3'), 'multiple evidence rows all appear');

/* ---- workOrder ----------------------------------------------------------- */

const BASE_FINDING = {
  id: 'guardrail-explicit-any-abc123',
  title: 'Explicit "any" type used',
  app: 'elder-care-planner',
  type: 'guardrail',
  severity: 'high',
  gate: 'node scripts/harness-status.mjs --gate',
  detail: 'Found an explicit `any` type in a logic module.',
};

const order = workOrder(BASE_FINDING);
ok(order.includes(BASE_FINDING.title), 'the work order title appears in the heading');
ok(order.includes(BASE_FINDING.id), 'the finding id appears in the body');
ok(order.includes(BASE_FINDING.app), 'the app name appears in the body');
ok(order.includes(BASE_FINDING.gate), 'the acceptance gate command appears in the body');
ok(order.includes(BASE_FINDING.detail), 'the finding detail is included as the context');
ok(!order.includes('**Spec:**'), 'no spec line is rendered when specRef is absent');

const withSpec = workOrder({ ...BASE_FINDING, specRef: 'specs/elder-care-planner-spec.md' });
ok(withSpec.includes('**Spec:**') && withSpec.includes('specs/elder-care-planner-spec.md'), 'a spec line renders when specRef is present');

const withEvidenceFinding = workOrder({
  ...BASE_FINDING,
  evidence: [{ file: 'src/foo.ts', line: 5, snippet: 'any' }],
});
ok(withEvidenceFinding.includes('## Evidence'), 'the work order includes the evidence block when the finding has evidence');

/* ---- findStale ------------------------------------------------------------ */

const files = ['finding-a.md', 'finding-b.md', 'README.md'];
const liveIds = new Set(['finding-a']);

const stale = findStale(files, liveIds);
ok(stale.length === 1 && stale[0] === 'finding-b.md', 'a task file whose finding is no longer live is reported as stale');
ok(!stale.includes('finding-a.md'), 'a task file whose finding is still live is not reported as stale');
ok(!stale.includes('README.md'), 'README.md is never treated as a work order to prune');

ok(findStale([], liveIds).length === 0, 'an empty directory listing produces no stale files');
ok(findStale(['finding-a.md'], new Set()).length === 1, 'every task file is stale when there are no live findings at all');

console.log(failures === 0 ? '\nAll emit-tasks self-tests passed.' : `\n${failures} emit-tasks self-test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
