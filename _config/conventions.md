# Conventions

This repo already has one authoritative rulebook — `.agents/AGENTS.md`, imported by `AGENTS.md`
and `CLAUDE.md`. Restating its rules here would create a second copy that drifts the first time
one of them is edited (the exact failure `.agents/AGENTS.md` §6 documents under "One Fact Stated
Twice Will Eventually Be Stated Two Ways"). This file is a pointer, not a duplicate.

## Where the real rules live

- **Spec-first, contract-first, testing, the agentic loop, PR discipline**: `.agents/AGENTS.md`
  (sections 1–9).
- **Commands, per-app stack table, CI wiring**: `CLAUDE.md`.
- **Learned lessons and guardrails**: `.agents/AGENTS.md` §6 (a one-line index; full text in
  `.agents/lessons/<slug>.md`, some tagged `[guardrail: <id>]` and enforced by
  `scripts/harness-status.mjs`).

## Where a new skill goes: `.agents/skills/` vs `.claude/skills/`

- **`.agents/skills/`** — a skill encoding a *harness discipline*: something any agent working in
  this repo should be able to run regardless of which tool it is (`dependency-doctor`,
  `harness-doctor`, `scope-creep-detector`, `spec-review`, `sdd-harness-guide`). Cross-tool, no
  `user_invocable` frontmatter field (it's implied — you run these on demand).
- **`.claude/skills/`** — a skill that is genuinely Claude-Code-only, today limited to maintaining
  the ICM navigation layer itself (`icm-scaffold`, `icm-sync`, `icm-context-scaffold`, each
  `user_invocable: true`).
- This resolves an open question `docs/EXTERNAL_REPO_ADOPTION_PLAN.md` left unanswered when it was
  written (baseline commit `bebc968`, when `.agents/skills/` held only the ICM guide pointer): by
  the time `spec-review` (WI-2) was actually built, `.agents/skills/` already held four harness-
  discipline skills, so cross-tool availability — not the plan's original Claude-Code-only guess —
  is the deciding factor now.

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
