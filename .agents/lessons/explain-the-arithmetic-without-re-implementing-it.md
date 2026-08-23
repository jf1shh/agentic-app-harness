# Explain the Arithmetic Without Re-implementing It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Explain the Arithmetic Without Re-implementing It**: When an app shows its working — a
  "how was this calculated?" panel, a derivation table, a methodology page — the explanation must
  be *built from engine output*, never recomputed alongside it. A second implementation of the
  same formula passes review on the day it is written and then drifts the first time the engine
  changes, and a confidently wrong derivation is worse than none: it is the app being caught out
  by the very transparency it offered. `projects/elder-care-planner/src/lib/explain/` reads every
  cents value out of a `CostBreakdown`, `RunwayResult`, `BreakEvenResult` or `SplitResult`, and
  the unit tests assert correspondence in both directions — each derivation's stated result equals
  the engine's figure, *and* adding a fee moves the derivation by exactly that fee rather than
  leaving it stale. Two further rules make such a panel trustworthy rather than decorative.
  (1) *The parts must sum to the total as rendered*, which means parsing the formatted strings in
  the test, not the engine output — the same discipline as the total-and-parts lesson above, and
  the exact check a sceptical reader performs the moment the panel invites them to. (2) *A clamp
  is a step, not a silent discrepancy*: where a figure is floored (a funding gap that cannot go
  below zero), show the clamp as its own line, or the arithmetic visibly fails to balance in
  precisely the case where the user is most relieved and least expecting an error. Both were
  proven by mutation — dropping the add-on rows and disabling the clamp each fail the suite. Not
  tagged as a guardrail: no regex can tell whether a number was read from an engine result or
  recomputed from the same inputs, which is the whole distinction.
