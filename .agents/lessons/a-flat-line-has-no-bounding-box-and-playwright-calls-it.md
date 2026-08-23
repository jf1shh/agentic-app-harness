# A Flat Line Has No Bounding Box, and Playwright Calls It Hidden

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Flat Line Has No Bounding Box, and Playwright Calls It Hidden**: An SVG `<path>` that is
  legitimately horizontal — a series that is all zeros, a balance that never moves — has zero
  height, so `expect(locator).toBeVisible()` fails on it even though the element is in the DOM,
  correctly rendered, and visible to a human as a hairline on the axis. The failure reads as
  "the chart did not draw the line," which sends you looking for a rendering bug that is not
  there; in `projects/elder-care-planner` the real cause was fixture data (a $400,000 entry fee
  against $150,000 of savings) that flattened every curve onto zero. Two rules. (1) *Assert
  presence and attributes, not visibility*, for any series that can legitimately be flat —
  `toHaveCount(1)` plus the `stroke-dasharray` / `stroke-opacity` that encode its state proves
  more about the requirement than a bounding box does. (2) *Check the fixture makes the curve
  interesting before blaming the component*: a chart test whose data flatlines is not exercising
  the comparison it claims to, and it will pass or fail for reasons unrelated to the feature.
  Not tagged as a guardrail: whether a given series can legitimately be flat is a property of the
  data the test builds, several call frames from the assertion, and no regex over a line can see it.
