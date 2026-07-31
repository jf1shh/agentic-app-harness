# Elder Care Cost Planner

What care really costs, how long the money lasts, and how a family can share it. A private, offline-first planner that takes five inputs and produces an answer in under a minute, then refines with fee detail, break-even analysis, benefit timing, and a sibling contribution ledger. Nothing is sent over the network. There is no account.

> Spec: [`specs/elder-care-planner-spec.md`](../../specs/elder-care-planner-spec.md) — the single source of truth (currently rev 10).
>
> Live: <https://jf1shh.github.io/agentic-app-harness/elder-care-planner/>

---

## What the app actually does

### Triage-first information architecture
Landing route **is** the calculator, not a marketing page. Five fields (state, care type, monthly income, savings available, number of contributors) → instant all-in cost, runway, and per-sibling shortfall. Everything below is optional refinement.

The triage card and the results card are always open; **every section after them is a collapsed
disclosure** (`CollapsibleCard`), with a sticky **"On this page"** jump bar in between (spec §5.1a).
Three things about that are load-bearing rather than cosmetic:

- **A closed section still states its figure.** Each one renders a status line read off the same
  engine output the open panel renders — `Equally — 3 sharing $3,540 a month`, `4 logged, $1,200
  paid — $340 behind`, `Using a quoted $7,200 a month`. It is derived, never recomputed.
- **Two status lines inherit an editorial constraint.** The shortlist counts communities and
  **must not rank them** (§11.2 declines to name a best one on purpose); the benefits section
  carries **the Medicare correction itself**, because putting the domain's most expensive
  misconception behind a click is exactly the help-article treatment that panel exists to avoid.
- **Printing does not depend on what is open.** `lib/printExpansion.ts` opens every printable
  section on `beforeprint` and synchronously around the in-app print button, then restores only
  the ones it opened. There is no CSS that reliably reveals a closed `<details>`, so this is
  behaviour, and `e2e/printing.spec.ts` proves it rather than assuming it.

There is **no tab bar**, deliberately: tabs would hide the consequence of an edit (raising a fee has
to visibly move the runway), put the Family Meeting Summary behind a control the print stylesheet
cannot see, and require the `role="tablist"` handling whose failure mode is already recorded in
`.agents/AGENTS.md` §6.

### Ten pure-function engines (`src/lib/engine/**`)
| Module | What it computes |
|---|---|
| `cost.ts` | All-in monthly cost: base rate + care-level tier + add-on fees + annual escalator; advertised vs. realistic side by side |
| `breakeven.ts` | In-home vs. residential hourly crossover, both sides fully loaded |
| `runway.ts` | Month-by-month depletion with care inflation, income COLA, asset returns, expiring LTC benefits |
| `sensitivity.ts` | Which input moves the runway most — ranks levers by `impactMonths` |
| `split.ts` | Largest-remainder split so parts always sum exactly to the shortfall, under all three methods |
| `ledger.ts` | Pledged-vs-paid reconciliation; per-category totals feeding the tax estimate |
| `opportunity.ts` | Caregiver lost wages, lost employer match, qualitative Social Security flag |
| `tax.ts` | Medical-expense deduction estimate above 7.5% AGI |
| `buyin.ts` | Independent living buy-in contracts: refund at a given tenure, entry-fee affordability, and the per-option overlay projection |
| `fit.ts` | Facility shortlist: weighted scores across eight tour dimensions, the exclusions behind them, and what pricing the plan at a community would cost in months of runway |

Engines are pure — no React, no storage, no ambient `Date.now()` — so 100% Vitest coverage of the math is achievable.

### Facility shortlist and tour notes (`components/FacilityPanel.tsx`, spec §11.2)
A family tours four to six communities in a fortnight, under time pressure, and by the end cannot
reconstruct which one had the staff they liked. Each visit is written up here — eight dimensions
(community, food, activities, apartment, staff, location, upkeep, and the overall feeling) scored
out of five, with notes, quoted figures and photographs — and weighted by what this particular
family cares about.

Three things make it more than a notes app:

- **Adopting a community re-prices the whole plan.** Its quoted monthly rate, tier and move-in fee
  are written into the active scenario, so the all-in engine, runway, break-even and split all
  re-run against a real quote instead of a survey median. The panel states the trade before
  anything is committed to: *"Oakmont's quoted rate is $900/month above the plan's current figure,
  which shortens the projection by about 14 months."*
- **Nothing is ranked and nothing is named best.** Communities stay in the order they were entered.
  Cost is computed; a feeling about a dining room is not, and blending them into a single verdict
  would make both harder to argue with.
- **An unassessed dimension is excluded, not scored zero**, and the panel names which ones were
  left out and why — separately for "nobody assessed it" and "this family said it doesn't matter".

