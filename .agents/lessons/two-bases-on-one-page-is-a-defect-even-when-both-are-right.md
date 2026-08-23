# Two Bases On One Page Is a Defect Even When Both Are Right

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Two Bases On One Page Is a Defect Even When Both Are Right**: `elder-care-planner` drew an
  inflation-loaded runway projection (the engine compounds `annualEscalatorRate` on care and
  `colaRate` on income) and a today's-dollars break-even comparison (`engine/breakeven.ts` has no
  time dimension at all — it prices one month at current rates) in adjacent panels, with nothing
  on screen distinguishing them. Neither figure was wrong; the *page* was, because a reader who
  carries one basis across to the other panel misreads it, and there was no way to tell. The
  general rule: **where two figures on the same page are stated on different bases, naming the
  basis is part of the figure**, not an optional annotation. Three things this taught. (1) *The
  feedback that lands is usually already in the spec* — this arrived as a friend's suggestion to
  "add inflation adjustment", and §11.9 had already recorded the same observation from an earlier
  round, adjudicated and unbuilt; check `specs/` before treating relayed feedback as new work.
  (2) *A spec's own wording can be the thing that is wrong.* §11.9 was titled "values shown are in
  today's dollars", which is false for the runway and IL charts — implementing it verbatim would
  have printed a confident, incorrect statement on precisely the charts that most needed an
  accurate one, making the transparency feature the thing that misleads. Correct the criterion in
  the spec, in writing, before building against it — the same move §6's facility-score bullet
  already required for a weighted mean. (3) *One definition, consumed twice.* The basis strings
  live in a single module that both the chart label and the §6.10 derivation `assumptions` array
  read, because two copies of a sentence drift the first time one is edited, and a chart that
  disagrees with its own derivation about which dollars it is drawing is worse than one that says
  nothing. Prove it the way the §11.9 E2E does: assert each chart names its own basis **and does
  not claim the other**, since a test that only checks "a label is present" passes on a page that
  labels every chart identically — which is the original bug. Not tagged as a guardrail: whether
  two figures on a page are on different bases is a semantic property of the engines behind them,
  and no regex over a line can see it.
