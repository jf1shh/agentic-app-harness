# Agent Handoff — Elder Care Cost Planner

**State:** V1 complete and green, plus the Independent Living comparison (spec §6.5b).
`node scripts/test-app.mjs elder-care-planner` passes all checks (security advisory-only, lint,
type-check, 206 Vitest, 58 Playwright + axe).

**Spec:** [`specs/elder-care-planner-spec.md`](../../specs/elder-care-planner-spec.md) — revision 5,
marked V1 IMPLEMENTED (revision 6 added the ledger UI, revision 7 local persistence). Read §2 (research) before changing scope; the feature set is derived from it,
not from intuition.

---

## What was built

Triage-first single-page planner. Five fields produce an all-in cost, a funding runway, a sensitivity
ranking and a per-sibling share; everything else is optional refinement. Nine pure engines under
`src/lib/engine/`, a Zod contract in `src/lib/schemas.ts`, and cited datasets under `src/lib/data/`.

**Independent Living comparison (spec §6.5b, added in revision 8).** Up to three buy-in contracts
compared on one asset-depletion chart. `engine/buyin.ts` is pure math (refund at tenure,
affordability, per-option projection); `components/ILComparisonPanel.tsx` holds the editable option
cards and `components/ILOverlayChart.tsx` draws the overlay.

Three things here are load-bearing and easy to undo by accident:

1. **The refund band is not decoration.** The refund is never netted into the depletion line
   (it cannot be spent while the stay continues), so the option with the *best* refund terms draws
   the *lowest* line. The shaded band above each line is the refund at that month, and it must not
   become optional, collapsed-by-default, or toggle-hidden — without it the chart misrepresents
   the exact comparison it exists for. An E2E spec fails if the band disappears.
2. **`independent_living` is deliberately out of `SELECTABLE_CARE_TYPES`.** IL is priced from a
   contract, not a survey median, and this panel is the only place a contract can be entered.
   Adding it to the triage picker produces a $0-a-month scenario a family cannot correct.
3. **`RunwayResult.yearlyBreakdown` is now the monthly series sampled, not a second
   accumulation.** Both read one `assetsEndCents` per month. Re-splitting them would let the chart
   and the table disagree about the same instant; `runway.test.ts` asserts they cannot.

**Local persistence (spec §4.1, added in revision 7).** Everything typed is saved to
`localStorage` and restored on the next visit, with a disclosed privacy note and a confirmed
"forget everything on this device" control. The stored artifact is `PlannerStateSchema`, **not**
`PlanSchema` — `buildPlan()` drops `monthsElapsed`, `compareHoursPerWeek` and the residential
housing carry, and losing `monthsElapsed` would silently rewrite the ledger reconciliation.
Writes are debounced and flushed on `pagehide`/`visibilitychange`. An unreadable payload puts a
notice on screen instead of resetting silently.

