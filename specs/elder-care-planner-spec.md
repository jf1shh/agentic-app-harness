# Project Specification: Elder Care Cost Planner

> **Status:** V1 IMPLEMENTED — `projects/elder-care-planner`, passing
> `node scripts/test-app.mjs elder-care-planner`.
> **Revision 7** — local persistence wired up (§4.1): the form state is the stored artifact, with
> a disclosed save, an erase control, and an explicit notice when a payload cannot be read.
> **Revision 6** — the contribution ledger (§6.6) is built and on screen, with its own derivation.
> **Revision 5** — adds §6.10 Calculation transparency ("show the working"): every displayed
> figure is traceable to a derivation the reader can check by hand.
> **Revision 4** — scope from user research (§2); binding non-goals (§1.1); sensitivity,
> questions-to-ask and neutral-voice summary built. Region: US-only. Cost data: cited national
> medians + per-facility override; state-level figures deliberately not shipped (see §7).

## 1. Product Overview

**Name:** Elder Care Cost Planner (working title: "CareCost")

**Description:** A private, offline-first planner that answers the question families actually
face when a parent needs care: *"What will this really cost, how long can we afford it, and who
pays for what?"* It models the **all-in** cost of care (not the advertised base rate), projects
how long savings last against inflating costs, finds the break-even point between in-home and
residential care, screens which public benefits realistically apply, and splits the shortfall
fairly across siblings — with a ledger of what each has actually paid.

**Target Audience:** Adult children (typically 45–65) coordinating care for a parent, usually
across siblings and usually under acute time pressure after a fall, a diagnosis, or a hospital
discharge. Secondary: older adults planning their own care.

**Explicitly not:** medical, legal, tax, or financial advice. This is an estimator. Every output
carries its assumptions, and the app names the points where a professional is required
(Medicaid planning, elder law, tax filing).

### 1.1 Non-goals (binding)
These are product commitments, not deferred features. Reversing any of them requires revising
this spec, because each one is load-bearing for the app's usefulness — not merely a preference.

- **No referral revenue, ever.** No facility directory, no "get matched with communities," no
  lead capture, no affiliate or referral fees. Nearly every senior-care cost calculator on the
  web is lead generation, and families know it. The moment this app has a financial interest in
  which option a family picks, its cost comparisons stop being believable — including the honest
  ones.
- **No account, no email field, no analytics, no user data over the network.** See §1.2.
- **No point estimates where a range is the honest answer.** See §5.3.
- **No eligibility determinations** for Medicaid, VA, or tax positions. The app informs and
  refers out (§6.8, §6.9).

### 1.2 Trust is a functional requirement, not a privacy nicety
Input quality is the binding constraint on every number this app produces. A family that does not
trust the tool enters approximate or fake figures, and a runway computed from fake figures is
*worse* than no runway — it carries the authority of arithmetic without the substance. Local-only
storage is therefore what makes the product work at all, and it must be **demonstrable rather
than asserted**: no account, no email field, no network request carrying user data, and a
plain-language "your data never leaves this device" disclosure that tells a skeptical user how to
verify the claim themselves (offline use, DevTools network tab).

---

## 2. Research: what families actually need

Scope for V1 was set by research into caregiver forums, AARP/industry surveys, and existing
tools rather than by intuition. Six findings drove the design, and each maps to a feature.

### 2.1 The advertised price is not the price → **All-In Cost Engine** (§6.1)
Only 18% of families seeking senior living feel they understand the costs, and nearly a third
report paying **more than expected** after moving in. The gap is structural, not accidental:

| Cost component | Typical magnitude | Usually advertised? |
|---|---|---|
| Base rent | the headline number | ✅ yes |
| Care-level tier (reassessed as needs change) | **+$500–$2,000/mo per level** | ❌ no |
| Community / move-in fee (non-refundable) | **$1,000–$5,000 one-time** | ❌ no |
| Medication management, incontinence supplies, transport | à la carte | ❌ no |
| Annual rate escalator | **3–5%/yr** | ❌ no |

One documented family's real cost reached ~$7,200/mo — **44% over the base rate they budgeted
for**. A calculator that multiplies a median by 12 reproduces exactly the error that puts
families into debt. This is the single strongest differentiator in the app.

### 2.2 Care arrives in ~60 days, not "next year" → **60-Second Triage first** (§5.1)
77% of caregivers who haven't started planning expect months or more than a year of lead time;
**69% actually secure care within 60 days.** More than half say they wish they'd started sooner.
Users arrive in crisis, often on a phone, often in a hospital corridor. The app must produce a
usable answer from **five inputs in under a minute**, with refinement strictly optional. A
20-field wizard would be abandoned by exactly the people who need it most.

### 2.3 "Home or facility?" is the decision → **Break-Even Analyzer** (§6.2)
The dominant question is in-home vs. residential, and it has a real, computable answer: in-home
care is cheaper below roughly **40 hours/week** of paid help and more expensive above it, where
accumulated hourly fees pass a facility's flat rate. The national crossover sits near 40–44
hrs/wk but moves substantially with state rates, and most published comparisons omit the costs
of staying home (utilities, groceries, maintenance, transport, home modifications). The app
computes the crossover from *the user's own* numbers, both sides fully loaded.

### 2.4 Money is the #1 source of sibling conflict → **Split + Ledger** (§6.6)
76% of family caregivers report not receiving consistent help from family, and 78% report
out-of-pocket expenses averaging **$7,242/year**. Guidance is consistent: the fight is rarely
about whether Mom needs help, it is about who pays. Two capabilities follow:
- A **fair-split calculator** with equal / income-proportional / custom methods, so the
  conversation starts from arithmetic instead of resentment.
- A **contribution ledger** — who actually paid what, and who contributed hours or coordination.
  Non-cash contribution is first-class: the recommended framing is that a sibling who cannot pay
  can contribute time, coordination, or a specific task, and the lead caregiver's time *is* their
  contribution.

### 2.5 Caregiving costs the caregiver → **Opportunity Cost + Contributor Affordability** (§6.7)
Family caregivers spend more than a quarter of their annual income on caregiving, and roughly
40% cut back or leave their jobs. About 60% of people supporting parents take on debt — 13% take
on **$25,000 or more**. So the projection cannot stop at the parent's assets: it must show when
*contributors* start funding care from debt, and what a caregiver's reduced work costs over a
lifetime.

