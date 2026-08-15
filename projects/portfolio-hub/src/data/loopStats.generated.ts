// GENERATED FILE — do not hand-edit. Regenerate with:
//   node scripts/generate-loop-stats.mjs
// Source of truth: scripts/harness-status.mjs (GUARDRAILS array) and
// .agents/AGENTS.md (§6 Learned Lessons & Best Practices), read directly by
// generate-loop-stats.mjs. Verified against those same files at test time by
// loopStats.generated.test.ts, which fails the build on drift.
import { LoopStats, LoopStatsSchema } from '../schemas';

const RAW_LOOP_STATS: LoopStats = {
  "guardrailCount": 7,
  "lessonCount": 49,
  "appCount": 5
};

export const LOOP_STATS: LoopStats = LoopStatsSchema.parse(RAW_LOOP_STATS);