**Contribution ledger UI (spec §6.6, added in revision 6).** `LedgerPanel` logs who paid, when,
how much and what for, reconciles each person against their agreed share over the months entered,
totals spend by category, and sums the entries ticked as possible medical expenses. Two decisions
that look like bugs but are not: months elapsed is an *input*, never `Date.now()` (keeps the engine
pure and stops a family's numbers drifting between visits), and entries logged against someone who
is later removed from the contributor list are **kept**, labelled, and still counted in the total.

**Calculation transparency (spec §6.10, added in revision 5).** Every headline figure carries a
question-mark control that opens its derivation in a side panel — formula, inputs with sources,
arithmetic line by line, assumptions applied, and what the figure cannot account for. The same
derivations render in full in a permanent "How every number is worked out" section, excluded from
print so the Family Meeting Summary stays one page. Eight derivations: `base-rate`, `all-in`,
`first-month`, `monthly-gap`, `runway`, `break-even`, `split`, `ledger`, `sensitivity`.

Registered in the CI matrix (`.github/workflows/ci.yml`), the Pages deploy
(`.github/workflows/deploy-pages.yml`, step 6), and the portfolio hub
(`projects/portfolio-hub/src/data/projectsData.ts` — this required extending the category enum in
`projects/portfolio-hub/src/schemas.ts` with `'Family Finance'`).

Ports: dev `3011`, production bundle `5189` root / `5190` under the Pages subpath.

## Open items, in priority order

1. **Cost dataset licensing (blocks a public launch, not the build).** `COST_DATA_SOURCE.licensingConfirmed`
   in `src/lib/data/costOfCare.ts` is `false`. The CareScout/Genworth figures are publicly reported,
   but redistribution terms have not been confirmed. If attribution proves insufficient, fall back to
   public government sources (state ombudsman rate reports, CMS) plus the user-quote path, and update
   the provenance block. Spec §10.1.

2. **Two figures need primary-source verification.** Both are flagged in the data and surfaced in the
   UI, so they are honest — but they should be replaced:
   - `adult_day_care` monthly (`confidence: 'needs_verification'`) came from a secondary summary. The
     primary sources 403'd on fetch during the build session; retrieve the published survey PDF.
   - `memory_care` (`confidence: 'derived'`) is assisted living + 25%, because memory care is not a
     surveyed category. Replace with a real figure or keep it explicitly derived.

3. **State-level cost figures are deliberately absent.** `STATE_MEDIANS` is an empty array and every
   state resolves to the national median with a labelled fallback. This is intentional — the spec
   forbids interpolating figures. Transcribing and verifying real state data is the single highest-value
   improvement available, and `resolveCost()` already supports it with no other code changes.

4. **Caregiver opportunity cost and the tax estimate are still engine-only.** `engine/opportunity.ts`
   and `engine/tax.ts` are fully implemented and unit-tested but have no UI. `PlanSchema` already
   carries `caregiverImpacts`, and the ledger now supplies `deductibleCandidateCents` for the tax
   estimate to work from. Each needs an `Explanation` builder in the same change that gives it a
   UI — spec §6.10 makes that binding, and `ExplanationId` in `explain/types.ts` is where it goes.

5. **JSON export/import has no UI.** `exportPlanJson` and `parsePlanJson` are implemented and
   unit-tested, and spec §3 lists export/import as a V1 feature. Persistence now covers "the plan
   is still here tomorrow"; export still covers "send it to my brother" and "keep a backup before
   the browser clears its storage", which local-only storage cannot. This is the natural next
   piece, and `Plan` is already the right shape for it.

6. **V2, explicitly deferred in the spec** (these are the 5 unchecked spec items the harness reports as
   drift — that finding is expected, not a defect): Medicaid eligibility modelling, encrypted shared
   family link, care-hours scheduler, reverse-mortgage modelling, receipt capture.

## Things to not undo

- **The stored artifact is the form state, not a `Plan`** — see the persistence note above. Moving
  storage onto `PlanSchema` would look tidier and would silently drop three real inputs.

- **The `pagehide`/`visibilitychange` flush beside the debounced save.** Removing it does not fail
  any assertion about the store being called; it fails only when a real reload follows a real
  edit, which is why the E2E specs reload rather than inspecting `localStorage`.

- **E2E specs go through `gotoPlanner()` in `e2e/support.ts`**, which waits for `data-planready`.
  That marker proves both hydration and the restore have finished. A `fill()` before either is
  silently swallowed or overwritten, and the failure surfaces somewhere else entirely.

- **`src/lib/explain/` restates engine output; it never recomputes it.** Every cents figure in a
  derivation is read from a `CostBreakdown`, `RunwayResult`, `BreakEvenResult` or `SplitResult`. A
  second implementation of the same formula would pass review and then drift the first time an
  engine changed, and a confidently wrong derivation is worse than none — the app would be caught
  out by the very transparency it offered. `build.test.ts` asserts correspondence in both
  directions, including that adding a fee moves the derivation by exactly that fee.

- **The parts of a derivation must sum to its total *as rendered*.** `isBalanced()` in
  `explain/types.ts` is the invariant; the E2E spec parses the formatted strings off the page
  rather than reading the engine, because a figure can be correct to the cent and still display a
  table that visibly does not add up. Where a value is clamped — the funding gap cannot go below
  zero — the clamp is an explicit step. Removing it makes the arithmetic fail to balance in exactly
  the case where the reader is least expecting an error. Both properties are mutation-verified.

- **The non-goals in spec §1.1 are binding**, not preferences. No facility directory, no lead capture,
  no referral revenue, no accounts, no analytics. `e2e/privacy.spec.ts` enforces the network and
  form-field parts mechanically; the referral ban is a human commitment. A tool with a financial
  interest in which option a family picks cannot make believable cost comparisons — that is the whole
  wedge against the incumbents.

- **Golden fixtures are hand-computed, with the arithmetic in the comments.** Do not regenerate them
  from the implementation. A fixture captured from the code under test proves only self-consistency,
  which is precisely how a financial planner quietly harms someone. Mutation-verified: shifting the
  depletion month by one fails six tests.

- **The neutral-voice rule in `recommendation.ts`** is enforced by a unit test (`/\byou(r|rs)?\b/i`
  must not match) and an E2E test on the summary. When the app states the split, it is not the sister
  stating it — that reframing is doing real work at a family meeting.

- **`formatCentsPrecise` in the split tables.** Whole-dollar rounding made the displayed shares fail to
  sum to the displayed total. See the lesson added to `.agents/AGENTS.md` §6.

- **Medicare copy stays on the results page**, not behind a disclosure. Assuming Medicare covers
  long-term custodial care is the most expensive misconception in this domain.

## Verify before pushing

```bash
node scripts/test-app.mjs elder-care-planner
node scripts/harness-status.mjs --gate
node scripts/harness-learn.mjs
```
