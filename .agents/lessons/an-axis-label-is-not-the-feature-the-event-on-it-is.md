# An Axis Label Is Not the Feature; the Event On It Is

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **An Axis Label Is Not the Feature; the Event On It Is** `elder-care-planner`'s IL comparison
  chart carried two x-axis labels — "Month 1" and "Month N" — and the feedback that arrived was
  "make the x-axis years." Implementing that literally would have satisfied the words and missed
  the request: the stated goal was *"easily see, oops out of funds after 6 years"*, and **nothing
  on the chart marked the depletion event at all**, so no axis relabelling would have answered it.
  Read past the proposed mechanism to the thing the reader wanted to find, and check whether the
  page can express it yet. Three rules the fix turned on, each a specialisation of an existing §6
  lesson. (1) *Read the event off the series you plot* — the depletion month is found by scanning
  the same `assetsEndByMonthCents` the chart draws, never re-derived from plan inputs, because a
  marker at the wrong month **on a curve the reader can see** is the most falsifiable kind of wrong.
  (2) *Never snap a real event to a label* — savings exhausted in month 74 are reported as month 74
  in year 7; rounding to the nearest boundary puts the marker where the curve never crossed, and the
  reader's eye catches the discrepancy immediately. (3) *Silence is not an answer* — an option whose
  savings survive says so explicitly, because a blank is indistinguishable from a case the app
  failed to evaluate, and the marker belongs in the `role="img"` accessible description too, since
  a marker only sighted readers can find is not the feature that was asked for. Note also what the
  spec's own adjudication got right and the feedback did not: switching the series to annual
  resolution was already recorded as **rejected** (§6.5b.3), because the crossing usually happens
  mid-year — so the admissible change was year *labels* on still-monthly data. Not tagged as a
  guardrail: whether a chart surfaces the event its reader came for is a judgement about purpose,
  and the missing marker is an absence no regex over a line can see.
