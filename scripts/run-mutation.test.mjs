#!/usr/bin/env node
// Self-test for the mutation-testing sensor's pure scoring logic. Running
// actual Stryker mutation testing here would take real wall-clock minutes
// per app (the whole reason it lives outside harness-status.mjs — see
// scripts/stryker.shared.mjs), so this exercises summarizeScore() against
// fixture Stryker JSON reports instead of a live run. Zero dependencies,
// run with:
//   node scripts/run-mutation.test.mjs

import { summarizeScore, listApps } from './run-mutation.mjs';

let failures = 0;
function ok(cond, label) {
  if (!cond) { console.error(`✗ ${label}`); failures++; }
  else console.log(`✓ ${label}`);
}

function reportOf(statuses) {
  return { files: { 'src/lib/example.ts': { mutants: statuses.map((status) => ({ status })) } } };
}

// Given a report with no mutants at all (e.g. an app with no logic modules
// yet) -> When scored -> Then the result is null, not 0%, since "no mutants"
// and "every mutant survived" are different facts a caller must distinguish.
ok(summarizeScore({ files: {} }) === null, 'an empty report scores null, not 0%');
ok(summarizeScore(reportOf([])) === null, 'a file with zero mutants scores null');

// Given every mutant Killed -> When scored -> Then the score is 100%.
ok(summarizeScore(reportOf(['Killed', 'Killed', 'Killed'])) === 100, 'all-Killed report scores 100%');

// Given every mutant Survived -> When scored -> Then the score is 0%. This is
// the mutation proven by breaking the code below: flipping `Survived` out of
// the "undetected" set here would make this assertion pass at a nonzero
// score, which is exactly the false-positive coverage claim §9.4 exists to
// catch — restoring the check makes this go red again.
ok(summarizeScore(reportOf(['Survived', 'Survived'])) === 0, 'all-Survived report scores 0%');

// Given a mix of Killed, Survived, Timeout and NoCoverage -> When scored ->
// Then Timeout counts as detected (Stryker treats a timeout as the test
// suite behaving differently under the mutant, i.e. catching it) and
// NoCoverage counts as undetected (no test reached the mutant at all).
{
  const report = reportOf(['Killed', 'Killed', 'Survived', 'Timeout', 'NoCoverage']);
  const score = summarizeScore(report);
  // detected = Killed(2) + Timeout(1) = 3 of 5 -> 60%
  ok(score === 60, `mixed report scores the Killed+Timeout share (got ${score})`);
}

// Given two files each with mutants -> When scored -> Then counts aggregate
// across every file in the report, not just the first.
{
  const report = {
    files: {
      'src/lib/a.ts': { mutants: [{ status: 'Killed' }, { status: 'Survived' }] },
      'src/lib/b.ts': { mutants: [{ status: 'Killed' }, { status: 'Killed' }] },
    },
  };
  ok(summarizeScore(report) === 75, 'scores aggregate across every file in the report');
}

// listApps() should see the same six apps the rest of the harness scans.
{
  const apps = listApps();
  ok(apps.includes('elder-care-planner') && apps.includes('mood-diner') && apps.length >= 6,
    `listApps() finds the real projects/ tree (found: ${apps.join(', ')})`);
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log('\nAll mutation-scoring self-tests passed.');
