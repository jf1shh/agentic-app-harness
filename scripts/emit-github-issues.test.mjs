#!/usr/bin/env node
// Self-test for scripts/emit-github-issues.mjs.
//
// Zero dependencies; run with:
//   node scripts/emit-github-issues.test.mjs

import { toIssue, toIssuesJson, uploadLoopScript } from './emit-github-issues.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- toIssue -------------------------------------------------------------- */

const BASE_FINDING = {
  id: 'guardrail-explicit-any-abc123',
  title: 'Explicit "any" type used',
  app: 'elder-care-planner',
  type: 'guardrail',
  severity: 'high',
  gate: 'node scripts/harness-status.mjs --gate',
  detail: 'Found an explicit `any` type in a logic module.',
};

const issue = toIssue(BASE_FINDING);
ok(issue.title === '[elder-care-planner] Explicit "any" type used', 'title is prefixed with the app name');
ok(issue.body.includes(BASE_FINDING.id), 'body includes the finding id');
ok(issue.body.includes(BASE_FINDING.gate), 'body includes the acceptance gate');
ok(issue.body.includes(BASE_FINDING.detail), 'body includes the finding detail');
ok(!issue.body.includes('**Spec:**'), 'no spec line is rendered when specRef is absent');
ok(
  issue.labels.length === 4
    && issue.labels.includes('harness')
    && issue.labels.includes('type:guardrail')
    && issue.labels.includes('severity:high')
    && issue.labels.includes('app:elder-care-planner'),
  'labels carry harness, type, severity, and app',
);

const withSpec = toIssue({ ...BASE_FINDING, specRef: 'specs/elder-care-planner-spec.md' });
ok(withSpec.body.includes('**Spec:**') && withSpec.body.includes('specs/elder-care-planner-spec.md'), 'a spec line renders when specRef is present');

const withEvidence = toIssue({
  ...BASE_FINDING,
  evidence: [{ file: 'src/foo.ts', line: 5, snippet: 'any' }],
});
ok(withEvidence.body.includes('## Evidence') && withEvidence.body.includes('src/foo.ts:5'), 'evidence renders into the body when present');

/* ---- toIssuesJson ---------------------------------------------------------- */

const json = toIssuesJson([
  { ...BASE_FINDING, id: 'b', title: 'Zzz second', app: 'mood-diner' },
  { ...BASE_FINDING, id: 'a', title: 'Aaa first', app: 'mood-diner' },
]);
const parsed = JSON.parse(json);
ok(Array.isArray(parsed) && parsed.length === 2, 'toIssuesJson produces a valid JSON array with one entry per finding');
ok(parsed[0].title.includes('Aaa first') && parsed[1].title.includes('Zzz second'), 'issues are sorted by title for a stable diff across runs');
ok(json.endsWith('\n'), 'output ends with a trailing newline');

ok(JSON.parse(toIssuesJson([])).length === 0, 'an empty finding list produces an empty JSON array');

/* ---- uploadLoopScript ------------------------------------------------------- */

const loop = uploadLoopScript();
ok(loop.includes('gh issue create'), 'the upload loop invokes gh issue create');
ok(loop.includes('tasks/issues.json'), 'the upload loop reads tasks/issues.json');
ok(loop.includes('jq'), 'the upload loop uses jq to walk the JSON array');

console.log(failures === 0 ? '\nAll emit-github-issues self-tests passed.' : `\n${failures} emit-github-issues self-test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
