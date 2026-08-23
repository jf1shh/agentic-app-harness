# The Rulebook's Lesson Count Is Load-Bearing Data, Not Documentation

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **The Rulebook's Lesson Count Is Load-Bearing Data, Not Documentation**: `projects/portfolio-hub`
  derives its displayed loop stats — and its `loopStats.generated.test.ts` assertion — from the live
  `scripts/harness-status.mjs` and `.agents/AGENTS.md` (§6 lesson bullets counted), not from a
  hand-written constant. PR #217 added one §6 lesson and pushed without regenerating
  `portfolio-hub/src/data/loopStats.generated.ts`; CI's `test (portfolio-hub)` leg went red with
  `expected 47 to be 46` on a change to an entirely different app. The fix is the app's own
  generator: after any change to `.agents/AGENTS.md` that adds, removes, or merges a §6 lesson (or
  changes a `[guardrail: …]` tag count), run `cd projects/portfolio-hub && npm run
  generate:loop-stats` and re-run its suite in the same commit. The failure is already guarded —
  portfolio-hub's own unit test recomputes the counts against the committed fixture — so this is a
  pre-push discipline lesson, not a missing test. The failure is now guarded twice, so it cannot
  resurface as a red round-trip one commit late: portfolio-hub's own unit test recomputes the
  counts against the committed fixture, and `scripts/check-loop-stats.mjs` recomputes them again at
  the repo gate, failing fast with the `npm run generate:loop-stats` hint. Not a
  `harness-status.mjs` guardrail: "did these counts drift" is a cross-file recompute, not a
  line-level pattern — the same reason it lives as a workflow step (like
  `check-enum-blast-radius.mjs` and `check-doc-claims.mjs`) rather than in `GUARDRAILS`.