This is **not** a facility directory (see the binding non-goals below). Nothing is searched,
fetched, or supplied by any community or referral service; every entry is one somebody walked into.

Photographs live in **IndexedDB, in a store the plan payload does not share**, downscaled to
1280px JPEG and capped at 6 per community / 40 overall. That separation is load-bearing rather than
tidy: `localStorage` holds ~5MB per origin, so a base64 photo stored beside the plan raises
`QuotaExceededError` on the *plan* write, and a family loses their ledger because they attached a
picture of a dining room.

### Independent living comparison (`components/ILComparisonPanel.tsx`)
Independent living contracts come in three shapes — a large entry fee that is partly refundable on
a schedule shrinking with tenure, a smaller non-refundable entry fee, or no entry fee and a higher
monthly rate — and which is cheapest depends entirely on how long the stay lasts. Up to three are
drawn against each other on one asset-depletion chart over the whole projection, sharing the plan's
income, assets and assumptions so the comparison is genuine.

The chart draws **two** series per option, because one would mislead. The solid line is savings
still available to spend. The shaded band above it is what would be refunded on leaving that month
— so the band collapses as the refund ladder steps down. Without it the option with the *best*
refund terms draws the *lowest* line, since the refund is never netted into the depletion curve
(it cannot be spent while the stay continues). An option whose entry fee exceeds liquid assets is
drawn faded with its shortfall named to the cent rather than hidden, because that figure is only
actionable next to the comparison.

Month resolution is not cosmetic: annual sampling puts five points on a five-year line, which
cannot show where two options cross and can imply a crossing that never happened.

### Calculation transparency (`src/lib/explain/**`)
Every headline figure carries a question-mark control that opens a derivation panel: the formula, each input with its source, the arithmetic line by line, the assumptions applied, and the caveats. `explain/build.ts` reads **engine output**, never recomputes — a parallel implementation would drift, and a confidently wrong derivation is worse than none.

### Cited data (`src/lib/data/**`)
- `costOfCare.ts` — national median cost figures (CareScout / Genworth 2025 Cost of Care Survey).
- `feeStructures.ts` — typical community / tier / escalator ranges.
- `benefits.ts` — Medicare, Medicaid (5-year lookback, spousal protections), VA Aid & Attendance, LTC insurance.
- `questionsToAsk.ts` — scenario-keyed negotiation + elder-law-attorney checklists.
- `expenseCategories.ts` — plain-language names for ledger categories.
- `startingGuide.ts` — where to look and how to tour (spec §11.13). Every named organisation carries
  a **funding label**, and anything paid by the providers it recommends must carry a note naming the
  conflict — a sweep in the unit tests fails if one is added without it. The most prominent
  directories in this field earn a commission when a family moves in; listing them as neutral
  guidance would be the same laundering the confidence tags exist to prevent, applied to advice.

Every entry carries a confidence level (`verified`, `needs_verification`, `derived`) and the UI
surfaces it inline. A figure **derived from** a cited one carries its own tag rather than inheriting
its row's — the §11.10 hourly band is a computed spread around a single published rate, and says so.

### Which dollars a figure is in (`src/lib/dollarBasis.ts`, spec §11.9)
The runway and independent-living charts compound the care escalator and the income COLA, so they are
drawn in the **dollars of each future month**. The break-even comparison has no time dimension at all
— one month at current rates — so it is in **today's dollars**. Both now say which, from one
definition that the chart labels and the §6.10 derivation `assumptions` both read, because two copies
of that sentence drift the first time one is edited.

## Non-goals (binding — see spec §1.1)

- **No referral revenue, ever.** No facility directory, no "get matched," no lead capture, no affiliate fees.
- **No account, no email field, no analytics, no user data over the network.**
- **No point estimates where a range is the honest answer.**
- **No eligibility determinations** for Medicaid, VA, or tax positions. The app informs and refers out.

## Architecture

```
src/
  app/page.tsx, layout.tsx, globals.css
  components/
    Inputs.tsx, ResultsPanel.tsx, RefineCostPanel.tsx,
    BreakEvenPanel.tsx, RunwayChart.tsx, SplitPanel.tsx,
    LedgerPanel.tsx, BenefitsPanel.tsx, QuestionsPanel.tsx,
    FacilityPanel.tsx, FacilityPhotos.tsx,
    SummaryPanel.tsx, MethodologyPanel.tsx,
    ExplainProvider.tsx, ExplainDrawer.tsx, ExplanationBody.tsx, WhyButton.tsx
  lib/
    schemas.ts                       # Zod contracts + inferred types
    engine/{breakeven,buyin,cost,fit,ledger,opportunity,plan,runway,sensitivity,split,tax}.ts
    explain/{build,types}.ts         # engine output → derivations
    data/{costOfCare,benefits,expenseCategories,feeStructures,questionsToAsk}.ts
    plannerState.ts                  # form-state → Plan projection
    recommendation.ts                # neutral-voice summary copy
    storage.ts                       # localStorage boundary, Zod-validated
    photos.ts                        # IndexedDB boundary for tour photos — kept
                                     # apart from the plan so a photo quota
                                     # failure can never fail a plan write
    format.ts                        # money + percentage formatters
```

