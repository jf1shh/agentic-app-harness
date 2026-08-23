# A Containment Assertion Is Not a Coverage Assertion, and a Derived Figure Must Not Inherit Its Row's Confidence

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Containment Assertion Is Not a Coverage Assertion, and a Derived Figure Must Not Inherit
  Its Row's Confidence**: PR #47 added a `$30–$40` hourly band to
  `projects/elder-care-planner/src/lib/data/costOfCare.ts` and guarded it with two tests that
  asserted `low <= high`, both positive, and `low <= 3500 <= high`. A band of `[1, 999999]` — one
  cent to ten thousand dollars an hour — satisfies every one of those and passed all 350 tests,
  mutation-proven. The shape to distrust is a test that asserts a *property a whole family of
  wrong values shares*: pin the exact bounds, or assert the relationship that actually encodes
  the provenance (here, that the published median is the band's exact **midpoint**, which is the
  only thing making the spread checkable at all). The second half is the honesty failure the
  first half concealed. The survey publishes **one** merged `$35/hr` figure, so the spread around
  it is computed, not surveyed — yet it sat on a row tagged `confidence: 'verified'` and the UI
  called it "the published hourly-rate range." That is exactly the laundering the §6 *Cite
  Confidence* lesson names, and the codebase already had the precedent in
  `feeStructures.test.ts` (`FEE_RANGE_SOURCE.isAuthoritative === false`, commented as such) and
  in the deliberately-empty `STATE_MEDIANS` (*"a made-up state number is not [honest]"*). **A
  figure derived from a cited one needs its own `FigureConfidence` tag and its own note naming
  the origin** — a row-level tag describes the row's headline number, nothing else. Two further
  notes from the same PR. (1) *Read the spec's data clause before implementing it*: §11.10
  already required the band to carry four things — low, high, a `FigureConfidence` tag, and a
  note naming the survey — and the PR shipped two, so the fix was compliance rather than new
  design. (2) *A fallback that cannot run is worse than no fallback*: the component's
  `?? ±20%` spread was unreachable (its source is a compile-time constant that always carries
  the fields) and, had it ever run, would have invented a rate range on screen — so the dead
  branch was also the forbidden one. Not tagged as a guardrail: whether an assertion constrains
  enough, and whether a given number is derived from another, are judgements no regex over a
  line can make.
