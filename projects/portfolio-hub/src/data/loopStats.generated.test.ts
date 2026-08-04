import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoopStatsSchema } from '../schemas';
import { LOOP_STATS } from './loopStats.generated';
import { PROJECTS_DATA } from './projectsData';
import { computeLoopStats } from '../../scripts/loopStatsCompute.mjs';

// Given/When/Then, but the "Given" here is "the real repo, right now" rather
// than a fixture: this test recomputes guardrailCount and lessonCount
// independently from the same two source files generate-loop-stats.mjs reads,
// and fails if the committed LOOP_STATS has drifted from them — e.g. a
// guardrail added to scripts/harness-status.mjs without re-running
// `npm run generate:loop-stats`.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

describe('Loop Dashboard stats', () => {
  it('Given the committed LOOP_STATS, When it is parsed through the contract, Then it is accepted unchanged', () => {
    expect(LoopStatsSchema.parse(LOOP_STATS)).toEqual(LOOP_STATS);
  });

  it('Given the real scripts/harness-status.mjs and .agents/AGENTS.md, When their guardrail and lesson counts are recomputed independently, Then they match the committed LOOP_STATS exactly', () => {
    const agentsMdContent = readFileSync(join(REPO_ROOT, '.agents', 'AGENTS.md'), 'utf8');
    const harnessStatusContent = readFileSync(join(REPO_ROOT, 'scripts', 'harness-status.mjs'), 'utf8');
    const fresh = computeLoopStats({ agentsMdContent, harnessStatusContent, appCount: PROJECTS_DATA.length });

    expect(fresh.guardrailCount).toBe(LOOP_STATS.guardrailCount);
    expect(fresh.lessonCount).toBe(LOOP_STATS.lessonCount);
    expect(fresh.appCount).toBe(LOOP_STATS.appCount);
  });

  it('Given a guardrail added to a fixture GUARDRAILS block, When the count is recomputed, Then it goes up by exactly one', () => {
    // Proves the recompute in the test above can actually detect drift,
    // rather than trivially matching the committed file by construction.
    const agentsMdContent = readFileSync(join(REPO_ROOT, '.agents', 'AGENTS.md'), 'utf8');
    const harnessStatusContent = readFileSync(join(REPO_ROOT, 'scripts', 'harness-status.mjs'), 'utf8');
    const baseline = computeLoopStats({ agentsMdContent, harnessStatusContent, appCount: 1 });

    const mutatedHarnessStatus = harnessStatusContent.replace(
      'const GUARDRAILS = [',
      "const GUARDRAILS = [\n  { id: 'fixture-only-guardrail' },",
    );
    const mutated = computeLoopStats({ agentsMdContent, harnessStatusContent: mutatedHarnessStatus, appCount: 1 });

    expect(mutated.guardrailCount).toBe(baseline.guardrailCount + 1);
  });
});
