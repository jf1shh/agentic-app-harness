# Conventions

This repo already has one authoritative rulebook — `.agents/AGENTS.md`, imported by `AGENTS.md`
and `CLAUDE.md`. Restating its rules here would create a second copy that drifts the first time
one of them is edited (the exact failure `.agents/AGENTS.md` §6 documents under "One Fact Stated
Twice Will Eventually Be Stated Two Ways"). This file is a pointer, not a duplicate.

## Where the real rules live

- **Spec-first, contract-first, testing, the agentic loop, PR discipline**: `.agents/AGENTS.md`
  (sections 1–9).
- **Commands, per-app stack table, CI wiring**: `CLAUDE.md`.
- **Learned lessons and guardrails**: `.agents/AGENTS.md` §6 (prose lessons, some tagged
  `[guardrail: <id>]` and enforced by `scripts/harness-status.mjs`).

## ICM-layer-specific conventions

These apply only to this Layer 0/1/3 orientation scaffold, not to the apps themselves:

- Keep `IDENTITY.md` scannable in one read (~800 tokens is the target; `.claude/skills/icm-sync`
  treats 1,500 tokens as the outer budget and only flags a split past that) — it is a map, not a
  manual.
- Keep `CONTEXT.md`'s routing table current: when a new top-level folder or major workflow is
  added to the repo, add a row rather than letting the table go stale.
- When a fact belongs in both an ICM file and `.agents/AGENTS.md`, put the full statement in
  `.agents/AGENTS.md` and link to it from here — never the reverse.
- **This repo's Layer 2 is a loop, not a one-way pipeline.** ICM's usual convention (see
  [Interpretable-Context-Methodology](https://github.com/RinDig/Interpretable-Context-Methodology))
  is one-way references between stages, no cycles. `stages/learn/CONTEXT.md` deliberately breaks
  that — "the loop feeds back into `../verify/`" — because the harness re-senses every commit
  rather than running a linear pipeline once per input. That's intentional, not drift: don't
  "fix" it into a one-way reference when syncing this layer.