### 2.6 Delay forfeits benefits → **Benefit Reality Check with timing** (§6.8)
Rushed decisions cause liquidation of assets and **delayed or missed access to Medicaid, VA, and
LTC insurance benefits**. The failure is usually about *timing* — Medicaid's 5-year lookback,
LTC elimination periods, VA application lead times. The screener therefore surfaces deadlines and
lookbacks, not just eligibility.

### 2.7 Competitive landscape
Adjacent tools exist and each covers one slice: cost-comparison calculators
(payingforseniorcare.com, CareScout), sibling-split apps (CareSplit), generic expense trackers.
None joins **all-in cost → runway → break-even → split → ledger** in one place, and the paid
tools require accounts and hold family financial data on their servers. The wedge is the
combination plus **local-only, no-account privacy**.

---

## 3. Core Features

### V1 (scope set by §2)
- [x] **60-Second Triage** — five inputs (state, care type, parent's monthly income, liquid
      assets, number of contributors) → immediate all-in cost, runway, and shortfall. Every
      later feature is optional refinement of this result.
- [x] **All-In Cost Engine** — base rate + care-level tier + à la carte fees + one-time move-in
      fee + annual escalator. Displays **"Advertised base" vs "Realistic all-in"** side by side
      with the delta called out.
- [x] **Break-Even Analyzer** — the paid-hours-per-week crossover between in-home and
      residential care, both sides fully loaded (in-home includes housing carry costs).
- [x] **Funding & Runway Engine** — month-by-month depletion with care inflation, income COLA,
      asset returns, and expiring LTC benefit periods. Outputs months-to-depletion plus the
      month contributors begin funding from income or debt.
- [x] **Scenario Comparison** — up to 4 scenarios on all-in monthly cost, runway, and 5-year total.
- [x] **Benefit Reality Check** — Medicare (leading with what it does *not* cover), Medicaid
      (spend-down, 5-year lookback, spousal impoverishment protections), VA Aid & Attendance,
      and LTC insurance — each with its timing trap surfaced.
- [x] **Family Cost-Sharing Split** — equal / income-proportional / custom, with cash, hours, and
      task ownership all treated as contributions.
- [x] **Contribution Ledger** — log what was actually paid, by whom, in what category; reconcile
      actual vs. pledged; feeds the tax estimate.
- [x] **Caregiver Opportunity Cost** — lost net wages, lost employer retirement match, and a
      qualitative Social Security flag for reduced work years.
- [x] **Tax Estimate** — unreimbursed medical expenses above 7.5% of AGI, with a
      multiple-support flag when siblings split support.
- [x] **"Questions to ask before you sign"** — a scenario-specific checklist that turns the §2.1
      hidden-fee findings into leverage at the moment of negotiation, plus a parallel list for an
      elder law attorney consultation.
- [x] **"What would change this answer"** — sensitivity ranking that re-runs the projection with
      each input perturbed and orders them by impact on runway.
- [x] **Show the working** — every headline figure carries a question-mark control that opens a
      derivation panel: the formula, each input with its source, the arithmetic line by line, the
      assumptions applied and the caveats. A permanent methodology section repeats all of them on
      the page for anyone who wants to read the whole method at once (§6.10).
- [x] **Family Meeting Summary** — one printable page in a neutral third-party voice:
      recommendation, numbers, assumptions, split.
- [x] **Local-only persistence + export/import** — `localStorage`, no account, no network calls
      for user data; JSON export/import Zod-validated at the boundary.
- [x] **Accessibility-first UI** — WCAG 2.1 AA, large-type mode, plain language, full keyboard use.

### Deferred to V2 (documented, not built)
- [ ] Medicaid eligibility modeling with state-specific asset limits (see §9.4 — deliberate).
- [ ] Shared family link (encrypted URL-fragment payload) so siblings see one live plan.
- [ ] Care-hours scheduler across family members.
- [ ] Reverse mortgage / home-sale proceeds modeling.
- [ ] Receipt photo capture attached to ledger entries.
- [ ] **Independent Living Community Comparison (`independent_living` care type + `BuyInContract`).** When a scenario's `careType` is `independent_living` and it carries a `facilityFees.buyInContract`, the app overlays the option — alongside up to three sibling IL scenarios — on a single asset-depletion chart, with year-boundary annotations for the buy-in's refund schedule (`tenureMonths → refundPercent`). All four options share the same `Plan` income, assets, and assumptions so the comparison is genuine. A buy-in whose `entryCents > liquidAssetsCents` is **hard-blocked** with an on-screen explainer that names the shortfall to the cent and tells the family to either reduce the option's `entryCents`, raise liquid assets, or remove the option. Engine lives at `engine/buyin.ts` (`resolveRefundAtTenure`, `buyInAffordability`, `projectILVariants`). Derivation panels must sum their parts to the cent (see §6 lesson "Format a Total and Its Parts at the Same Precision").

---

## 4. Architecture & Tech Stack

- **Frontend:** Next.js (App Router), `output: 'export'` — matches `travel-packing-app` and
  `smart-recipe-app`.
- **Styling:** Vanilla CSS, consistent with sibling apps. No Tailwind.
- **Backend/API:** None. All computation is client-side and synchronous.
- **Database:** `localStorage`, namespaced keys, Zod-validated on read. See §4.1 for what is
  stored and why it is not a `Plan`.
- **Deployment:** GitHub Pages at `/agentic-app-harness/elder-care-planner` via
  `deploy-pages.yml`; `basePath` applied only when `isProd`.
- **Container:** Web only — **no Capacitor**, so the `capacitor-absolute-base` guardrail does not
  apply and an absolute prod `basePath` is correct here.
- **Dependencies:** `next`, `react`, `react-dom`, `zod` only. No charting library — the runway
  chart is hand-rolled inline SVG, keeping the bundle small and every chart paired with an
  equivalent data table for a11y.

### 4.1 What persists, and why it is the form state rather than a Plan

**Two Zod contracts, deliberately.** `PlanSchema` is the domain model the engines consume and the
format export/import speaks. `PlannerStateSchema` is what the browser stores.

Storing a `Plan` was the first design and it loses data. `buildPlan()` is a one-way projection:
`monthsElapsed` and `compareHoursPerWeek` have no home in `Plan` at all, and `housingCarry` is
only written when the care type is hourly. Losing `monthsElapsed` silently would rewrite every
figure in the ledger reconciliation on reload — a worse outcome than not persisting, because the
family is not told. So the storage contract is the form state, and it is validated on read like
any other untrusted input (`.agents/AGENTS.md` §1).

Rules this surface must hold to:

