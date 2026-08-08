#!/usr/bin/env node
// Self-test for harness-history.mjs's analysis logic (streaks, promotion
// candidates, never-fired guardrails, chronic-firing). Pure in-memory: builds
// synthetic `history` objects and calls analyze()/cleanStreak() directly, so
// it never touches the real harness-history.json or git state. Run with:
//   node scripts/harness-history.test.mjs

import { analyze, cleanStreak, totalRunsTracking } from './harness-history.mjs';

let failures = 0;
function check(cond, msg) { if (!cond) { console.error(`✗ ${msg}`); failures++; } }

// A run entry with a given commit sha and per-rule counts (defaults to 0 for
// any ruleId not explicitly listed, so tests only spell out what matters).
function run(commit, overrides = {}) {
  return { at: new Date().toISOString(), commit, totalFindings: 0, blocking: 0, byRule: { ...overrides } };
}

// --- cleanStreak / totalRunsTracking -----------------------------------

{
  // Given a rule that has been zero for the last 3 runs but fired on the run
  // before that, When the streak is measured, Then it stops at the fire and
  // does not count the older clean runs beyond it.
  const runs = [
    run('c1', { r: 0 }),
    run('c2', { r: 1 }), // fired here
    run('c3', { r: 0 }),
    run('c4', { r: 0 }),
    run('c5', { r: 0 }),
  ];
  check(cleanStreak(runs, 'r') === 3, `cleanStreak should stop at the last fire (got ${cleanStreak(runs, 'r')}, want 3)`);
  check(totalRunsTracking(runs, 'r') === 5, `totalRunsTracking should count every run carrying the key (got ${totalRunsTracking(runs, 'r')}, want 5)`);
}

{
  // Given a rule that did not exist yet in the two oldest recorded runs (no
  // key at all — not a zero), When the streak is measured, Then it does not
  // credit those pre-registration runs as clean.
  const runs = [
    run('c1', {}),        // rule not tracked yet
    run('c2', {}),        // rule not tracked yet
    run('c3', { r: 0 }),
    run('c4', { r: 0 }),
  ];
  check(cleanStreak(runs, 'r') === 2, `cleanStreak must not credit runs that predate the rule (got ${cleanStreak(runs, 'r')}, want 2)`);
  check(totalRunsTracking(runs, 'r') === 2, `totalRunsTracking must not count runs missing the key (got ${totalRunsTracking(runs, 'r')}, want 2)`);
}

// --- analyze(): promotion candidates -------------------------------------

{
  // Given a non-blocking rule clean for 10 straight recorded runs, When
  // analyzed at threshold 10, Then it is surfaced as a promotion candidate.
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`c${i}`, { 'missing-readme': 0 }));
  const { promotionCandidates } = analyze({ runs }, 10);
  const found = promotionCandidates.find((c) => c.ruleId === 'missing-readme');
  check(!!found, 'a non-blocking rule clean for 10/10 runs at threshold 10 must be a promotion candidate');
  check(found && found.streak === 10, `promotion candidate streak should be 10 (got ${found?.streak})`);
}

{
  // Given the same rule but only 9 straight clean runs, When analyzed at
  // threshold 10, Then it is NOT (yet) a promotion candidate — proves the
  // threshold is a real gate, not decorative.
  const runs = [];
  for (let i = 0; i < 9; i++) runs.push(run(`c${i}`, { 'missing-readme': 0 }));
  const { promotionCandidates } = analyze({ runs }, 10);
  check(!promotionCandidates.some((c) => c.ruleId === 'missing-readme'), 'a rule with only 9/10 clean runs must not yet be a promotion candidate');
}

{
  // Given a rule that is already blocking (a guardrail) and clean for 10
  // runs, When analyzed, Then it is NOT listed as a promotion candidate —
  // promotion candidates are only meaningful for non-blocking rules.
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`c${i}`, { 'guardrail:explicit-any': 0 }));
  const { promotionCandidates } = analyze({ runs }, 10);
  check(!promotionCandidates.some((c) => c.ruleId === 'guardrail:explicit-any'), 'an already-blocking guardrail must never appear as a promotion candidate');
}

// --- analyze(): never-fired guardrails ------------------------------------

{
  // Given a guardrail with zero hits across 10 recorded runs, When analyzed,
  // Then it is surfaced as never-fired.
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`c${i}`, { 'guardrail:pbkdf2-salt-buffer': 0 }));
  const { neverFiredGuardrails } = analyze({ runs }, 10);
  check(neverFiredGuardrails.some((c) => c.ruleId === 'guardrail:pbkdf2-salt-buffer'), 'a guardrail with 0/10 hits must be flagged as never-fired');
}

{
  // Given a guardrail that fired once, three runs ago, When analyzed, Then it
  // is NOT flagged never-fired — proves the check looks at the whole tracked
  // history, not just the current run.
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`c${i}`, { 'guardrail:pbkdf2-salt-buffer': i === 6 ? 1 : 0 }));
  const { neverFiredGuardrails } = analyze({ runs }, 10);
  check(!neverFiredGuardrails.some((c) => c.ruleId === 'guardrail:pbkdf2-salt-buffer'), 'a guardrail that fired even once in its tracked history must not be flagged never-fired');
}

// --- analyze(): chronically firing ----------------------------------------

{
  // Given a blocking rule with hits on the latest recorded run, When
  // analyzed, Then it is surfaced as still-firing — this should be rare (the
  // gate should have stopped the merge) and is worth a human look.
  const runs = [run('c1', { 'guardrail:responsive-grid': 0 }), run('c2', { 'guardrail:responsive-grid': 2 })];
  const { chronicallyFiring } = analyze({ runs }, 1);
  const found = chronicallyFiring.find((c) => c.ruleId === 'guardrail:responsive-grid');
  check(!!found && found.count === 2, 'a blocking rule with hits on the latest run must be surfaced as chronically firing');
}

// --- analyze(): dirty runs are excluded ------------------------------------

{
  // Given 10 clean runs and one trailing 'dirty' (uncommitted) snapshot that
  // broke the rule, When analyzed, Then the dirty snapshot does not erase the
  // promotion candidacy the 10 real commits earned.
  const runs = [];
  for (let i = 0; i < 10; i++) runs.push(run(`c${i}`, { 'missing-readme': 0 }));
  runs.push(run('dirty', { 'missing-readme': 1 }));
  const { promotionCandidates, cleanRunCount } = analyze({ runs }, 10);
  check(cleanRunCount === 10, `cleanRunCount must exclude the dirty entry (got ${cleanRunCount}, want 10)`);
  check(promotionCandidates.some((c) => c.ruleId === 'missing-readme'), 'a dirty working-tree snapshot must not affect promotion-candidate analysis of committed history');
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log('✓ harness-history: streaks, promotion candidates, never-fired guardrails, chronic-firing, and dirty-run exclusion all verified.');
