#!/usr/bin/env node
// Self-test for the loop-stats drift gate (see check-loop-stats.mjs header for
// the full rationale). The gate blocks merges when the committed loop-stats
// fixture drifts from the rulebook it is derived from, so the gate is itself
// gated the same way the other gates are: known-bad inputs that must fire,
// known-good inputs that must stay silent, and one assertion pinned to the
// REAL repo files on disk so the gate cannot silently stop reflecting reality
// (the same trick check-guardrail-integrity.test.mjs uses against the real
// harness-status.mjs).
//
// Zero dependencies; run with:
//   node scripts/check-loop-stats.test.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLoopStats } from '../projects/portfolio-hub/scripts/loopStatsCompute.mjs';
import { extractCommittedStats, countAppIds, driftReport } from './check-loop-stats.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- extractCommittedStats --------------------------------------------- */

const FIXTURE = `// GENERATED FILE — do not hand-edit.
import { LoopStats, LoopStatsSchema } from '../schemas';

const RAW_LOOP_STATS: LoopStats = {
  "guardrailCount": 7,
  "lessonCount": 49,
  "appCount": 5
};

export const LOOP_STATS: LoopStats = LoopStatsSchema.parse(RAW_LOOP_STATS);
`;

const parsed = extractCommittedStats(FIXTURE);
ok(parsed !== null, 'extractCommittedStats parses the generated RAW_LOOP_STATS block');
ok(
  parsed.guardrailCount === 7 && parsed.lessonCount === 49 && parsed.appCount === 5,
  'extractCommittedStats reads every committed count',
);
ok(
  extractCommittedStats('// no fixture here at all') === null,
  'extractCommittedStats returns null when the block is absent',
);
ok(
  extractCommittedStats('const RAW_LOOP_STATS: LoopStats = { "guardrailCount": ') === null,
  'extractCommittedStats returns null on an unparseable block (e.g. hand-edited)',
);

/* ---- countAppIds --------------------------------------------------------- */

const PROJECTS = `export const RAW_PROJECTS: ProjectItem[] = [
  {
    id: 'legal-financial-rag',
    name: 'LexiVault',
  },
  {
    id: 'mood-diner',
    name: 'Mood Diner',
  },
];
`;
ok(countAppIds(PROJECTS) === 2, 'countAppIds counts one project per id entry');
ok(countAppIds('no ids here') === 0, 'countAppIds is zero when there are no id entries');

/* ---- driftReport ---------------------------------------------------------- */

ok(
  driftReport(
    { guardrailCount: 7, lessonCount: 49, appCount: 5 },
    { guardrailCount: 7, lessonCount: 49, appCount: 5 },
  ).length === 0,
  'driftReport is silent when the committed fixture matches the recomputed counts',
);

// PR #217 exactly: one §6 lesson added, fixture not regenerated.
const drift = driftReport(
  { guardrailCount: 7, lessonCount: 46, appCount: 5 },
  { guardrailCount: 7, lessonCount: 47, appCount: 5 },
);
ok(
  drift.length === 1 && drift[0].key === 'lessonCount'
    && drift[0].committed === 46 && drift[0].fresh === 47,
  'driftReport names exactly the drifted field, committed value, and fresh value',
);

ok(
  driftReport(
    { guardrailCount: 7, lessonCount: 49, appCount: 5 },
    { guardrailCount: 8, lessonCount: 49, appCount: 5 },
  ).some((d) => d.key === 'guardrailCount'),
  'driftReport catches a guardrail-count drift too, not just the lesson count',
);

/* ---- the gate reflects the real repo right now --------------------------- */

{
  const agentsMdContent = readFileSync(join(REPO_ROOT, '.agents', 'AGENTS.md'), 'utf8');
  const harnessStatusContent = readFileSync(join(REPO_ROOT, 'scripts', 'harness-status.mjs'), 'utf8');
  const projectsDataSource = readFileSync(
    join(REPO_ROOT, 'projects', 'portfolio-hub', 'src', 'data', 'projectsData.ts'),
    'utf8',
  );
  const fixtureSource = readFileSync(
    join(REPO_ROOT, 'projects', 'portfolio-hub', 'src', 'data', 'loopStats.generated.ts'),
    'utf8',
  );

  const committed = extractCommittedStats(fixtureSource);
  const fresh = computeLoopStats({
    agentsMdContent,
    harnessStatusContent,
    appCount: countAppIds(projectsDataSource),
  });
  ok(
    committed !== null && driftReport(committed, fresh).length === 0,
    'the committed fixture on disk is in sync with the live rulebook and guardrail registry',
  );
}

/* ---- summary -------------------------------------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nLoop-stats gate verified: drift detected, absent/unparseable fixture flagged, real repo in sync.');