- **Nothing is read from storage during render.** The page is a static export; reading
  `localStorage` while rendering produces server markup that disagrees with the first client
  render. Restore happens in a mount effect, and the app exposes `data-planready` once it has
  finished so tests can wait for it rather than racing it.
- **Writes are debounced, and flushed on `pagehide`/`visibilitychange`.** Debouncing alone loses
  the last few hundred milliseconds of typing when someone closes the tab or backgrounds a phone,
  with no indication it happened.
- **A payload that fails the contract is reported, not silently discarded.** `absent` (a first
  visit) and `invalid` (corrupt, hand-edited, or written by a future version) are distinguished,
  and the second one puts a notice on screen. A family that typed thirty ledger entries is told
  they are gone rather than left to notice their figures quietly reverted.
- **Storing the data is disclosed, and erasable in one action.** §1.2 makes trust a functional
  requirement, and an app that quietly keeps a parent's finances on a shared computer has broken
  it. The privacy note states what is kept and where, and a confirmed "forget everything on this
  device" control clears every key the app owns.
- **The version lives in the key** (`elder-care-planner:state:v1`), so a future schema reads a
  different key and an old payload is ignored rather than half-migrated.

### Module layout
```
src/
  lib/
    schemas.ts              # all Zod schemas + inferred types (single contract source)
    data/costOfCare.ts      # cited national + state cost dataset
    data/feeStructures.ts   # cited typical tier/community-fee/escalator ranges
    data/benefits.ts        # cited benefit thresholds + timing rules
    data/questionsToAsk.ts  # scenario-keyed negotiation + attorney checklists
    engine/cost.ts          # scenario -> all-in monthly cost breakdown
    engine/breakeven.ts     # in-home vs residential crossover hours
    engine/runway.ts        # cost + income + assets -> depletion projection
    engine/sensitivity.ts   # which input moves the runway most
    engine/split.ts         # shortfall -> per-contributor contributions
    engine/ledger.ts        # actual contributions -> reconciliation vs pledged
    engine/opportunity.ts   # caregiver work reduction -> lifetime cost
    engine/tax.ts           # medical-expense deduction estimate
    explain/                # engine output -> checkable derivations (§6.10)
    storage.ts              # localStorage boundary, Zod-validated
  app/                      # routes
  components/               # presentational components
```

Every `engine/*` module is a **pure function** — no React, no storage, no ambient `Date.now()`.
That is what makes 100% Vitest coverage of the math achievable.

---

## 5. UI/UX Design System

### 5.1 Triage-first information architecture
Driven by §2.2. The landing route **is** the calculator, not a marketing page:

1. **Triage (5 fields)** → answer rendered immediately below the fold-line.
2. **"Make this more accurate"** → progressive disclosure into fee detail, ancillary costs,
   benefits, split, ledger. Every section is skippable and the result updates live.
3. No account gate, no email wall, no onboarding carousel, at any point.

The result panel always shows its confidence basis: *"Based on the state median. Add your
facility's actual quote to sharpen this."*

### 5.2 Ship the decision, not the spreadsheet
A projection is not an answer. Every results view leads with a plain-language recommendation, the
reasoning behind it, and what to do next — with the table underneath for anyone who wants it.

> **Calculator (not sufficient):** "Assisted living: $6,840/mo. Runway: 74 months."
>
> **Required:** "A facility is about $900/month cheaper than your current 45 hrs/week of home
> care. Your mother's savings cover it for roughly 6–8 years. The number that moves that range
> most is care-level escalation, not investment returns — so get the tier schedule in writing
> before you sign."

### 5.3 Ranges, not false precision
"$847,392 over 6.2 years" is a lie told to two decimal places, and when reality diverges the user
stops believing the parts that *were* sound. Care escalation is genuinely unpredictable, so:

- Runway is presented as a **band** (e.g. "roughly 6–8 years") with the point estimate available
  underneath, never as a bare single number.
- Every headline figure names the assumption driving its uncertainty, sourced from §6.4.
- Being visibly honest about what is uncertain is what earns belief in what is not.

### 5.4 Neutral third-party voice
Money is the leading source of sibling conflict (§2.4). When the **app** says "an equal split is
$1,180 each," it is not the sister saying it — and that reframing does real social work at the
family meeting. The Family Meeting Summary is therefore written in a neutral, non-accusatory,
third-party register: no second person, no "you should," no implied judgment about who is
contributing enough. All assumptions are printed on the page so siblings argue with the **inputs**
rather than with each other. This is an editorial constraint, and it is reviewable — copy that
addresses or characterises a family member fails review.

### 5.5 Visual system
- **Color Palette:** Calm, non-clinical, high contrast. Primary `#1e5f4f` (deep teal),
  Secondary `#9a3412` (amber-800) for warnings, Background `#f8faf9`, Text `#111827`.
  All pairs verified ≥ 4.5:1 — per the a11y lesson in `.agents/AGENTS.md` §6, bright 500/600
  shades against white fail axe and must not be used.
- **Typography:** Inter. Base **17px** — users are often older adults or reading on a phone under
  stress. A "Larger text" toggle scales the root to 20px.
- **Layout:** All grids use `repeat(auto-fit, minmax(min(280px, 100%), 1fr))`; never a fixed
  inline `gridTemplateColumns` (`responsive-grid` guardrail).
- **Viewport:** `width=device-width, initial-scale=1.0, viewport-fit=cover`; never
  `user-scalable=no` (`viewport-no-zoom` guardrail).
- **Tone:** Plain language. "How long the money lasts," not "asset depletion horizon." Numbers
  always paired with the assumption that produced them.
- **Micro-interactions:** No animation on results — this is a stressful context; numbers should
  appear, not perform. `prefers-reduced-motion` respected throughout.
- **Print:** Dedicated print stylesheet for the Family Meeting Summary.

---

## 6. Core Logic (the part that must be right)

### 6.1 All-In Cost Engine (`engine/cost.ts`)
```
advertisedMonthly = base rate (state median for careType, or user's quoted price)

allInMonthly = advertisedMonthly
             + careLevelTierCents            (0 if none selected)
             + Σ recurring add-on fees        (med management, supplies, transport, ...)
             + Σ ancillary monthly            (medications, dental/vision/hearing, ...)
             + Σ ancillary annual / 12

firstMonthTotal = allInMonthly + communityFeeCents + Σ one-time costs
```
The UI must display `advertisedMonthly`, `allInMonthly`, and the **percentage delta** between
them. In later projection years the base rate and tier grow at `annualEscalatorRate` (default
4%, within the researched 3–5% band), which compounds separately from general inflation.

