# A Sweep for "Mobile Formatting Is Weird" Needs `flexWrap` Everywhere and Real Overflow Measurement, Not Eyeballing

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Sweep for "Mobile Formatting Is Weird" Needs `flexWrap` Everywhere and Real Overflow
  Measurement, Not Eyeballing**: A cross-app sweep at 320px and 375px viewports (`scrollWidth >
  clientWidth`, the same measurement `elder-care-planner`'s a11y spec already used) found the same
  root cause five separate times across `portfolio-hub` and `legal-financial-rag`: an inline
  `display: flex` row — a category filter bar, a card's badge header, a privilege-filter row, a
  search-hyperparameters row, a citation's title/score row — written with no `flexWrap: 'wrap'`
  because it never needed to wrap at desktop width. None of these were caught by the existing
  `responsive-grid` guardrail, which only pattern-matches `grid-template-columns`; an un-wrapped
  `flex` row is the same failure mode in a shape that guardrail's regex cannot see. The general fix
  is boring and repeats: add `flexWrap: 'wrap'` (and a `gap` if one was implied by margins instead)
  to every flex row holding more than one text/button/badge child that isn't already inside a
  fixed-width layout. What made this worth writing down rather than just fixing is the one bug that
  measurement-only debugging (bisecting `element.remove()`, per the lesson above) would have missed
  by inspection: `legal-financial-rag`'s `WatermarkOverlay` is `position: absolute; inset: 0` with
  `transform: rotate(-25deg)` on its text, at `opacity: 0.04` — nearly invisible, and its *layout*
  box exactly matches its parent, so nothing about reading the JSX or the rendered screenshot
  suggested a bug. But `getBoundingClientRect()` (and therefore scrollable overflow) reflects an
  element's *rendered*, post-transform bounding box, not its layout box — CSS Transforms is explicit
  that the transformed rendering is what participates in a scroll container's overflow — so the
  rotated text, wider than any narrow viewport, silently added ~40-270px of horizontal scroll no
  visual inspection would ever catch, since the content responsible is essentially invisible. The
  fix is `overflow-x: hidden` on the nearest ancestor that already establishes the absolute
  positioning context (here `.app-container`, which the watermark is already sized to fill via
  `inset: 0`), not on the watermark itself — clipping at the watermark's own box would work too but
  couples the fix to a decorative component instead of the layout boundary it's meant to respect.
  Two mechanical notes for building the regression tests. (1) *An overlap bug is not always an
  overflow bug*: `travel-packing-app`'s theme-toggle button (`position: absolute`, top-right) ran
  underneath a centered `<h1>` at narrow widths without ever making `scrollWidth` exceed
  `clientWidth` — both elements independently stayed within the viewport, they just occupied the
  same space. A `scrollWidth` assertion passed on this exact bug and had to be replaced with a
  `boundingBox()` vertical-overlap check; the wrong regression-test shape can look green on a real
  bug, so match the assertion to the actual failure mode, not to whichever check is easiest to
  write. (2) *A live E2E flow blocked reusing the existing spec as a regression baseline*:
  `travel-packing-app`'s only spec that reaches its main results page drives a real geocoding API
  call (the exact case the "live third-party API" lesson above already warns about), so it was
  already failing in this sandbox before any of these fixes — a fresh, self-contained test against
  the pre-results page was added instead of extending the blocked one. Not tagged as a guardrail:
  which flex rows need `flexWrap` is a judgement call over rendered layout, not a line-level pattern,
  and the transform-overflow mechanism in particular depends on a cross-file relationship between a
  decorative component and whichever ancestor happens to be the nearest scroll container.
