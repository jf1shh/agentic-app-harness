#!/usr/bin/env node
// Regenerates src/data/loopStats.generated.ts from the real sources of truth:
// scripts/harness-status.mjs (guardrail count) and .agents/AGENTS.md
// (§6 lesson count), plus PROJECTS_DATA's own length (app count) — never
// hand-typed. Run whenever a guardrail or lesson is added or removed:
//   node scripts/generate-loop-stats.mjs
// Drift between this file's output and the committed generated data is caught
// by src/data/loopStats.generated.test.ts, which recomputes independently.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeLoopStats } from './loopStatsCompute.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const REPO_ROOT = join(APP_ROOT, '..', '..');

const agentsMdContent = readFileSync(join(REPO_ROOT, '.agents', 'AGENTS.md'), 'utf8');
const harnessStatusContent = readFileSync(join(REPO_ROOT, 'scripts', 'harness-status.mjs'), 'utf8');

// App count comes from projectsData.ts's own PROJECTS_DATA.length at runtime
// (see App.tsx), not from this generator, so it can never drift from the
// dataset the cards themselves render from. This script only owns the two
// counts that live outside portfolio-hub's own source tree.
const projectsDataSource = readFileSync(join(APP_ROOT, 'src', 'data', 'projectsData.ts'), 'utf8');
const appCount = [...projectsDataSource.matchAll(/^\s*id: '[a-z0-9-]+',/gm)].length;

const stats = computeLoopStats({ agentsMdContent, harnessStatusContent, appCount });

const output = `// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/generate-loop-stats.mjs
// Source of truth: scripts/harness-status.mjs (GUARDRAILS array) and
// .agents/AGENTS.md (§6 Learned Lessons & Best Practices), read directly by
// generate-loop-stats.mjs. Verified against those same files at test time by
// loopStats.generated.test.ts, which fails the build on drift.
import { LoopStats, LoopStatsSchema } from '../schemas';

const RAW_LOOP_STATS: LoopStats = ${JSON.stringify(stats, null, 2)};

export const LOOP_STATS: LoopStats = LoopStatsSchema.parse(RAW_LOOP_STATS);
`;

writeFileSync(join(APP_ROOT, 'src', 'data', 'loopStats.generated.ts'), output);
console.log(`Wrote src/data/loopStats.generated.ts: ${JSON.stringify(stats)}`);