**Must be unit-tested:** advertised-vs-all-in delta; community fee appearing only in month 1;
a care-level increase applied at a chosen future month; escalator compounding across year
boundaries; user override replacing the median entirely.

### 6.2 Break-Even Analyzer (`engine/breakeven.ts`)
Solve for the paid hours per week `h` at which fully-loaded in-home cost equals fully-loaded
residential cost:

```
inHomeMonthly(h)  = h * hourlyRate * 52/12
                  + housingCarryCents      // mortgage/rent, utilities, taxes, insurance,
                                           // groceries, maintenance, transport
                  + amortized home modifications
                  + in-home ancillary

residentialMonthly = allInMonthly (per §6.1)   // room and board included

breakEvenHours = (residentialMonthly - inHomeFixedCosts) / (hourlyRate * 52/12)
```
Output: crossover hours/week, which option is cheaper at the user's current hours, and the
monthly difference. The UI must state plainly that cost is one input among several and that
safety, supervision needs, and social isolation are not modeled.

**Must be unit-tested:** the national ~40 hrs/wk result reproduces from national medians;
crossover moves correctly when the state hourly rate changes; residential cheaper than in-home
fixed costs alone yields a crossover of 0 (handled, not a negative number); 24/7 care (168 hrs)
never reports in-home as cheaper when it isn't.

### 6.3 Runway projection (`engine/runway.ts`)
Month-by-month simulation over `projectionYears`:
```
for each month m:
  careCost(m)   = allInMonthly grown by annualEscalatorRate at each year boundary
  ancillary(m)  = monthly + annual/12 + one-time in their month, at generalInflationRate
  income(m)     = Σ sources active at m, each grown by colaRate annually,
                  LTC benefits stopping at endsAfterMonths and starting after eliminationDays
  shortfall(m)  = max(0, careCost(m) + ancillary(m) - income(m))
  liquidAssets  = liquidAssets * (1 + annualReturnRate/12) - shortfall(m)
  if liquidAssets <= 0 -> depletionMonth = m; contributors fund from here
```
Outputs: `depletionMonth | null`, `yearlyBreakdown[]`, `firstYearMonthlyShortfallCents`,
`totalOutOfPocketCents`, and `contributorBurdenStartMonth`. A `null` depletion means income
covers cost — the app must say "your parent's income covers this indefinitely," not render an
empty chart.

Per §2.5, when the projected per-contributor amount exceeds a contributor's stated monthly
capacity, the result flags **"this plan requires borrowing from month N"** rather than silently
showing an unaffordable number.

**Must be unit-tested:** income exceeds cost (no depletion); zero assets (depletes month 1); LTC
elimination period delaying benefit start; LTC benefit period expiring mid-projection; one-time
community fee in month 1; negative investment return; home equity excluded unless `liquid: true`;
contributor burden flag firing at the right month.

### 6.4 Sensitivity — "what would change this answer" (`engine/sensitivity.ts`)
Re-runs §6.3 with one input perturbed at a time, holding the rest fixed, and ranks inputs by the
resulting change in `depletionMonth`:

```
for each lever in [careEscalatorRate, careLevelTier, hoursPerWeek, assetReturnRate,
                   incomeColaRate, oneTimeCosts, ancillaryTotal]:
  low  = runway(plan with lever at its low-plausible bound)
  high = runway(plan with lever at its high-plausible bound)
  impactMonths = |low.depletionMonth - high.depletionMonth|
rank descending by impactMonths
```

Output: an ordered list of `{ lever, impactMonths, direction, plainLanguageLabel }`, plus the
runway **band** consumed by §5.3. Perturbation bounds come from the cited ranges in §2.1 (e.g.
escalator 3–5%), never from invented volatility.

The intent is pedagogical as much as analytical: showing that a care-level bump outweighs a market
downturn teaches something durable that survives the user closing the tab.

**Must be unit-tested:** ranking is stable and deterministic; a lever with no effect on a given
plan ranks last rather than being omitted; a plan with no depletion (income covers cost) yields a
defined result rather than `NaN`; bounds are read from the cited data, not hardcoded at call sites.

### 6.5 Questions to ask before you sign (`data/questionsToAsk.ts`)
Static, scenario-keyed checklists — no computation, minimal build cost, and plausibly the most
directly useful screen in the app. §2.1 established that families are blindsided by fee structures
they did not know to ask about; modeling those costs helps, but arming the user at the moment of
negotiation helps more.

Keyed by `careType`, and for residential care including at minimum:
- What triggers a care-level reassessment, and who decides?
- May I see the full care-level tier schedule in writing?
- What were your actual rate increases in each of the last three years?
- Is the community fee refundable if we leave within 30 / 60 / 90 days?
- Which services are included in the base rate, and which are billed separately?
- Is there a coordination or monitoring fee if we bring in an outside aide or therapist?
- What happens if my parent's needs exceed what this community can provide?

A parallel `attorney` list covers the referred-out territory (§6.8): Medicaid lookback exposure,
spousal impoverishment protections, powers of attorney, existing asset transfers. Framing this as
*what to ask a professional* is deliberately more helpful — and far safer — than a wrong
eligibility answer.

Each list is printable and included in the Family Meeting Summary.

### 6.5b Buy-in & refund engine (`engine/buyin.ts`)

An Independent Living (IL) community contract can take three shapes a family commonly compares side-by-side:

| Option | Entry fee (`entryCents`) | Refund schedule | Monthly service rate |
|---|---|---|---|
| **A** — entry with refund schedule | community-set, e.g. $400 000 | `[{12m,80%}, {36m,60%}, {60m,30%}, {84m,0%}]` (decreasing) | typically lowest |
| **B** — entry, no refund | smaller, e.g. $200 000 | `amortized: true`, refundSchedule empty | typically mid |
| **C** — rental only | 0 | no refund | typically highest |

The engine treats all three identically: buy-in enters the existing runway through `RunwayInput.oneTimeCents` (so assets are drawn down in month one, the same path the existing one-time `communityFeeCents` already takes). Putting the entry fee on a separate accounting path would **double-count** the month-one draw; that is explicitly rejected. Refund value is *not* routed through `IncomeSource` — refund is a one-time asset inflow at exit, not an income stream, and routing it through income would mis-apply COLA and LTC elimination rules.

#### 6.5b.1 `resolveRefundAtTenure(contract, tenureMonths) → number`

