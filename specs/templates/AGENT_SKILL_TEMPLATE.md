# Agent Skill Specification: [Skill Name]

> Template for defining a new agent skill. Fill in every section before writing the `SKILL.md`.
> Reference: `.agents/AGENTS.md` §8 "Protocol: adding a learned lesson" for when a skill should
> graduate into a guardrail.

## 1. Overview
**Skill Name:** `[skill-name]` (the slug used in the `SKILL.md` frontmatter `name` field)
**Purpose:** What problem does this skill solve, in one sentence?
**Agent Scope:** Is this skill automatically invoked by the agent (model-invoked) or only when the user types it (user-invoked)?

## 2. When It Triggers
Describe the conditions under which the agent should reach for this skill:
- Specific file types or directories?
- Specific task verbs ("audit", "diagnose", "scan")?
- A specific phase of the development cycle (Phase 4: test-first build, Phase 8: harness loop)?

## 3. What It Does (Step-by-Step)
Numbered steps the agent follows when this skill activates. Each step must be concrete enough that
a different agent on a different model can reproduce it.

1. Step 1 — what to read/gather first
2. Step 2 — what to compute or check
3. Step 3 — what to report or change
4. …

## 4. Output / Deliverable
What the agent leaves behind after running this skill:
- [ ] A report file at `[path]`?
- [ ] Edits to existing files?
- [ ] A PR body section?
- [ ] A work order in `tasks/`?

## 5. Guardrail Potential
Can any part of this skill be reduced to a line-level regex that catches a regression?
- **Mechanical (guardrail candidate):** describe the pattern and the `test(line)` predicate.
- **Needs judgment (prose-only):** explain why it cannot be automated.
- **Already guarded:** cite the existing guardrail id.

## 6. Dependencies
- Files this skill must read (specs, configs, lockfiles).
- CLI tools it requires (`npm`, `git`, `gh`, `grep`, …).
- Other skills it chains into or out of.

## 7. Acceptance Criteria
1. Running the skill on a known-bad fixture produces the expected finding.
2. Running the skill on a known-good fixture produces no false positive.
3. If the skill has a guardrail candidate, both a known-bad and known-good line exist in
   `scripts/harness-status.test.mjs`.

## 8. Open Questions
- Any unresolved decisions about scope, severity, or triggering conditions.