Next.js App Router, `output: 'export'`, vanilla CSS. **No charting library** — the runway chart is inline SVG paired with an equivalent data table, so the bundle stays small and every chart has an accessible narrative.

## Persistence

`localStorage`, validated against the contract-first Zod schemas on every read.

Three intentional decisions:

- **The stored artifact is the form state, not a `Plan`.** `buildPlan()` drops `monthsElapsed`, `compareHoursPerWeek`, and (for hourly care) the housing carry cost, so persisting it would silently rewrite the ledger reconciliation on reload.
- **Writes are debounced and flushed on `pagehide`/`visibilitychange`.** A pure debounce loses the last edit when the tab closes or a phone is backgrounded.
- **A payload that fails the contract is reported, not silently discarded.** `absent` (first visit) and `invalid` (corrupt / hand-edited / schema mismatch) are distinguished and the second puts a notice on screen.

A confirmed **"Forget everything on this device"** control clears every key the app owns **and
empties the IndexedDB photo store** — a separate store needs a separate erase, or the promise is
broken on exactly the shared computer it was made for. Nothing else leaves the browser.

## Accessibility

WCAG 2.1 AA, zero axe violations. 17px base type with a larger-text toggle (scales the root to 20px) for users reading on a phone in a hospital corridor. All colour pairs verified ≥ 4.5:1. No animation on results — the context is stressful; numbers should appear, not perform.

Since the sections collapse, **axe runs against the expanded page as well as the collapsed one**,
and so does the 200% zoom overflow check. A collapsed page has almost none of its controls in the
accessibility tree, so auditing only the default view would have quietly stopped covering every
table, select and form the suite was written for.

## Testing

```bash
# Authoritative harness gate from the repo root:
node scripts/test-app.mjs elder-care-planner     # security + lint + tsc + Vitest + Playwright + a11y

# Per-domain shortcuts:
npm test           # Vitest unit
npx playwright test   # E2E + axe a11y
```

Coverage bullets (per projectData.ts and the per-file Vitest suite):

- **437 unit tests** (Vitest) on engines, storage, and every derivation; BDD-formatted.
- **E2E specs** including axe on the default view, the large-text view, the fully-expanded view, with a derivation panel open, and with the ledger in use; 200% zoom overflow check; production-bundle smoke test.
- **Printing is tested as behaviour, not assumed from CSS** (`e2e/printing.spec.ts`): the app's
  print button, the browser's `beforeprint`, and the print stylesheet are each exercised
  separately, because a collapsed `<details>` prints collapsed and no stylesheet reliably says
  otherwise. Mutation-verified — making `openForPrint` a no-op fails three of those specs.
- **Golden fixtures are hand-computed by a human.** Values captured from the implementation would only prove the code agrees with itself.
- **Derivations are checked as rendered, not as computed** — the parts shown must sum to the total shown; assertions parse the formatted strings.
- **Persistence is proved by reloading.**
- **Photo isolation is proved by measuring**, not by reading the code: the spec records the stored
  plan's length before and after an attachment, asserts it grew by an id rather than an image, and
  then reloads to confirm the photo survived.
- **E2E specs wait for hydration before their first interaction** (`document.documentElement.dataset.planready`), because a `fill()` that lands before React attaches is silently reverted.
- **Privacy is proved, not asserted:** a spec blocks every outbound request and runs the full triage → refinement → split → summary flow to completion.

For the latest counts, run `node scripts/test-app.mjs elder-care-planner` from the repo root.

## Status

V1 complete, plus the independent living comparison (spec §6.5b), the facility shortlist
(spec §11.2), and the §11.8–§11.13 batch: dollar-basis labels on every chart, year labels and a
depletion marker on the comparison chart, a live headline sentence on the break-even panel,
itemised home-running costs entered by the family, and the "Where to start looking" guide. The ledger is on screen and the plan persists between visits. JSON export/import is built in `storage.ts` but the surface is operating-budget-only; richer export UI is on the V2 backlog. Deferred to V2 and documented in the spec: Medicaid eligibility modelling (deliberate — state-specific rules that cause real harm when subtly wrong), a shared encrypted family link, a care-hours scheduler, reverse-mortgage modelling.

`independent_living` is deliberately absent from the triage care-type picker: it is priced from a
community contract rather than a survey median, and the comparison panel is the only place such a
contract can be entered. Offering it in triage would produce a $0-a-month scenario with no way to
correct it.