```ts
if (contract.amortized) return 0;
if (contract.refundSchedule.length === 0) return 0;
// refundSchedule must be applied as the LARGEST-tenure entry whose tenureMonths
// is ≤ the family's current tenure. Same-precision discipline: cents.
return Math.floor(contract.entryCents * maxApplicableRefundPercent / 100);
```

Tie-breaker rule (deterministic): the schedule is sorted ascending by `tenureMonths`. The applicable row is the last entry where `tenureMonths ≥ entry.tenureMonths`; below the first row, refund is 0; at or beyond the last row, refund is the last row's `refundPercent`.

Hand-computed fixture: contract `{entryCents: 40_000_000, refundSchedule: [{12m,80},{36m,60},{60m,30},{84m,0}]}` at tenure `37 months` → 60% of 40 000 000 cents = 24 000 000 cents = $240 000.

#### 6.5b.2 `buyInAffordability(liquidAssetsCents, contract)`

`affordable := liquidAssetsCents >= contract.entryCents`. `shortfallCents := max(0, entryCents − liquidAssetsCents)`. Both `affordable === false` and an explicit `shortfallCents` are surfaced to the UI; the family is hard-blocked from selecting the option until they reduce the entry, raise liquid assets, or remove the option. There is no "soft" path — if the family cannot pay the entry on day one, the runway already shows the family what month their other liquid runs out; choosing an IL option they can't even afford misframes the decision.

#### 6.5b.3 `projectILVariants(plan, scenarios[]) → projections[]`

Returns one row per IL scenario, designed for the overlay chart in the dedicated IL tab:

```ts
{
  scenarioId, label,
  buyInEntryCents,
  allInMonthlyCents,
  isAffordable,           // reusing buyInAffordability
  refundAtExitByYearCents: number[],   // hypothetical — exit at end of each projection year
  assetsEndByYearCents:   number[],   // existing runway output, untouched
}
```

The chart shows one line per option (`assetsEndByYearCents`) on a shared x-axis (years 1..`projectionYears`). Refund-at-exit is **not** added to the runway's `totalOutOfPocketCents` — a refund is hypothetical until exit actually happens. The refund row in the derivation is a separate, optional panel and is clearly labelled as a what-if.

**Total-and-parts invariant (this section explicitly defers to §6 "Format a Total and Its Parts at the Same Precision"):** the chart's per-option net cost at month `m` for option `i` is `(sum of monthlyRecurring[m,i]) + buyInEntryCents[i] − cumulativeRefundLiabilityByMonth(m, i)`, formatted at identical precision and summing exactly in the derivation panel. Mismatch is asserted in the unit tests by parsing the rendered strings (not the engine output) per the existing test discipline.

### 6.6 Split + Ledger (`engine/split.ts`, `engine/ledger.ts`)
Split methods:
- `equal` — shortfall ÷ contributors.
- `income_proportional` — share = shortfall × (their income ÷ total income). Falls back to equal
  if any income is missing, and says so explicitly.
- `custom` — explicit pledges, surfacing any unfunded remainder.

Rounding uses the **largest-remainder method** so parts always sum exactly to the shortfall.
**This must be unit-tested** — a split that loses a cent is exactly what a family notices.

Non-cash contribution (§2.4) is first-class: unpaid care hours are valued at the local home-aide
rate and displayed beside cash, as is task ownership (coordination, appointments, finances). It
is **displayed, never silently netted** against a cash share — how to weigh time against money is
a family decision, not the app's.

The ledger reconciles **pledged vs. actually paid** per contributor per month, producing a
running balance and a per-category total that feeds §6.9.

**Ledger UI.** Entry is deliberately minimal per §10.5 — who paid, when, how much, what for, an
optional note, and a tick for "may count toward medical expenses". No receipts, no recurring
entries. Two rules the surface must hold to:

- **Months elapsed is an input, not the clock.** The reconciliation multiplies each share by the
  months of care paid for so far, and that figure is entered by the family. Reading it from
  `Date.now()` would make the engine impure (§4), make the reconciliation untestable, and quietly
  change a family's numbers between one visit and the next.
- **Entries outlive the contributor list.** Reducing the number of people sharing the cost must
  not delete their logged payments — the money was still spent, and deleting the record of it is
  not the app's decision. Orphaned entries stay in the total, are labelled as belonging to
  someone no longer listed, and appear as their own line in the derivation so the total still
  visibly adds up.

### 6.7 Caregiver opportunity cost (`engine/opportunity.ts`)
```
lostGrossWages = salary * (hoursReduced / 40) * years
lostNetWages   = lostGrossWages * (1 - marginalTaxRate)
lostMatch      = lostGrossWages * employerMatchRate
```
Plus a **qualitative** flag — not a dollar figure — when reduced work years would plausibly
affect the 35-year Social Security earnings average, linking to SSA's own calculator. The app
must not fabricate a benefit-reduction number: that calculation needs a full earnings history the
app does not have.

### 6.8 Benefit Reality Check (`data/benefits.ts`)
Rule-based, informational, and explicitly **not** an eligibility determination. Each card leads
with its timing trap (§2.6):
- **Medicare** — covers up to 100 days of skilled nursing after a qualifying hospital stay, with
  a daily copay after day 20. It does **not** cover long-term custodial care in assisted living
  or a nursing home. Shown first and prominently: this is the most expensive misconception in the
  domain.
- **Medicaid** — pays for nursing home care after spend-down; income and asset limits are
  state-specific, with a **5-year lookback** on transfers, and **spousal impoverishment rules**
  that protect a community spouse from spending down everything. V1 surfaces the lookback clock
  and links to the state agency; it does not model eligibility.
- **VA Aid & Attendance** — pension supplement for wartime veterans and surviving spouses needing
  help with daily activities; screener checks service era, care need, and income/asset thresholds
  against cited MAPR figures, and notes typical application lead time.
- **LTC insurance** — modeled as income with a daily benefit cap, **elimination period** (delayed
  start) and benefit period (`endsAfterMonths`).

Every card cites its source and the date its figures were checked.

### 6.9 Tax estimate (`engine/tax.ts`)
Unreimbursed medical expenses above 7.5% of AGI may be deductible when itemizing, and qualifying
long-term care costs can count when care follows a plan of care for a chronically ill person. The
engine estimates the deductible amount from ledger categories and flags the multiple-support
situation when siblings split support. Labeled an estimate, with a clear "confirm with a tax
professional."

### 6.10 Calculation transparency — "show the working" (`explain/`)

