// Shared, dependency-free computation for the portfolio hub's Loop Dashboard
// stats. Imported by both generate-loop-stats.mjs (which writes the committed
// generated data file) and src/data/loopStats.generated.test.ts (which
// recomputes the same numbers from the same source files and fails the build
// if they've drifted apart) — one implementation, so the count can't be wrong
// in two different ways in two different places.

const GUARDRAILS_BLOCK_RE = /const GUARDRAILS = \[([\s\S]*?)\n\];/;
const GUARDRAIL_ID_RE = /id:\s*'([a-zA-Z0-9_-]+)'/g;
const SECTION_6_RE = /^## 6\. Learned Lessons & Best Practices\n([\s\S]*?)\n## 7\./m;
const TOP_LEVEL_BULLET_RE = /^- \*\*/gm;

export function computeLoopStats({ agentsMdContent, harnessStatusContent, appCount }) {
  const guardrailsBlockMatch = harnessStatusContent.match(GUARDRAILS_BLOCK_RE);
  if (!guardrailsBlockMatch) {
    throw new Error('Could not find "const GUARDRAILS = [...]" block in harness-status.mjs — has it been renamed?');
  }
  const guardrailCount = [...guardrailsBlockMatch[1].matchAll(GUARDRAIL_ID_RE)].length;

  const section6Match = agentsMdContent.match(SECTION_6_RE);
  if (!section6Match) {
    throw new Error('Could not find "## 6. Learned Lessons & Best Practices" section in .agents/AGENTS.md — has it been renamed?');
  }
  const lessonCount = [...section6Match[1].matchAll(TOP_LEVEL_BULLET_RE)].length;

  return { guardrailCount, lessonCount, appCount };
}
