#!/usr/bin/env node
// Self-test for the reviewdog rdjsonl bridge's pure transform. Zero
// dependencies, run with:
//   node scripts/harness-status-rdjson.test.mjs

import { toRdjsonDiagnostics } from './harness-status-rdjson.mjs';

let failures = 0;
function ok(cond, label) {
  if (!cond) { console.error(`✗ ${label}`); failures++; }
  else console.log(`✓ ${label}`);
}

// Given a guardrail finding with two evidence hits -> When transformed ->
// Then each evidence line becomes its own diagnostic, carrying that line's
// own file/line rather than the finding's.
{
  const findings = [{
    app: 'mood-diner', ruleId: 'guardrail:explicit-any', type: 'guardrail',
    severity: 'medium', blocking: true, title: "Guardrail 'Strict TypeScript' violated",
    detail: 'Never use `any`.',
    evidence: [
      { file: 'projects/mood-diner/src/lib/a.ts', line: 12, snippet: 'const x: any = 1;' },
      { file: 'projects/mood-diner/src/lib/b.ts', line: 40, snippet: 'let y: any;' },
    ],
  }];
  const diagnostics = toRdjsonDiagnostics(findings);
  ok(diagnostics.length === 2, 'one evidence hit -> one diagnostic, for two hits -> two diagnostics');
  ok(diagnostics[0].location.path === 'projects/mood-diner/src/lib/a.ts' && diagnostics[0].location.range.start.line === 12,
    'diagnostic carries the evidence line\'s own file/line, not the finding\'s');
  ok(diagnostics[1].location.path === 'projects/mood-diner/src/lib/b.ts' && diagnostics[1].location.range.start.line === 40,
    'second evidence hit is not dropped');
  ok(diagnostics[0].code.value === 'guardrail:explicit-any', 'diagnostic code carries the ruleId');
}

// Given a finding with no evidence array (e.g. missing-spec, spec-drift) ->
// When transformed -> Then it produces zero diagnostics rather than
// guessing a line to attach it to.
{
  const findings = [
    { app: 'portfolio-hub', ruleId: 'missing-spec', type: 'missing-artifact', severity: 'high', blocking: true, title: 'Missing spec', detail: '...' },
    { app: 'portfolio-hub', ruleId: 'spec-drift', type: 'drift', severity: 'medium', blocking: false, title: 'Spec drift', detail: '...', specRef: 'specs/portfolio-hub-spec.md' },
  ];
  ok(toRdjsonDiagnostics(findings).length === 0, 'findings without a file/line (evidence) produce no diagnostics');
}

// Given a blocking vs. a non-blocking guardrail hit -> When transformed ->
// Then severity maps ERROR/WARNING off the finding's own `blocking` flag,
// not off its raw severity string. This is the mutation-proven line: forcing
// severity to a constant here would pass every other assertion above while
// silently losing the blocking/non-blocking distinction reviewdog renders
// differently in the PR UI.
{
  const findings = [
    { app: 'a', ruleId: 'guardrail:x', type: 'guardrail', severity: 'high', blocking: true, title: 't', detail: 'd', evidence: [{ file: 'f.ts', line: 1, snippet: 's' }] },
    { app: 'a', ruleId: 'guardrail:y', type: 'guardrail', severity: 'high', blocking: false, title: 't', detail: 'd', evidence: [{ file: 'g.ts', line: 2, snippet: 's' }] },
  ];
  const [blocked, unblocked] = toRdjsonDiagnostics(findings);
  ok(blocked.severity === 'ERROR', 'a blocking finding maps to rdjson severity ERROR');
  ok(unblocked.severity === 'WARNING', 'a non-blocking finding maps to rdjson severity WARNING even with the same raw severity string');
}

// Given findings -> When transformed -> Then every diagnostic is valid JSON
// on its own line (rdjsonl requires one complete JSON value per line, no
// trailing comma, no wrapping array).
{
  const findings = [{ app: 'a', ruleId: 'guardrail:x', type: 'guardrail', severity: 'low', blocking: true, title: 't', detail: 'd', evidence: [{ file: 'f.ts', line: 1, snippet: 's' }] }];
  const lines = toRdjsonDiagnostics(findings).map((d) => JSON.stringify(d));
  ok(lines.every((l) => { try { JSON.parse(l); return true; } catch { return false; } }), 'every serialized diagnostic line parses as standalone JSON');
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log('\nAll rdjsonl bridge self-tests passed.');