A family is being asked to make an irreversible financial decision on the strength of numbers
this app produced. §5.3 already forbids false precision and §6.4 already names the top driver,
but both stop short of the thing that actually earns trust: **letting the reader check the
arithmetic**. An unexplained projection is indistinguishable from a guess with a nice font, and
the families who most need this tool are the ones least able to take it on faith.

Every figure the app displays must therefore be traceable to a derivation the reader can follow
and reproduce with a calculator.

**Contract.** `src/lib/explain/` is a pure module that turns engine *output* into a structured
derivation. It must **never re-implement the arithmetic** — every value in an explanation is read
from the engine result or the engine's own inputs. A parallel calculation would drift from the
engine silently, which is worse than no explanation at all, and the unit tests assert
correspondence in both directions.

```typescript
interface ExplainStep {
  label: string;            // "Care-level surcharge"
  workingOut?: string;      // "$35.00 × 40 hours × 52 weeks ÷ 12 months"
  valueCents?: number;
  valueText?: string;       // for hours, months, percentages
  kind: 'reference' | 'input' | 'add' | 'subtract' | 'result' | 'note';
}

interface Explanation {
  id: ExplanationId;
  title: string;
  question: string;         // the accessible name of the "?" control
  plainLanguage: string;    // what this number means, in one paragraph, no jargon
  formula: string;          // the general form, before any numbers
  steps: ExplainStep[];     // the same formula with this family's numbers in it
  assumptions: string[];    // every rate and default actually applied
  sources: string[];        // provenance, survey year, retrieval date, confidence
  caveats: string[];        // what this figure does not include or cannot know
}
```

Explanations required in V1, one per displayed headline figure: `base-rate`, `all-in`,
`first-month`, `monthly-gap`, `runway`, `break-even`, `split`, `ledger`, `sensitivity`.

**A figure on screen without a derivation is a defect.** When a further engine gains a UI
(caregiver opportunity cost, the tax estimate), it gains an `ExplanationId` in the same change —
an app where some numbers can be checked and the ones beside them cannot is worse than one that
never offered the panels.

**Arithmetic integrity rule.** Within one explanation, the signed sum of every `add`/`subtract`
step must equal the `result` step exactly, in cents — and the rendered strings must show it,
which means derivation tables format parts and totals at identical precision (the
total-and-parts lesson in `.agents/AGENTS.md` §6). A derivation whose displayed parts do not add
to its displayed total is a defect of the same severity as a wrong number: it is the reader doing
the check the panel invited them to do, and finding the app wrong. Where a floor applies (the
funding gap cannot go below zero) the clamp is shown as an explicit step, never as a silent
discrepancy.

**Presentation.** A small question-mark control sits beside each headline figure; activating it
opens a side panel containing that figure's explanation. The panel is a modal dialog with a
proper accessible name, closes on `Escape`, traps and restores focus, and is fully operable by
keyboard. Because a control that must be *discovered* is not transparency, the same explanations
also render unconditionally in a permanent "How every number is worked out" section, so the whole
method is readable in one pass and reachable by search-in-page. That section is excluded from
print so the Family Meeting Summary stays one page (§5.4, AC 13).

**Voice.** Explanations follow the §5.4 neutral register — no second person. The reader may be
looking at these numbers *because* a sibling sent them, and the method has to read as the tool's,
not as an argument.

---

## 7. Data Models

All models are runtime Zod schemas with types inferred via `z.infer<>` (`.agents/AGENTS.md` §1).
Money is stored as **integer cents** to avoid float drift; rates are decimals (`0.04` = 4%).

### 7.1 Buy-in contract (`BuyInContractSchema`)

A community can publish an **entry fee with a refund schedule** — Independent Living and Continuing Care Retirement Community (CCRC) contracts publish these in this exact shape. The schema is **optional** on `FacilityFeesSchema`: a scenario with no `buyInContract` behaves exactly as it does today, so adding this field is strictly backwards-compatible — every existing stored plan keeps parsing against `v1` (`elder-care-planner:state:v1`) without a migration.

```ts
export const BuyInContractSchema = z.object({
  // Upfront entry fee, paid in month 1 (community fee and ancillary one-times too).
  entryCents: z.number().int().min(0).default(0),
  // true => no refund; the entry is amortized into the monthly rate.
  amortized: z.boolean().default(false),
  // Schedule must be sorted ascending by tenureMonths. Below the first bracket,
  // refund is 0. Refund is stored as percent so a community that amends its
  // entry fee doesn't silently invalidate the schedule.
  refundSchedule: z.array(z.object({
    tenureMonths: z.number().int().min(0),
    refundPercent: z.number().min(0).max(100),
  })).default([]),
  // Base monthly service rate for this community contract. Fed into the
  // existing all-in engine as another recurring line item; monthlyServiceCentsRate
  // exists so IL scenarios don't have to rely solely on `costOverrideCents`.
  monthlyServiceCentsRate: z.number().int().min(0).default(0),
});
export type BuyInContract = z.infer<typeof BuyInContractSchema>;
```

`CareTypeSchema` gains one member: `'independent_living'`. `RESIDENTIAL_CARE_TYPES` includes it so the existing break-even math (`engine/breakeven.ts`) and the §3 scenario-comparison feature pick it up automatically. Existing scenarios with `careType ∈ {assisted_living, memory_care, nursing_home_semi, nursing_home_private, family_provided, in_home_homemaker, in_home_health_aide, adult_day_care}` keep parsing against the v1 storage key without modification.

### 7.2 Existing Zod contract source

