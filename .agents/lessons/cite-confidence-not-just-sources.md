# Cite Confidence, Not Just Sources

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Cite Confidence, Not Just Sources**: A dataset where every figure carries the same citation hides
  that some figures are solid and others are guesses. `projects/elder-care-planner/src/lib/data/costOfCare.ts`
  tags each entry `verified` (cross-checked against two independent reports), `needs_verification`
  (single secondary summary) or `derived` (not a surveyed category), and the UI surfaces the tag next to
  the number. This is what makes it possible to ship an incomplete dataset honestly instead of either
  stalling or laundering a weak figure into a confident one. The same discipline says what to do about
  gaps: where no verified state-level figure existed, the app falls back to the national median and
  *says so*, rather than interpolating a plausible-looking number.
