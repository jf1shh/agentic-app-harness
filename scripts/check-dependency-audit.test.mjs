#!/usr/bin/env node
// Self-test for the dependency-audit sensor's pure summarizing logic.
// Running real `npm audit` here would depend on network access and the live
// npm advisory database — the same "live third-party API" trap
// .agents/AGENTS.md §6 already warns about — so this exercises
// summarizeAudit() against a fixture shaped like npm's real `npm audit
// --json` output instead. Zero dependencies, run with:
//   node scripts/check-dependency-audit.test.mjs

import { summarizeAudit } from './check-dependency-audit.mjs';

let failures = 0;
function ok(cond, label) {
  if (!cond) { console.error(`✗ ${label}`); failures++; }
  else console.log(`✓ ${label}`);
}

// Given an audit report with no vulnerabilities -> When summarized -> Then
// total is 0 and bySeverity is empty, matching a genuinely clean tree.
{
  const summary = summarizeAudit({ vulnerabilities: {} });
  ok(summary.total === 0, 'a clean audit summarizes to total 0');
  ok(Object.keys(summary.bySeverity).length === 0, 'a clean audit has no severity buckets');
}

// Given a report with no `vulnerabilities` key at all (npm audit's shape
// when run against a project with zero dependencies) -> When summarized ->
// Then it doesn't throw and reports empty, not crash on the missing key.
{
  const summary = summarizeAudit({});
  ok(summary.total === 0, 'a report missing the vulnerabilities key summarizes to total 0, not a throw');
}

// Given a mixed-severity fixture shaped like a real `npm audit --json`
// response (the same shape captured from this repo's own vulnerable tree
// before it was fixed) -> When summarized -> Then every entry is counted
// under its own severity bucket, sorted worst-first, and via/fixAvailable
// are carried through.
{
  const fixture = {
    vulnerabilities: {
      nanoid: {
        severity: 'high',
        range: '<3.3.18',
        fixAvailable: true,
        via: [{ title: 'nanoid loops indefinitely on size 0', source: 1139427 }],
      },
      qs: {
        severity: 'moderate',
        range: '6.11.1 - 6.15.1',
        fixAvailable: true,
        via: [{ title: 'qs DoS via null entries', source: 1119502 }],
      },
      undici: {
        severity: 'low',
        range: '<6.27.0',
        fixAvailable: false,
        via: ['some-parent-package'],
      },
    },
  };
  const summary = summarizeAudit(fixture);

  ok(summary.total === 3, `three vulnerabilities counted (got ${summary.total})`);
  ok(summary.bySeverity.high === 1 && summary.bySeverity.moderate === 1 && summary.bySeverity.low === 1,
    'each entry lands in its own severity bucket');

  // Sorted worst-first: high, then moderate, then low.
  const order = summary.entries.map((e) => e.severity);
  ok(JSON.stringify(order) === JSON.stringify(['high', 'moderate', 'low']),
    `entries sort worst-severity-first (got ${order.join(', ')})`);

  const nanoidEntry = summary.entries.find((e) => e.name === 'nanoid');
  ok(nanoidEntry.fixAvailable === true, 'fixAvailable is carried through for a fixable entry');
  ok(nanoidEntry.via[0] === 'nanoid loops indefinitely on size 0',
    'via extracts a human-readable title from an object entry');

  const undiciEntry = summary.entries.find((e) => e.name === 'undici');
  ok(undiciEntry.fixAvailable === false, 'fixAvailable is carried through for a non-fixable entry');
  ok(undiciEntry.via[0] === 'some-parent-package', 'via passes through a bare string entry unchanged');
}

// Given an entry with no `severity` field (defensive: npm's shape has been
// observed to shift across versions per rag-eval-gate.mjs's own comment
// about promptfoo's output shape) -> When summarized -> Then it's bucketed
// as 'unknown' rather than throwing or silently disappearing.
{
  const summary = summarizeAudit({ vulnerabilities: { 'mystery-pkg': {} } });
  ok(summary.total === 1, 'an entry with no severity field is still counted');
  ok(summary.entries[0].severity === 'unknown', 'a missing severity field is bucketed as unknown, not dropped');
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log('\nAll dependency-audit self-tests passed.');