```typescript
import { z } from 'zod';

export const CareTypeSchema = z.enum([
  'in_home_homemaker',    // non-medical: cooking, cleaning, errands
  'in_home_health_aide',  // hands-on personal care
  'adult_day_care',
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
  'family_provided',      // unpaid family care — cost is opportunity cost, not fees
]);

// §2.1 — the fee structure that makes advertised != actual.
export const FacilityFeesSchema = z.object({
  communityFeeCents: z.number().int().min(0).default(0),      // one-time, non-refundable
  careLevelTierCents: z.number().int().min(0).default(0),     // current tier surcharge
  careLevelIncreaseAtMonth: z.number().int().min(1).optional(),
  careLevelIncreaseCents: z.number().int().min(0).optional(),
  annualEscalatorRate: z.number().min(0).max(0.2).default(0.04), // researched 3-5% band
  addOns: z.array(z.object({
    id: z.string().uuid(),
    label: z.string().min(1).max(80),
    kind: z.enum([
      'medication_management', 'incontinence_supplies', 'transport',
      'outside_caregiver_coordination', 'second_person', 'other',
    ]),
    monthlyCents: z.number().int().min(0),
  })).default([]),
});

// §2.3 — the costs of staying home, which most comparisons omit.
export const HousingCarryCostSchema = z.object({
  mortgageOrRentCents: z.number().int().min(0).default(0),
  utilitiesCents: z.number().int().min(0).default(0),
  propertyTaxMonthlyCents: z.number().int().min(0).default(0),
  insuranceMonthlyCents: z.number().int().min(0).default(0),
  groceriesCents: z.number().int().min(0).default(0),
  maintenanceMonthlyCents: z.number().int().min(0).default(0),
  transportCents: z.number().int().min(0).default(0),
});

export const AncillaryExpenseSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  category: z.enum([
    'medication', 'supplies', 'transport', 'dental_vision_hearing',
    'home_modification', 'legal', 'respite', 'other',
  ]),
  amountCents: z.number().int().min(0),
  cadence: z.enum(['monthly', 'annual', 'one_time']),
  taxDeductibleCandidate: z.boolean().default(false),  // feeds §6.9
});

export const CareScenarioSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  careType: CareTypeSchema,
  stateCode: z.string().length(2),
  hoursPerWeek: z.number().min(0).max(168).optional(),  // hourly care types
  daysPerMonth: z.number().min(0).max(31).optional(),   // adult day care
  costOverrideCents: z.number().int().min(0).optional(), // a real quote beats a median
  fees: FacilityFeesSchema.optional(),                   // residential care
  housingCarry: HousingCarryCostSchema.optional(),       // in-home / family-provided care
  startDate: z.string().date(),
  ancillary: z.array(AncillaryExpenseSchema).default([]),
});

export const IncomeSourceSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  kind: z.enum([
    'social_security', 'pension', 'annuity', 'rental',
    'va_aid_attendance', 'ltc_insurance', 'other',
  ]),
  monthlyCents: z.number().int().min(0),
  colaRate: z.number().min(0).max(0.2).default(0),
  eliminationPeriodDays: z.number().int().min(0).default(0), // LTC policies
  endsAfterMonths: z.number().int().min(0).optional(),       // LTC benefit period
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  kind: z.enum(['cash', 'brokerage', 'retirement', 'home_equity', 'other']),
  balanceCents: z.number().int().min(0),
  annualReturnRate: z.number().min(-0.5).max(0.5).default(0.04),
  liquid: z.boolean().default(true),   // home equity excluded from runway unless sold
});

export const ContributorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),     // a label; the UI discourages full legal names
  annualIncomeCents: z.number().int().min(0).optional(),   // income-proportional split
  monthlyPledgeCents: z.number().int().min(0).optional(),  // custom split
  monthlyCapacityCents: z.number().int().min(0).optional(), // §2.5 debt-risk flag
  providesUnpaidHoursPerWeek: z.number().min(0).max(168).default(0),
  ownsTasks: z.array(z.enum([
    'care_coordination', 'medical_appointments', 'finances',
    'household', 'transport', 'advocacy',
  ])).default([]),
});

// §2.4 — actual vs pledged.
export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid(),
  date: z.string().date(),
  amountCents: z.number().int().min(0),
  category: AncillaryExpenseSchema.shape.category,
  note: z.string().max(200).optional(),
  taxDeductibleCandidate: z.boolean().default(false),
});

export const CaregiverImpactSchema = z.object({
  contributorId: z.string().uuid(),
  currentAnnualSalaryCents: z.number().int().min(0),
  hoursReducedPerWeek: z.number().min(0).max(60),
  employerMatchRate: z.number().min(0).max(0.25).default(0.04),
  yearsOfReducedWork: z.number().min(0).max(40),
  marginalTaxRate: z.number().min(0).max(0.6).default(0.22),
});

export const AssumptionsSchema = z.object({
  careInflationRate: z.number().min(0).max(0.2).default(0.045),
  generalInflationRate: z.number().min(0).max(0.2).default(0.03),
  projectionYears: z.number().int().min(1).max(30).default(10),
  splitMethod: z.enum(['equal', 'income_proportional', 'custom']).default('equal'),
});

export const PlanSchema = z.object({
  schemaVersion: z.literal(1),
  careRecipientLabel: z.string().min(1).max(80).default('Mom'), // a label, never full PII
  scenarios: z.array(CareScenarioSchema).max(4),
  activeScenarioId: z.string().uuid().optional(),
  income: z.array(IncomeSourceSchema).default([]),
  assets: z.array(AssetSchema).default([]),
  contributors: z.array(ContributorSchema).default([]),
  ledger: z.array(LedgerEntrySchema).default([]),
  caregiverImpacts: z.array(CaregiverImpactSchema).default([]),
  assumptions: AssumptionsSchema,
  updatedAt: z.string().datetime(),
});
```

### Cost dataset contract
`src/lib/data/costOfCare.ts` must carry provenance inline — a number without a source is not
shippable:

```typescript
export interface CostOfCareEntry {
  careType: CareType;
  stateCode: string;            // 'US' for the national median
  medianMonthlyCents: number;   // residential care
  medianHourlyCents?: number;   // hourly care types
  medianDailyCents?: number;    // adult day care
}

export const COST_DATA_SOURCE = {
  name: '',            // MUST be the actual cited survey
  surveyYear: 0,       // MUST be the actual survey year
  retrievedOn: '',     // ISO date the figures were transcribed
  url: '',
} as const;
```

The UI displays source name, survey year, and retrieval date wherever a median is used.
**Implementation rule:** figures are transcribed from the cited source and verified at build
time — no invented or interpolated numbers. Where a state figure is unavailable, fall back to the
national median and label it as such in the UI. `data/feeStructures.ts` carries the same
provenance block for the tier / community-fee / escalator ranges in §2.1, which are presented as
**typical ranges to check against a real contract**, never as quoted prices.

---

## 8. Testing & Compliance

- **Unit Tests (Vitest):** 100% coverage of `src/lib/engine/**` and `schemas.ts`. Every scenario
  in BDD form: `describe('Given ...')` → `it('When ... Then ...')`. All edge cases listed in
  §6.1–§6.6 are required cases, not suggestions.
- **Externally-verified golden fixtures (required).** The runway (§6.3) and break-even (§6.2)
  engines are tested against fixtures **hand-computed by a human and checked into the repo with
  their working shown**, not against output captured from the implementation. Self-consistent math
  that is wrong is precisely how a tool like this causes financial harm, and a snapshot test of
  our own output cannot detect it. A golden fixture whose expected values were generated by the
  code under test fails review.
- **E2E (Playwright), BDD-named `*.spec.ts`:**
  - Triage completes in 5 fields and renders a runway (§2.2).
  - Adding fees moves "all-in" above "advertised" and the delta is displayed (§2.1).
  - Break-even reports a crossover and flips recommendation as hours cross it (§2.3).
  - A shortfall splits three ways and the parts sum exactly to the shortfall (§2.4).
  - The sensitivity panel names a top driver and the runway renders as a band (§5.3, §6.4).
  - The scenario-specific "questions to ask" list renders and prints (§6.5).
  - Export then re-import a plan and get byte-identical numbers.
  - Figures and a logged ledger entry survive a reload; erasing removes them and they stay gone;
    a corrupt stored payload produces a visible notice rather than a silent reset (§4.1).
  - The Medicare "does not cover custodial care" copy is visible on the results screen (§2.6).
  - Each headline figure's "?" control opens its derivation, the derivation's parts sum to its
    stated total as *rendered*, `Escape` closes the panel and focus returns to the control (§6.10).
  - A payment is logged, appears in the ledger with a running total, moves the reconciliation, and
    can be removed again; "expected by now" equals the displayed share × the displayed months (§6.6).
- **Non-goal enforcement (§1.1):** an automated test asserts the built bundle contains no
  analytics or telemetry endpoints, and that no form field collects an email address or account
  credential. A Playwright run with all outbound requests blocked must still complete the full
  triage → results → summary flow, proving the local-only claim rather than asserting it.
- **A11y:** `@axe-core/playwright` on every route, zero violations, including in large-type mode
  and at 200% browser zoom.
- **Production bundle smoke test:** an E2E spec that loads the **built** export via
  `scripts/serve-dist.mjs` on its own port and fails on any response ≥ 400, per the "test the
  artifact you ship" lesson. Proven by mutation before it counts as done.
- **Security & Privacy:** No network calls carrying user data. No analytics. No PII in logs. The
  care recipient and contributors are free-text *labels*; the UI states that full legal names,
  SSNs, and account numbers should not be entered, and no field invites them.
- **Optimization:** Lighthouse > 90 across the board.
- **Cleanup:** `npm run clean` in the build script, matching sibling apps.

---

## 9. Acceptance Criteria (V1)

1. **Triage:** a user reaches an all-in cost, a runway, and a per-sibling number from five inputs
   in under 60 seconds, with no account and no network request carrying their data.
2. **All-in honesty:** the results screen shows advertised base, realistic all-in, and the
   percentage delta; a scenario with typical tier + add-on fees produces a materially higher
   number than the base rate alone.
3. **Break-even:** given national median inputs, the analyzer reproduces a crossover in the
   researched 40–44 hrs/wk band, and the crossover shifts correctly with state hourly rates.
4. **Runway correctness:** projections match hand-computed fixtures for every edge case in §6.3,
   proven by Vitest.
5. **Split integrity:** contributions sum exactly to the shortfall, to the cent, under all three
   methods, proven by Vitest.
6. **Provenance:** every displayed cost figure is traceable to a cited source with survey year and
   retrieval date visible in the UI, and every scenario supports a real-quote override.
7. **Benefit truth:** the app states unambiguously that Medicare does not pay for long-term
   custodial care, on the results screen — not buried in a help page — and surfaces the Medicaid
   5-year lookback.
8. **Debt guard:** when required contributions exceed a contributor's stated capacity, the plan
   flags the month borrowing would begin.
9. **Sensitivity:** every recommendation names its top driver, and the ranking is deterministic
   and defined even for plans that never deplete.
10. **Negotiation leverage:** each residential scenario produces its "questions to ask before you
    sign" checklist, and it prints with the summary.
11. **Checkable arithmetic:** every headline figure has a derivation reachable from beside it,
    stating its formula, its inputs with their sources, its assumptions and its caveats; the
    displayed parts sum exactly to the displayed total; and no value in a derivation is computed
    anywhere but the engine (§6.10).
12. `node scripts/test-app.mjs elder-care-planner` passes: security, lint, type-check, Vitest,
    Playwright + axe.
13. `node scripts/harness-status.mjs --gate` reports no new guardrail violations.
14. The Family Meeting Summary prints to one readable page with all assumptions listed.
15. The app is fully operable by keyboard and at 200% zoom, with zero axe violations.

### 9.1 Behavioural gates (judgement, not automation)
Passing the test suite does not establish that the app helps anyone. These four are assessed by a
human before V1 ships, and a failure blocks release as surely as a red test:

1. **The 60-second test.** Someone who has never seen the app reaches a usable answer in under a
   minute, on a phone, without assistance.
2. **The no-false-precision test.** No screen presents a point estimate where a range is the
   honest answer (§5.3).
3. **The top-driver test.** Every recommendation names what would most change it (§6.4).
4. **The sibling test.** A user would be willing to send the Family Meeting Summary to their
   brother unedited — meaning the neutral-voice constraint in §5.4 actually held.

---

## 10. Open Questions / Unresolved Architecture

1. **Cost dataset licensing** *(blocking implementation)*. Industry cost-of-care surveys are
   published publicly, but attribution terms must be confirmed before figures are committed. If
   attribution proves insufficient, fall back to public government sources (state ombudsman rate
   reports, CMS data) plus the user-quote path, and adjust §7's provenance block accordingly.
2. **Fee-range provenance.** The tier / community-fee / escalator ranges in §2.1 come from
   consumer-guidance journalism rather than a single primary dataset. They must ship as clearly
   labeled *typical ranges for checking a contract*, with per-range citations — never as
   authoritative prices. Confirm this framing is acceptable.
3. **Home equity.** V1 excludes home equity from runway unless explicitly marked liquid. Full
   reverse-mortgage and home-sale modeling is deferred to V2.
4. **Medicaid modeling.** Deliberately deferred. Spend-down rules are state-specific and getting
   them subtly wrong causes real financial harm. V1 informs, surfaces the lookback clock, and
   refers out to an elder law attorney.
5. **Ledger scope creep.** The contribution ledger (§6.6) edges toward being an expense-tracking
   app. V1 keeps it deliberately minimal — amount, date, category, who paid — with receipts and
   recurring entries deferred. Confirm that boundary.
