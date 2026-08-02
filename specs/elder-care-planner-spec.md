# Project Specification: Elder Care Cost Planner

> **Status:** V1 IMPLEMENTED — `projects/elder-care-planner`, passing
> `node scripts/test-app.mjs elder-care-planner`.
> **Revision 12 — §11 records one more user-supplied feature idea, adjudicated.** An NYT-style
> interactive slider (§11.10 below) is admissible against §1.1/§1.2 on inspection, *provided* the §1.1
> "no point estimates where a range is the honest answer" rule is satisfied at the UI layer rather
> than at the engine: `engine/breakeven.ts` returns a single `breakEvenHoursPerWeek` and **must not be
> changed** without a §9.2 walk of its **ten** current references (`engine/breakeven.ts` itself,
> the three consuming components `BreakEvenPanel.tsx` / `ResultsPanel.tsx` / `SummaryPanel.tsx`,
> the `plan.ts` `PlanState` builder, `lib/explain/build.ts`, `lib/recommendation.ts`, the four vitest
> specs `breakeven.test.ts` / `explain/build.test.ts` / `recommendation.test.ts` / plus the
> `app/page.tsx` binding — so the slider surfaces the *band* by calling `computeBreakEven` twice —
> at the low and high cents bounds of a **new** hourly-rate band entry added to `data/costOfCare.ts`
> (carrying the same `FigureConfidence` tags the existing `NATIONAL_MEDIANS` rows carry, so the
> cited provenance is uniform with §6) — and drawing the
> intersection as a low–high rectangle. Initial thumb position binds to
> `PlanState.currentHoursPerWeek` so the saved plan and the chart read the same number. **PROPOSED,
> NOT APPROVED, NOT BUILT** as §11.10. Implementation PRs are separate from this spec-only record.
>
> **Revision 11 — §11 records three more user-supplied feature ideas, adjudicated.** Two (a
> coarse living-cost pre-fill for the in-home / stay-at-home path; an explicit "values shown are
> in today's dollars" label on the charts) are admissible on inspection against §1.1/§1.2 — the
> math for the label is already in place, and the pre-fill satisfies Cite Confidence by being a
> range with a confidence tag rather than a single point. One (a year-axis on the comparison
> graph) is partially admissible: the data is already sampled at year boundaries
> (`assetsEndByYearCents`) and shown beside the monthly chart, and §6.5b.3 keeps monthly
> resolution in the *chart* itself — what the idea actually wants is *year-boundary labels* on
> the existing monthly chart. All three are **PROPOSED, NOT APPROVED, NOT BUILT** as §11.7, §11.8,
> and §11.9, and may not be implemented until a human approves each one. Implementation PRs are
> separate from this spec-only record.
>
> **Revision 10 — §5.1a fixes the shape of the progressive disclosure §5.1.2 has always required.**
> Everything after the results card collapses into disclosure sections with derived status lines,
> reached through a sticky "On this page" bar; there is still no tab bar, and printing no longer
> depends on what a reader happened to leave open.
>
> **Revision 9 — §11 records a batch of user-supplied feature ideas, adjudicated.** Four of the
> eight contradict the binding non-goals in §1.1/§1.2 and were rejected with reasoning (§11.1); a
> human confirmed the non-goals stand. Of the four that survive, **§11.2 (facility shortlist and
> tour notes) is APPROVED AND BUILT**; §11.3, §11.4, §11.5 and §11.6 are designed but **PROPOSED,
> NOT APPROVED, NOT BUILT** and may not be implemented until a human approves each one.
> **Revision 8** — Independent Living comparison (§6.5b) is built: three contract shapes on one
> asset-depletion chart, with the refund drawn as a band that collapses as the schedule steps down.
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
- [x] **Facility shortlist & tour notes** — up to six communities the family actually visited,
      scored across eight dimensions against weights they set, with notes, quoted figures and
      photographs; adopting one re-prices the whole plan from its quote. A notebook, never a
      directory (§11.2).
- [x] **Local-only persistence + export/import** — `localStorage`, no account, no network calls
      for user data; JSON export/import Zod-validated at the boundary.
- [x] **Accessibility-first UI** — WCAG 2.1 AA, large-type mode, plain language, full keyboard use.

### Deferred to V2 (documented, not built)
- [ ] Medicaid eligibility modeling with state-specific asset limits (see §9.4 — deliberate).
- [x] **Shared family link** (encrypted URL-fragment payload) — see §11.6.
- [ ] Care-hours scheduler across family members.
- [ ] Reverse mortgage / home-sale proceeds modeling.
- [x] **Receipt photo capture** attached to ledger entries — see §11.14.
- [x] **Independent Living Community Comparison (`independent_living` care type + `BuyInContract`).** When a scenario's `careType` is `independent_living` and it carries a `facilityFees.buyInContract`, the app overlays the option — alongside up to three sibling IL scenarios — on a single asset-depletion chart, with year-boundary annotations for the buy-in's refund schedule (`tenureMonths → refundPercent`). All four options share the same `Plan` income, assets, and assumptions so the comparison is genuine. A buy-in whose `entryCents > liquidAssetsCents` is **hard-blocked** with an on-screen explainer that names the shortfall to the cent and tells the family to either reduce the option's `entryCents`, raise liquid assets, or remove the option. Engine lives at `engine/buyin.ts` (`resolveRefundAtTenure`, `buyInAffordability`, `projectILVariants`). Derivation panels must sum their parts to the cent (see §6 lesson "Format a Total and Its Parts at the Same Precision").

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
    share.ts                # shared family link: encrypt/decrypt a Plan into a URL fragment (§11.6)
    receipts.ts             # receipt photos attached to ledger entries: IndexedDB store (§11.14)
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

### 5.1a How the progressive disclosure of §5.1.2 is actually built — **APPROVED**

§5.1.2 has always required progressive disclosure, and for several revisions the page did not
implement it: every refinement panel rendered expanded, so a family reaching the printable summary
scrolled past twelve full-height cards. This section fixes the shape that disclosure takes, so the
next panel added to the page is not a twelfth judgement call.

**Two sections never collapse.** The triage card and the results card are the answer §5.1.1 and
§5.2 promise inside a minute; hiding either behind a disclosure control would make the app a
questionnaire. Everything after the results is a `CollapsibleCard`, closed on first load.

**A closed section still has to say something.** A disclosure control labelled only "Sharing the
cost" costs a click to learn anything, which is how accordions come to be seen as a way of hiding
work rather than ordering it. Every `CollapsibleCard` therefore renders a **status line** beside
its heading, computed from the same engine output the open panel renders — `Equally — 3 sharing
$3,540 a month`, `4 logged, $1,200 paid — $340 behind`. The status line is derived, never a second
implementation of the arithmetic (§6.10 applies to it exactly as it applies to `explain/`).

A status line inherits its panel's editorial constraints, and two of them bite. The facility
shortlist (§11.2) deliberately declines to name a winner — *"none of them is marked as the best
one"* — so its status line counts what has been visited and must not rank (`3 communities visited`,
never `Oakmont leads`). The benefits panel exists to correct the single most expensive
misconception in the domain, so its status line carries **the correction itself** (`Medicare does
not pay for long-term custodial care`) rather than a count of cards; putting that behind a click
would be the help-article treatment the panel was built to avoid.

**No tab bar.** This restates and generalises the §6.5b.4 decision, which is now a page-wide rule
rather than a note about one panel. Tabs would (a) hide the consequence of an edit — the app's
central claim is that raising a fee visibly moves the runway, which fails if the fee input and the
runway live on different tabs; (b) put the Family Meeting Summary behind a control the print
stylesheet cannot see; and (c) require a `role="tablist"` / roving-tabindex implementation whose
failure mode is already recorded in `.agents/AGENTS.md` §6. `<details>`/`<summary>` is native,
keyboard-operable and printable, and is already the idiom in `BenefitsPanel`, `MethodologyPanel`
and `RefineCostPanel`.

**Navigation replaces the scroll, and is not chrome.** A sticky **"On this page"** bar lists the
sections that currently exist — conditional panels appear in it only when rendered — and
activating an entry opens that section before scrolling to it, because scrolling to a closed
section lands the reader on a control rather than on content. Scrolling honours
`prefers-reduced-motion` per §5.5.

**Printing must not depend on what happens to be open.** `.no-print` sections are irrelevant here,
but the split table, the facility shortlist and the Family Meeting Summary all print, and a
collapsed `<details>` prints collapsed. Every collapsible is therefore opened before a print and
restored afterwards — on `beforeprint`/`afterprint`, *and* synchronously around the in-app "Print
this summary" button, since a print begun from the button must not race the event. This is
behaviour, not styling, and it is asserted in E2E rather than assumed.

**Acceptance criteria (BDD).**
- *Given* a first visit, *When* the page loads, *Then* the triage and results cards are open and
  every section after them is closed.
- *Given* a closed section, *When* it is read without being opened, *Then* its status line states a
  figure that equals the one the open panel renders.
- *Given* a closed section, *When* its entry in the "On this page" bar is activated, *Then* the
  section is open and scrolled into view.
- *Given* every section is closed, *When* the page is printed, *Then* the Family Meeting Summary,
  the split table and the facility shortlist are all present in the printed output.
- *Given* the collapsed page, *When* it is audited, *Then* `@axe-core/playwright` reports no
  violations, both with sections closed and with them open.

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

`affordable := liquidAssetsCents >= contract.entryCents`. `shortfallCents := max(0, entryCents − liquidAssetsCents)`. Both `affordable === false` and an explicit `shortfallCents` are surfaced to the UI.

**Amended by §6.5b.4 (approved).** This section originally hard-blocked an unaffordable option outright. It is now shown on the comparison chart, de-emphasised, with its shortfall named to the cent — the figure is only actionable next to the comparison, and a family that can see an option is $150,000 short *and* that it overtakes the alternative in month 38 can weigh whether freeing that money is worth doing. The protection the hard block was reaching for is kept by refusing to make such an option the plan's active scenario.

#### 6.5b.3 `projectILVariants(plan, scenarios[]) → projections[]`

Returns one row per IL scenario, designed for the overlay chart in the dedicated IL tab:

```ts
{
  scenarioId, label,
  buyInEntryCents,
  allInMonthlyCents,
  isAffordable,           // reusing buyInAffordability
  refundAtExitByYearCents:  number[],  // hypothetical — exit at end of each projection year
  refundAtExitByMonthCents: number[],  // the same what-if, one point per month
  assetsEndByYearCents:     number[],  // existing runway output, untouched
  assetsEndByMonthCents:    number[],  // the depletion curve, one point per month
}
```

The chart shows one line per option (`assetsEndByMonthCents`) on a shared x-axis of months `1..projectionYears × 12`. **Month resolution is required, not cosmetic**: the question the overlay exists to answer is *where two options cross*, and annual sampling puts at most five points on a five-year line — a crossing inside a year is invisible, and the polyline can imply a crossing that never happened. `assetsEndByYearCents` is retained for tables and stays exactly the monthly series sampled at year boundaries (`RunwayResult.yearlyBreakdown[y-1].assetsEndCents === monthlyBreakdown[y*12-1].assetsEndCents`, asserted in `runway.test.ts`), so a chart and a table on the same screen can never disagree about the same instant.

Refund-at-exit is **not** added to the runway's `totalOutOfPocketCents`, and is **not** netted into the depletion line — a refund is hypothetical until exit actually happens. This has a consequence the chart must handle explicitly: Option A's line drops by its full `entryCents` at move-in and never recovers, so on the depletion curve alone the option with the *best* refund terms looks the *worst*. `refundAtExitByMonthCents` is therefore plotted as its own clearly-labelled series or annotation at the same resolution as the curve it annotates, never silently omitted. A chart showing only the depletion lines would misrepresent precisely the comparison it was built for.

**Every `independent_living` scenario is projected, including one with no `buyInContract` at all.** Option C (rental only) is commonly entered as a quoted monthly rent with no buy-in, and requiring a contract object would silently drop the baseline the other two options are measured against. Such an option reports `buyInEntryCents: 0`, an all-zero refund series, and `isAffordable: true` — the absence of a barrier, not a claim about the family's finances. Scenarios whose `careType` is not `independent_living` are skipped; rows carry `scenarioId` and callers must align on that rather than on index.

#### 6.5b.4 The Independent Living comparison (UI) — **APPROVED AND IMPLEMENTED**

> Status: approved, including the §6.5b.2 amendment below, and built —
> `src/components/ILComparisonPanel.tsx` and `src/components/ILOverlayChart.tsx`, covered by
> `e2e/independent-living.spec.ts`.
>
> Two deviations from the approved draft, both narrowing rather than extending it:
> **(1)** it is a card in the single-page flow, not a literal tab — this app has no tab bar, and
> inventing one for a single panel would sit oddly beside every other section.
> **(2)** each option takes one monthly figure (the contract's `monthlyServiceCentsRate`) rather
> than offering a choice between that and a quoted rent via `costOverrideCents`. The engine
> supports both paths, but two ways to type the same number is a worse form; a rental-only option
> is entered as an entry fee of zero.
>
> `independent_living` stays out of the triage care-type picker (`SELECTABLE_CARE_TYPES`)
> permanently. IL scenarios are owned by this panel, which is the only place a contract can be
> entered; offering IL in the triage picker would produce a $0-a-month scenario with no way to
> correct it.

**What the tab is for.** A family choosing an IL community is not comparing prices, they are
comparing *shapes of commitment*: a large refundable entry with a low monthly, a smaller
non-refundable entry with a mid monthly, or no entry at all with a high monthly. Those three
shapes cross over each other somewhere in the projection, and where they cross is the decision.
Every design rule below follows from making that crossing visible and honest.

##### Layout

A single tab holding, in vertical order on narrow screens and two columns from `768px`:

1. **Up to three option cards.** Each is one `independent_living` `CareScenario`, editable in
   place. Fields: label; entry fee (`entryCents`, 0 for rental-only); a refund ladder of
   `{tenureMonths, refundPercent}` rows, add/remove, empty for Options B and C; an
   `amortized` toggle; and the monthly figure — either `monthlyServiceCentsRate` from the
   contract or a quoted rent entered as `costOverrideCents`, never both at once.
2. **The overlay chart** (below).
3. **The comparison table**, which is also the chart's accessible equivalent (below).
4. **A derivation panel** per §6.10, reading engine output only.

Income, assets and assumptions are **not** editable here — they come from the plan and are shared
across all three options, which is what makes the comparison meaningful. The tab states that
plainly rather than leaving it to be inferred.

##### The chart: two series per option

Each option is drawn as **two** things, answering two different questions:

| Series | Source | Question it answers |
|---|---|---|
| **Solid line** — liquid assets remaining | `assetsEndByMonthCents` | "When does the money run out?" |
| **Shaded band above the line** — assets plus refund if the family left that month | line + `refundAtExitByMonthCents` | "What is this worth if it does not work out?" |

The band is the refund, so it **collapses onto the line as the ladder steps down** — an 80/60/30/0
schedule renders as four visible cliffs, which is the decay made legible without reading a table.

This treatment exists to solve a specific integrity problem stated in §6.5b.3: because the refund
is never netted into the depletion line, Option A's solid line drops by its full entry fee at
move-in and never recovers, so **on the lines alone the option with the best refund terms looks
the worst**. Drawing only the solid lines would misrepresent the exact comparison the chart was
built for. The band must not be optional, collapsed by default, or behind a toggle.

X-axis is months `1..projectionYears × 12` (§6.5b.3 — annual sampling cannot show a crossing
inside a year, and can imply one that never happened). Y-axis is cents, formatted per §5.3.

##### Unaffordable options — **amendment to §6.5b.2, APPROVED**

§6.5b.2 originally required an option whose `entryCents` exceeds liquid assets to be
**hard-blocked**, with no soft path. That rule is narrowed for the chart, as follows:

> An unaffordable option is **shown on the same axes, visually de-emphasised** (dashed line, no
> band, reduced contrast but still ≥ 4.5:1 for any text), and labelled with its shortfall to the
> cent — "$150,000 short of the entry fee." It cannot be made the plan's active scenario.

Rationale: the shortfall figure is only actionable next to the comparison. A family seeing that
Option A is $150,000 short *and* that it overtakes Option C in month 38 can weigh whether freeing
that $150,000 is worth doing — which is precisely the question §6.5b.2's hard block removes from
view. The protection §6.5b.2 wanted (a family cannot silently plan around an option they cannot
pay for) is preserved by refusing to make it active.

One consequence worth recording, found in testing: an entry fee far above the plan's savings wipes
the assets in month one, so the option's curve is flat on zero for the whole projection. That is
correct output — the line is a hairline on the axis — but it means the de-emphasis attributes,
not the rendered geometry, are what the E2E spec asserts.

##### Accessibility (binding, enforced by `@axe-core/playwright`)

- The chart carries a **text equivalent**: the comparison table lists, per option per projection
  year, assets remaining and refund-at-exit, read from `assetsEndByYearCents` and
  `refundAtExitByYearCents`. Those are the monthly series sampled at year boundaries
  (§6.5b.3), so the table cannot disagree with the curve.
- **Colour is never the sole encoder.** Options are distinguished by line style (solid / dashed /
  dotted) and a direct label at the line's end, not by hue alone.
- The chart is not a focus trap and exposes no interactive-only data: everything the hover reveals
  is also in the table.
- Palette per §5.5; every text pair ≥ 4.5:1.

##### Voice (§5.4)

No second person anywhere in this tab — including the shortfall label and any empty state. "This
option's entry fee is $150,000 above the plan's liquid assets," never "you cannot afford this."
The tab may be read by a sibling who did not build the plan.

##### Acceptance criteria (BDD, per `.agents/AGENTS.md` §5)

- *Given* three IL options sharing one plan, *When* the tab is opened, *Then* three solid lines and
  three bands are drawn on one shared month axis.
- *Given* an option with a decreasing refund ladder, *When* its band is inspected at a bracket
  boundary, *Then* the band's height equals `refundAtExitByMonthCents` at that month and steps down
  at the bracket.
- *Given* any option, *When* the comparison table is read against the chart, *Then* each year's
  table figure equals the curve's value at that year's final month.
- *Given* an option whose entry fee exceeds liquid assets, *When* the tab is rendered, *Then* it is
  drawn de-emphasised with its shortfall named to the cent, and cannot be made the active scenario.
- *Given* the tab is on screen, *When* it is audited, *Then* `@axe-core/playwright` reports no
  violations.
- *Given* the summary will be shared, *When* the tab's copy is read, *Then* it never addresses the
  reader in the second person.

##### Out of scope for this section

Default contract presets for real communities (families enter their own terms from a brochure);
Medicaid treatment of entry fees (§6.8 handles it once an option is chosen); and any resale or
re-occupancy contingency in the refund — a schedule that pays out only when the unit is re-let is
a contract term this model deliberately does not represent, and the tab says so in its caveats.

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
  // Base monthly service rate for this community contract. `baseMonthlyCents`
  // returns it as the scenario's `advertisedBaseCents`, so `allInMonthlyCents`
  // stays a plain sum of the advertised rate plus tier, add-ons and ancillary —
  // the same shape as every other care type, which is what lets the all-in
  // derivation panel state a total its parts actually reach. It is NOT a
  // separate recurring line item. A `costOverrideCents` quote still wins.
  // It exists so IL scenarios don't have to rely solely on `costOverrideCents`.
  monthlyServiceCentsRate: z.number().int().min(0).default(0),
});
export type BuyInContract = z.infer<typeof BuyInContractSchema>;
```

There is no `NATIONAL_MEDIANS` row for `independent_living`, and there must not be one: IL is housing, not a surveyed care category, and §7 forbids inventing a figure. `resolveCost` returning null for IL is the correct answer rather than a gap, because the community's own contract supplies the rate. Until the IL tab ships the contract inputs, `independent_living` is withheld from the triage care-type picker (`SELECTABLE_CARE_TYPES`) — an option that can only ever price at $0 is worse than no option.

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
   recurring entries deferred. **Boundary confirmed for receipts, in §11.14: a receipt is a
   photograph the app holds and never reads (no OCR, no auto-fill) — that is what keeps this
   bounded rather than a step toward expense tracking.** Recurring entries remain a separate,
   unresolved question — a schedule and an implied future obligation are a materially bigger
   feature than an attached photo, and nothing in §11.14 should be read as answering it.

---

## 11. PROPOSED (revisions 9, 11, 12) — user-supplied feature batch, adjudicated

> **Status: PROPOSED. Not approved. Not built.** This section exists because a batch of feature
> ideas arrived from a prospective user. Per `.agents/AGENTS.md` §1–2, ideas that contradict a
> binding commitment are flagged here rather than implemented; ideas that are compatible are
> designed here before any code is written. Each subsection carries its own approval state.

### 11.0 The batch, and what happened to each idea

| # | Idea, as received | Verdict |
|---|---|---|
| 1 | "Look for actual facilities and maybe ratings" | **Rejected — §1.1.** A facility directory is a named non-goal. Partially served by §11.2 instead. |
| 2 | "Maybe a service or some sort to do all the busy work, because it's emotional" | **Out of scope as stated** (it is a staffed service, not software). The software-shaped part is §11.5. |
| 3 | "Add a facility with notes and photos, ranking community / food / activity / apartment / quality of staff / location / rent, so you can remember; vibes comparison" | **Accepted, designed → §11.2.** The strongest idea in the batch. |
| 4 | "Orgs like A Place for Mom might sponsor the app" | **Rejected — §1.1**, and not a close call. See §11.1. |
| 5 | "Calculate the APR etc. and calculate your own finances against the cost, consideration for inflation" | **Accepted, designed → §11.3.** |
| 6 | "Often both elders will go into facilities at the same time" | **Accepted, designed → §11.4.** Real gap; largest blast radius of the batch. |
| 7 | "RAG for translation of medical docs and everything into plain English" | **Rejected as RAG — §1.2** (it requires shipping user documents to a model over the network). A network-free subset is designed as §11.5. |
| 8 | "Contribute multiple families, like Google Drive, shared and synced" | **Rejected as sync — §1.1/§1.2.** The compatible form is already deferred in §3 (encrypted share link) and is restated as §11.6. |

### 11.1 The four rejections, stated plainly

These are not "later" — reversing them requires revising §1.1, and §1.1 says why that would cost
more than it gains.

**Facility directory + ratings (#1).** §1.1: *"No facility directory, no 'get matched with
communities,' no lead capture, no affiliate or referral fees."* Beyond the commitment, two
mechanical problems: a directory lookup sends the family's location and care needs to a third
party, which breaks the §1.2 local-only claim that the privacy E2E spec enforces; and third-party
review scores would be redistributed data with its own licensing question, which §10.1 shows is
already unresolved for a much simpler dataset. The *need* underneath the idea — "I toured six
places and cannot remember which one had the good dining room" — is real and is met by §11.2
without any of that.

**Sponsorship by a referral company (#4).** A Place for Mom is a lead-generation business: it is
paid by communities when a family moves in. §1.1 exists specifically to rule this out, and the
reasoning is in the spec: *"The moment this app has a financial interest in which option a family
picks, its cost comparisons stop being believable — including the honest ones."* The app's entire
wedge against incumbent calculators (§2.7) is that it is not this. Taking the sponsorship would
not compromise the product at the margin; it would delete the reason the product exists.

**RAG over medical/legal documents (#7).** Retrieval-augmented generation requires an LLM, which
means the family's medical records and admission agreements leave the device. §1.2 makes local-only
storage *functional*, not decorative — and `e2e/privacy.spec.ts` fails the build on an outbound
request carrying user data. This repo already has a home for document-grounded Q&A:
`projects/legal-financial-rag`. If the capability is wanted, it belongs there, where the privacy
contract is different, and this app can link to it. §11.5 covers what can be done here with no
network at all.

**Multi-family shared sync (#8).** "Like Google Drive" means an account, a server, and family
financial data at rest on someone else's disk — three things §1.1 forbids by name. §3 already
defers the compatible version: an encrypted payload in a URL fragment, which never reaches a
server because fragments are not sent in HTTP requests. That is restated with a design in §11.6.

### 11.2 APPROVED AND IMPLEMENTED — Facility shortlist & tour notes (`engine/fit.ts`, `FacilityPanel`)

> Status: approved and built — `src/lib/engine/fit.ts`, `src/lib/photos.ts`,
> `src/components/FacilityPanel.tsx`, covered by `e2e/facilities.spec.ts`. One acceptance
> criterion was corrected before implementation; see §11.2.5.

**The problem.** A family tours four to six communities in about two weeks, under stress, and then
cannot reconstruct which one had the staff they liked. The decision is made on a blur of half-remembered
impressions plus whichever brochure is on top of the pile — and the cost work this app already does
never gets connected to the place that actually felt right.

**What this is not.** Not a directory. Nothing is searched, fetched, ranked for the family, or
sent anywhere. Every facility in the list is one the family entered because they visited it. This
is a *notebook*, and that distinction is what keeps it clear of §1.1.

#### 11.2.1 Contract

```ts
export const FacilityDimensionSchema = z.enum([
  'community',    // residents, social life, atmosphere
  'food',         // dining — the single most-cited satisfaction driver in resident surveys
  'activities',
  'apartment',    // the unit itself: light, size, bathroom, storage
  'staff',        // observed interactions, turnover answer, call-bell response
  'location',     // distance from family, not "desirability"
  'upkeep',       // cleanliness, smell, maintenance
  'gut',          // "vibes" — recorded honestly as its own axis, never folded into the others
]);

export const FacilityRatingSchema = z.object({
  dimension: FacilityDimensionSchema,
  score: z.number().int().min(1).max(5).optional(),  // optional: unvisited ≠ zero
  note: z.string().max(400).optional(),
});

export const FacilityNoteSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  careType: CareTypeSchema,
  locality: z.string().max(80).optional(),      // "20 min from Dana" — never a street address
  visitedOn: z.string().max(40).optional(),
  visitedBy: z.string().max(80).optional(),     // a label, per §8 privacy
  quotedMonthlyCents: z.number().int().min(0).optional(),
  quotedCommunityFeeCents: z.number().int().min(0).optional(),
  quotedTierCents: z.number().int().min(0).optional(),
  waitlist: z.enum(['none', 'weeks', 'months', 'unknown']).default('unknown'),
  ratings: z.array(FacilityRatingSchema).default([]),
  photoIds: z.array(z.string().min(1)).default([]),   // see §11.2.4
  notes: z.string().max(2000).optional(),
});
```

`FacilityDimensionSchema` is a new `z.enum`, so **§9.2 applies to it from the moment it exists**:
every `Record<FacilityDimension, …>` and every sweep over it must be visited when a dimension is
added, and `scripts/check-enum-blast-radius.mjs` will enforce that in CI.

#### 11.2.2 Weights, and the honest way to score

The family sets a 0–3 weight per dimension ("doesn't matter" → "this is the decision"), and the app
shows a weighted mean of the scores given. Three rules keep this from becoming false precision
(§5.3), which is the live risk in any scoring UI:

1. **Per-dimension bars are the primary display; the composite is secondary.** A single number that
   hides "great food, worrying staff" is worse than no number.
2. **The composite is never rendered as a ranking or a winner.** No "Best: Oakmont." The app orders
   the cards in the order the family entered them and says what each scored.
3. **Unrated dimensions are excluded from the mean and named as excluded** — a facility is not
   penalised for a dimension nobody assessed, and the reader is told which ones those were.

Per §6.10 (*"a figure on screen without a derivation is a defect"*) the composite gains an
`ExplanationId` — `facility-fit` — whose steps list each dimension, its score, its weight, the
product, the divisor, and the excluded dimensions. Parts must sum to the displayed total as
rendered, per the standing invariant.

#### 11.2.3 The connection that makes this worth building

The shortlist is not a separate app pinned next to the calculator. **Adopting a facility writes its
quoted figures into the active scenario** — `quotedMonthlyCents → costOverrideCents`,
`quotedCommunityFeeCents → fees.communityFeeCents`, `quotedTierCents → fees.careLevelTierCents` —
so the existing all-in engine, runway, break-even and split all re-run against the real quote.
The panel then states the trade in one line, in the neutral register of §5.4:

> *"Oakmont scored highest on the dimensions weighted most. Its quoted rate is $900/month above
> Brookside, which shortens the projection by about 14 months."*

That sentence is the feature. Ratings alone are a notes app; the cost consequence of a preference
is the thing no incumbent tool puts on one screen.

#### 11.2.4 Photos — the part that can corrupt the plan if done carelessly

Photos are the highest-risk element in this section, and the risk is not privacy but **storage
quota**. `localStorage` holds ~5 MB per origin and the plan payload shares it. Base64-encoding a
single phone photo (~3–4 MB raw, ~4–5 MB encoded) exceeds the entire budget, and the failure mode
is a `QuotaExceededError` on the *plan* write — the family loses thirty ledger entries because
they attached a picture of a dining room. Binding rules:

- **Photos live in IndexedDB, in a store the plan payload does not share.** A quota failure on a
  photo must be reported as a failed photo, and must not be able to fail a plan write. This is the
  whole reason for the separate store.
- **Downscale before storing**: longest edge ≤ 1280px, JPEG q0.7, via `canvas`. No original bytes
  are retained.
- **Hard caps**: 6 photos per facility, 40 total, with a visible usage meter — a limit the family
  can see beats a write that fails at the worst moment.
- **`navigator.storage.estimate()` is checked before each write** and the family is warned at 80%.
- **Photos are excluded from JSON export by default**, with the reason stated on the control: an
  export with 40 embedded images is a file too large to email, which is what export is for. An
  opt-in "include photos" checkbox is acceptable if the size is shown before the download.
- **A privacy caution on the capture control**: photographs taken inside a community may include
  other residents, who have not consented. The copy says so once, plainly, without lecturing.

#### 11.2.5 Acceptance criteria (BDD)

- *Given* three facilities with ratings and weights, *When* the comparison is rendered, *Then* each
  dimension shows per-facility bars and no facility is labelled best or ranked.
- *Given* a facility with two unrated dimensions, *When* its composite is shown, *Then* the divisor
  excludes them and the excluded dimensions are named on screen.
- *Given* a facility with a quoted rate, *When* it is adopted into the active scenario, *Then* the
  all-in figure, runway and split all change to match the quote, and the delta versus the previous
  scenario is stated in months of runway.
- *Given* the `facility-fit` derivation, *When* its parts are parsed **from the rendered page**,
  *Then* the stated `score × weight` products sum exactly to the stated weighted total, and that
  total divided by the stated weight sum equals the displayed composite.

  > **Corrected before implementation.** This criterion originally read "*they sum exactly to the
  > displayed composite (§6.10 invariant)*", which is not a true statement about a weighted mean:
  > the parts sum to the weighted *total*, which is then divided by the weight sum. Writing it the
  > original way would have forced either a false assertion or an abuse of the cents-typed
  > `add`/`subtract` machinery that `isBalanced` checks. `facility-fit` therefore follows the
  > existing `sensitivity` pattern — `reference` steps with `valueText`, a `valueText` result, and
  > `hasArithmetic() === false`, so the §6.10 cents invariant is satisfied vacuously and correctly.
  > The real check is the division above, asserted on the rendered strings in
  > `e2e/facilities.spec.ts` and on the engine output in `fit.test.ts`.
- *Given* a photo is attached, *When* the page is reloaded, *Then* the photo is still shown and the
  plan payload in `localStorage` has not grown by the photo's size.
- *Given* the photo store is at quota, *When* another photo is attached, *Then* the failure is
  reported against the photo and a subsequent plan edit still saves and survives a reload.
- *Given* the shortlist is printed with the Family Meeting Summary, *When* the copy is read, *Then*
  it never addresses the reader in the second person (§5.4).
- *Given* the panel is on screen, *When* it is audited, *Then* `@axe-core/playwright` reports no
  violations — including that a rating is not encoded by colour alone (§5.5).

### 11.3 PROPOSED — Financing the gap: APR, and today's dollars (`engine/financing.ts`)

**The problem.** §2.5 already establishes that ~60% of people supporting a parent take on debt and
13% take on $25,000 or more, and §6.3 already flags *when* contributors must start funding from
debt. What the app never says is **what that borrowing costs**. A plan that reports "contributors
fund from month 34" and stops there has hidden the most expensive fact in it.

#### 11.3.1 Engine

Pure, like every other engine (§4 — no React, no storage, no ambient `Date.now()`).

```
input:  borrowedByMonthCents[]   // from RunwayResult: the part of each month's
                                 // contribution that exceeds stated capacity
        aprRate                  // decimal, e.g. 0.0899
        mode: 'interest_only' | 'amortizing'
        repaymentMonths          // term after care ends, for the payoff view

for each month m:
  interest(m)  = balance * aprRate / 12
  balance      = balance + borrowed(m) + interest(m) - payment(m)

output: balanceByMonthCents[], peakBalanceCents, totalInterestCents,
        monthlyPaymentAfterCareCents, monthsToRepay
```

- **Instrument presets ship as cited typical APR *ranges*, never quoted rates** — the same
  discipline as `data/feeStructures.ts`, with the same provenance block (source, retrieval date,
  confidence). A quoted rate the family did not receive is a false precision that costs money.
- **401(k) withdrawals are deliberately excluded from V1** of this engine. Their cost is marginal
  tax plus a 10% early-withdrawal penalty plus lost growth, not an APR, and getting it subtly wrong
  is the kind of harm §10.4 already refuses to risk with Medicaid. A note names the omission and
  refers out.
- Reverse mortgage stays deferred per §10.3.

#### 11.3.2 Today's dollars

A ten-year nominal projection overstates what the later years mean, and the app currently only
shows nominal. A **"show in today's dollars"** toggle deflates every projected figure by
`generalInflationRate`, applies to the runway chart, the yearly table and the totals together, and
states which basis is on screen. It must never be possible to read a nominal figure next to a real
one without a label — that is a total-and-parts failure in a different coat.

#### 11.3.3 Non-advice boundary

This is an estimator (§1). It computes the cost of a borrowing plan the family describes; it does
not recommend borrowing, does not compare lenders, does not rank instruments, and carries the same
"confirm with a professional" framing as §6.9. `financing` gains an `ExplanationId` in the same
change that gives it a UI (§6.10, binding).

#### 11.3.4 Acceptance criteria (BDD)

- *Given* a plan whose contributions exceed capacity from month 34, *When* an APR is entered,
  *Then* the peak balance, total interest and post-care monthly payment are displayed with their
  derivation.
- *Given* an APR of 0, *When* the projection runs, *Then* total interest is exactly zero and the
  balance equals the sum borrowed (a hand-computed golden fixture, per §8).
- *Given* interest-only versus amortizing at the same APR, *When* both are run, *Then* the
  amortizing total interest is lower and both are hand-verified fixtures.
- *Given* "today's dollars" is enabled, *When* the runway table is read, *Then* every figure on
  screen is on that basis and the basis is stated.

### 11.4 PROPOSED — Two care recipients at once (couples)

**The problem, and it is a real gap.** Both parents entering care in the same period is common —
often the same fall or diagnosis triggers it for both — and the app cannot express it at all today.
`PlanSchema.careRecipientLabel` is a single string, and every engine reads one active scenario.
A family in this position currently has to run the planner twice and add the answers by hand, which
is wrong: the two people share assets, share income, and share a shortfall, and running two
independent projections double-counts the assets in both.

**Three shapes, and the recommended one:**

| Approach | What it gives | Cost |
|---|---|---|
| (a) Second-person add-on only | Two people, one unit, one care type — the `second_person` add-on already in `FacilityAddOnSchema` | Cheap; does not cover the common case of *different* care levels (one assisted living, one memory care) |
| (b) `careRecipients: [{ id, label, scenarioIds }]` on `Plan` | Full generality | Touches every engine and every explanation; largest blast radius in the batch |
| **(c) Concurrent scenarios drawing on one asset pool** — **recommended** | Two scenarios marked concurrent; costs summed per month; one shared income and asset base; one combined shortfall into the existing split | Contained: `runway.ts` gains a summed cost stream, `PlanSchema` gains `concurrentScenarioIds`. Comparison scenarios stay comparisons. |

(c) is recommended because it preserves the existing meaning of "scenario" (an option under
consideration) while adding "these two are both happening", and because it keeps the shared-asset
arithmetic in one place instead of two.

**Consequences that must be handled in the same change, not after:**

- **Break-even (§6.2)** is per person and must say so — one parent at home while the other is in a
  community is a real and common arrangement, and a combined crossover figure would be meaningless.
- **Medicaid framing (§6.8)** changes materially: the spousal-impoverishment protections that
  shelter a community spouse **do not apply when both spouses are institutionalised**. This is
  exactly the kind of state-specific rule §10.4 refuses to model — so the card's copy changes to
  say the protection may not apply and to refer out. It must not compute anything new.
- **Benefit interaction:** two SSA benefits, and possibly a survivor-benefit change, are outside
  what this app models. Named as a caveat, not estimated.
- **§9.2 discipline is mandatory here.** `grep -rln "CareScenario\|careRecipientLabel"
  projects/elder-care-planner/src/` and open every file returned, listing each in the PR body with
  how it handles the concurrent case. `explain/build.ts` (1,005 lines, reads scenario shape
  throughout) is the one most likely to be missed.
- **Every existing sweep gains a two-recipient fixture** (§9.3) — `explain/build.test.ts`'s
  `isBalanced` sweep in particular, which is precisely where a new case kind previously slipped
  through green.

### 11.5 PROPOSED — Plain-language decoder (no network, no model)

The defensible core of ideas #2 and #7. Families are handed an admission agreement, a level-of-care
assessment and an EOB in the same week, and the vocabulary is the barrier — not the reasoning.

A **static, cited glossary** (`data/plainLanguage.ts`, same provenance block as `data/benefits.ts`)
covering the terms that actually appear in these documents: *level-of-care assessment, community
fee, second-person fee, care tier, elimination period, benefit period, spend-down, lookback,
MAPR, ADLs/IADLs, respite, discharge planning, custodial vs. skilled care, aid & attendance*.
Each entry: the term, what it means in one sentence, why it matters to the family's money, and a
link to the §6.5 question that turns it into leverage.

This is `data/questionsToAsk.ts`'s pattern applied to comprehension rather than negotiation: zero
computation, zero network, and plausibly one of the highest-value-per-line screens in the app.
Document *upload* and generated summaries stay out — that is `projects/legal-financial-rag`.

### 11.6 APPROVED AND IMPLEMENTED — Shared family link (restating the §3 deferral, with a design)

The compatible answer to idea #8, and already listed in §3's V2 deferrals:

- The plan is serialised, compressed, encrypted with a passphrase the sender shares out of band,
  and placed in the **URL fragment**. Fragments are never transmitted to a server, so the payload
  reaches the sibling without ever reaching a host — the §1.2 claim survives intact.
- It is a **snapshot, not sync.** The link says when it was made and by whom (a label). Two
  siblings editing the same link produce two plans, and the UI must say that plainly rather than
  implying convergence it cannot deliver.
- URL length limits cap this well below the photo store, so **§11.2 photos are excluded** from the
  link on the same grounds as export.

Anything beyond a snapshot — real merge, presence, live sync — requires a server and an account,
and is the rejection in §11.1, not a bigger version of this.

**Implementation.** `lib/share.ts` (`encodePlanForShare`, `decodePlanFromShare`): the `Plan` is
JSON-serialised, gzip-compressed (`CompressionStream`), and encrypted with AES-GCM under a key
PBKDF2-derived (100,000 iterations) from the passphrase, with a fresh random salt and IV on every
encode. The fragment is `share=v1.<salt>.<iv>.<ciphertext>`, each segment base64url. `Plan`, not
`PlannerState`, is what travels — the same domain contract export/import already speaks — so
`facilities`/`photoIds` (§11.2) structurally cannot appear in a shared link; there is nothing to
remember to strip. Every failure mode (wrong passphrase, a tampered fragment, malformed input)
collapses to the same clean failure rather than a distinguishable error, since AES-GCM's
authentication tag cannot tell "wrong key" from "corrupted ciphertext" apart in the first place and
distinguishing them to the caller would only leak information to an attacker.

`SharePanel` (generates a link from the current plan) and `SharedPlanView` (a passphrase gate,
then a read-only view of the decoded snapshot) are the two sides. `SharedPlanView` reuses
`ResultsPanel` under an `ExplainProvider` fed an all-null `ExplanationSet`, so every derivation
control (spec §6.10) silently renders nothing instead of fabricating a derivation from fields a
`Plan` does not carry (months elapsed, the state a break-even hourly rate came from) — an absent
"why" is honest here in a way a guessed one would not be. There is deliberately no path from a
decoded snapshot back into the viewer's own editable plan: `Plan -> PlannerState` is a lossy
projection this spec has never designed (§4.1 documents the loss in the other direction), and
inventing one to make "adopt this as my plan" possible would risk silently distorting the very
numbers a family member has no way to check. A future revision could design that path explicitly;
this one does not attempt it.

A shared link is detected from `location.hash`, checked once on mount and again on every
`hashchange` — a URL that differs only in its fragment is a same-document navigation in every
browser, not a reload, so a recipient who already has the page open in a tab and then opens (or
pastes) a share link would otherwise never trigger a fresh check.

### 11.7 PROPOSED — Coarse living-cost pre-fill (food + housing carry)

Given the user has no per-line figures for `HousingCarryCostSchema`, When they enter *any one* of food, utilities, rent, or property tax in the in-home / stay-at-home path, Then the panel offers a national metro-area **range** (low–high, not a single number) for the other lines, each tagged with one of the §6 confidence levels (`verified` / `needs_verification` / `derived`), and pre-filled only on explicit user action.

- **Range, never a point.** A single median is exactly the §1.1 shape this app refuses, and the Cite Confidence lesson in `.agents/AGENTS.md` §6 says ranges also carry a confidence tag.
- **Never additive to a residential base rate.** Per §2.1 and the §11.2 reasoning, residential advertising already bundles room+board+meals into `advertisedMonthly`; this pre-fill applies only to in-home / stay-at-home scenarios whose `careType` is in `{in_home_homemaker, in_home_health_aide, family_provided, adult_day_care}`.
- **Pre-fill, not result.** Numbers arrive labelled "Estimated (your state, …, confidence: …)" until the user confirms or overrides. The headline number never comes from a pre-fill alone; the derivation panel (per §6.10) lists exactly which lines came from the pre-fill and which the user replaced.
- **No network call.** Per §1.2, the dataset ships in `src/lib/data/livingCost.ts`; no API, no telemetry of which figures were taken.

### 11.8 APPROVED — Year-boundary labels and a depletion marker on the monthly comparison chart

Given any `independent_living` scenario is projected, When the comparison chart is shown, Then year boundaries (month 12, 24, …, N×12) carry a tick mark, an axis label, and a subtle vertical guideline, while the data resolution stays **monthly** per §6.5b.3.

- **Data resolution is not changed.** The underlying `assetsEndByMonthCents` series is untouched — annual sampling is exactly the option §6.5b.3 records as rejected, and revisiting that decision would require a spec revision under §1.1's "reversing any of them requires revising this spec."
- **Crossings stay truthful.** A year label landing on a non-zero crossing means the curve actually crossed there in a month inside the year; an interpolated landing is explicitly drawn as a faint marker.
- **Reuses existing data.** No schema change. The chart component (`ILOverlayChart.tsx`) gains year tick rendering; the existing yearly table is unchanged.
- **Depletion marker and readout (added on approval).** The feedback that motivated this section
  was *"identify where the lines cross and easily see, oops out of funds after 6 years"* — year
  labels alone do not answer that, because nothing on the chart marked the depletion event at all.
  Each option therefore also carries a marker at the month its balance first reaches zero, and a
  sentence beneath the chart naming that year and month. Three constraints on it:
  - **Read, never recomputed.** The month is found by scanning the same `assetsEndByMonthCents`
    series the chart plots (`engine/depletion.ts`), not derived again from plan inputs. A second
    implementation drifts from the engine, and a marker at the wrong month on a visible curve is
    worse than no marker (§6 "Explain the Arithmetic Without Re-implementing It").
  - **Never snapped to a year label.** Savings exhausted in month 74 are reported as month 74 in
    year 7. Rounding to the nearest boundary would place the marker where the curve never crossed —
    the same truthfulness rule the bullet above states for year labels.
  - **Silence is not an answer.** An option whose savings survive the projection says so explicitly;
    an option with no sentence is indistinguishable from one the app failed to evaluate. And because
    the chart is `role="img"`, the depletion year belongs in its accessible description too — a
    marker only sighted readers can find is not the feature that was requested.
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* a projection spanning whole years, *When* the chart is drawn, *Then* each completed year
    carries its own label, and a partial trailing year carries none.
  - *Given* savings that run out inside the projection, *When* the chart is drawn, *Then* a marker
    sits at the month it happens and its year is the one containing that month.
  - *Given* the marker is drawn, *When* the readout beneath the chart is read, *Then* it names the
    same year and month the marker carries.
  - *Given* an option whose savings never run out, *When* its readout is read, *Then* it says so.
  - *Given* a screen reader, *When* the chart's description is read, *Then* it states the depletion
    year as well.

### 11.9 APPROVED — Explicit dollar-basis label on every chart

> **Criterion corrected before implementation (Rev 13).** This section was titled *"values shown are
> in today's dollars"*, and that phrase is false for two of the three charts. The runway simulation
> compounds `annualEscalatorRate` on care and `colaRate` on income, and the IL overlay reads its
> series *verbatim from the runway engine* — so both are drawn in the **nominal dollars of each
> future month**, not in today's. Only the break-even comparison is in today's dollars, because
> `engine/breakeven.ts` has no time dimension at all: it is a single-month snapshot at current
> rates. Implementing the original wording would have printed a confident, incorrect statement on
> the two charts that most need an accurate one — the §6 "Explain the Arithmetic Without
> Re-implementing It" failure mode, where the transparency feature is itself the thing that misleads.
> Per §2 the criterion is corrected here, in writing, before code is written against it. The
> requirement is a label naming **the basis each chart is actually drawn in**, not a label asserting
> one basis for all of them.

Given any chart is displayed (runway, sensitivity, IL comparison, break-even), When the chart is on screen, Then a small text label on the chart states which dollar basis that chart's series are drawn in, and the §6.10 derivation panel for that figure names the same basis in its `assumptions` array.

- **Two bases exist, and they must not be confused for one another.** *Nominal (future dollars)* for
  anything the runway simulation produces — the runway chart, the IL overlay, and the sensitivity
  sweep, which varies escalator rates over that same projection. *Today's dollars* for the break-even
  comparison, which prices one month at current rates and applies no inflation. The defect this
  closes is not that inflation is missing; it is that an inflation-loaded projection and a
  today's-dollars comparison sit in adjacent panels with nothing on screen distinguishing them.
- **One definition, consumed twice.** The basis strings live in a single logic module
  (`src/lib/dollarBasis.ts`) that both the chart label and the derivation `assumptions` array read.
  A chart labelled from one string and a derivation labelled from another is the drift the §6
  "Explain the Arithmetic" lesson forbids, and it is exactly the kind that survives review.
- **A label, not a new math axis.** This adds no second set of curves (that would double-derive the
  projection) and changes no engine. It labels the existing series and points at the derivation
  where the rates are listed.
- **Deliberately out of scope:** deflating nominal figures to real terms (that is §11.3's
  "show in today's dollars" toggle, still PROPOSED and unapproved) and making the break-even
  comparison time-dependent (a new section, requiring a §9.2 walk of the ten `breakeven.ts`
  references the Rev 12 banner locks).
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* the runway chart or the IL overlay is on screen, *When* its basis label is read, *Then*
    it names nominal/future dollars and does not claim the figures are in today's dollars.
  - *Given* the break-even chart is on screen, *When* its basis label is read, *Then* it names
    today's dollars and says no inflation is applied.
  - *Given* any of those derivations is opened, *When* its `assumptions` are read, *Then* they carry
    the same basis sentence the chart label carries, from the same source.

### 11.10 PROPOSED — NYT-style interactive break-even slider

Given the break-even section is open, *When* the user moves an interactive slider driving paid in-home
hours per week, *Then* the in-home monthly cost line updates across the slider’s range, the residential
all-in cost baseline is drawn as a horizontal reference, and the crossover is drawn as a *band* (per
§1.1 / §5.3) — a low–high rectangle, not a single point — annotated where the two lines intersect
the band.

- **Same engine, band comes from the UI.** No new math is added to `engine/breakeven.ts`. The slider
  component reads the user’s chosen `hourlyRateCents` and *also* the citation bounds already used in
  §6.2 (low rate, high rate) from `data/costOfCare.ts` (a newly-cited `CostOfCareEntry`-shaped band carrying low cents, high cents, a `FigureConfidence` tag matching the §6 Cite Confidence rule, and a `note` naming the survey of origin) — calls `computeBreakEven` *twice* — once at the
  low bound, once at the high — and uses the two crossover hours as the slider’s band edges. Reusing
  the pure engine keeps `BreakEvenResult.breakEvenHoursPerWeek` schema untouched; no consumer migration
  is required (`explain/build.ts`, `BreakEvenPanel.tsx`, etc.). When `computeBreakEven` returns the
  degenerate case `breakEvenHoursPerWeek === 0` or `=== Number.POSITIVE_INFINITY` (defined at
  `engine/breakeven.ts:68-72`), the band collapses to a single-point anchor at the lower or upper
  axis edge — never an unbounded axis range — and the slider thumb still binds to
  `PlanState.currentHoursPerWeek`.
- **Range, not point, on screen.** Per §1.1, a single hour readout on screen is exactly the shape this
  app refuses. The midpoint of the band is *available* but is never the only thing shown. The band is
  drawn as a shaded rectangle intersecting the in-home cost line; the user’s `aria-valuenow` (their own
  input) is the only per-tick number on screen, and §5.3 forbids false precision on *output*, not on a
  reader’s own input.
- **Initial slider position = the plan’s current value.** When the panel mounts the thumb sits at
  `PlanState.currentHoursPerWeek` (the same number already encoded in the saved plan), not at 0 or at a
  default. Closing the tab discards the slider state; reopening returns to that saved value, so the
  family’s chart never disagrees with their saved plan.
- **Slider redraw uses `useDeferredValue`.** The thumb position itself updates on every input event;
  the SVG line and band redraw on a deferred tick. Deferred render is *not* animation, so §5.5 holds.
- **Neutral voice, derived status line.** Per §5.4 the panel never says "your hours" or "your plan";
  it says "Selected hours" and "Current plan: 40 hrs". A derived status line on the closed panel
  reports the band midpoint ("crossover roughly 38–46 hrs/week") so a closed panel still says
  something, per §5.1a.
- **§6.10 follows.** The existing `break-even` `ExplanationId` derivation in `src/lib/explain/build.ts`
  already covers the math. It is reachable from the panel’s `why-break-even` WhyButton; no new
  `ExplanationId` is required. The derivation panel reads from the *current slider position*, not the
  plan default.
- **Out of scope:** scenario-selector sliders (those are the §3 four-scenario table); §6.5b IL
  comparison chart (its axes are time, not rate — §11.8 is enough); pure sensitivity sliders (§6.4).
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* the break-even slider at any position in its range, *When* the panel loads, *Then* the
    in-home line, residential baseline, and a shaded crossover band are all drawn on the same axis.
  - *Given* the user drags the slider, *When* the value changes, *Then* the in-home line and band
    shift continuously and the residential baseline stays fixed.
  - *Given* any rate state with bounds in the new `data/costOfCare.ts` band entry, *When* the band is drawn, *Then*
    its width equals the two crossover hours produced by `computeBreakEven` at the low and high bound.
  - *Given* the plan’s `currentHoursPerWeek` is, say, 25, *When* the panel mounts, *Then* the thumb
    sits at 25, the in-home line and band intersect the residential baseline visibly to one side of
    the crossover, and the panel’s status line reports the band as a band — never a single hour.
  - *Given* a screen reader, *When* the slider’s value changes, *Then* `aria-valuetext` announces
    "X hours per week", not a raw index.
  - *Given* the `why-break-even` WhyButton is pressed, *When* the derivation panel opens, *Then* it
    reads engine output from the *current slider position*, not from the saved default.
  - *Given* the panel is on screen, *When* the page is audited, *Then* `@axe-core/playwright` reports
    no violations and the slider is reachable by Tab order.

### 11.11 APPROVED — Live headline sentence on the break-even panel

Given the break-even slider is on screen, When its position changes, Then a single plain-language
sentence above the chart restates the comparison at the selected hours, rebuilt from engine output
on every change.

This is the third of the NYT rent-vs-buy calculator's signature elements. The app already has the
other two — the slider itself (§11.10) and fully-exposed editable assumptions (§6.10 derivations) —
and what remained missing was the one line that says, in words, what the chart is showing.

- **Built from engine output, never recomputed.** The sentence reads `BreakEvenResult` and the
  §11.10 band. A second computation of the same comparison drifts from the engine the first time
  either changes, and a headline contradicting the chart beneath it is the §6 "Explain the
  Arithmetic Without Re-implementing It" failure at its most visible.
- **A band, not a single hour** (§1.1, §5.3). The crossover is stated as the low–high range the
  §11.10 band already computes. The rate is uncertain, so a single crossover hour is a false
  precision the app refuses — the same correction §11.10's status line required.
- **Neutral third-party voice** (§5.4). No second person, no "you should", no characterising a
  family member. When the *app* states the comparison it is not a relative stating it, and that
  reframing does real work at a family meeting. Enforced in a pure string-building module so the
  constraint is unit-testable, exactly as `lib/recommendation.ts` already does for §5.2/§5.4.
- **States which is cheaper, does not say which to choose** (§11.2). Reporting that one option costs
  less at the selected hours is a fact about arithmetic. Naming a "best" option is a recommendation
  this app declines to make, and the sentence must not drift into one.
- **Names its dollar basis** (§11.9). The comparison is a single month at current rates, so the
  headline must not be readable as a projection.
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* the slider at a known position, *When* the headline is read, *Then* it names the selected
    hours, both monthly figures, and the difference between them.
  - *Given* the slider is moved, *When* the headline is read again, *Then* it has followed the new
    position rather than reporting the saved default.
  - *Given* any slider position, *When* the headline states the crossover, *Then* it states a range
    rather than a single hour.
  - *Given* any slider position, *When* the headline is read, *Then* it contains no second-person
    address and no recommendation to choose an option.
  - *Given* residential care is cheaper before any paid help is added, *When* the headline is read,
    *Then* it says so rather than reporting a crossover that does not exist.

### 11.12 APPROVED — Itemised home-running costs, entered by the family

Given the in-home / stay-at-home path, When the family has figures for individual living-cost
categories, Then each category has its own optional input, and the monthly cost of running the home
is the sum of whatever they entered.

This completes a data model the app already had. `HousingCarryCostSchema` (§2.1) has carried
per-line fields — mortgage or rent, utilities, property tax, insurance, groceries, maintenance,
transport — since V1, and `housingCarryMonthlyCents` in `engine/cost.ts` already sums all of them.
Only the UI was missing: it offered a single lump-sum box, and `plannerState.ts` hardcoded the other
six lines to zero. A family with an itemised budget in front of them had nowhere to put it.

- **Entered, never estimated.** No figure is supplied, suggested or pre-filled. Every line defaults
  to zero and stays there until a person types something. Estimating these is §11.7's job and §11.7
  remains PROPOSED and unbuilt, blocked on a citable source — this section is deliberately the half
  that needs no dataset.
- **Optional, and partial entry is normal.** A family that knows groceries and utilities but not
  property tax enters two lines and leaves the rest at zero. Nothing is required and nothing is
  inferred from what is present.
- **The total is derived and shown, never typed twice.** The panel displays the sum of the lines so
  the figure feeding the comparison is visible. Two boxes that must agree is a defect waiting to
  happen (§6 "One Fact Stated Twice Will Eventually Be Stated Two Ways").
- **Existing plans keep their meaning.** `PlannerState.housingCarryMonthlyCents` remains, as the
  catch-all "anything else" line. A saved plan that put its whole home cost there still totals to
  exactly the same number, because that box always meant "everything", and it still does for anyone
  who itemises nothing. `HousingCarryCostSchema` gains `otherCents` to carry it honestly rather than
  mislabelling a lump sum as mortgage or rent, which is what the mapping did before.
- **Zero is still the wrong default, and still says so.** The existing warning stays: residential
  care already includes room and board, so leaving these at zero flatters staying at home. Itemising
  makes the omission more visible, not less.
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* figures typed into several category lines, *When* the comparison is computed, *Then* the
    home-running cost is their sum.
  - *Given* only some lines are filled, *When* the total is computed, *Then* the untouched lines
    contribute zero rather than blocking the calculation.
  - *Given* a plan saved before this existed, *When* it is loaded, *Then* its total is unchanged.
  - *Given* any set of entries, *When* the panel is read, *Then* the displayed total equals the sum
    of the lines as rendered.

### 11.13 APPROVED — "Where to start looking": process guidance and vetted resources

Given a family at the start of a search, When the starting-guide section is opened, Then it presents
the practical steps of finding care — in-home first, then touring communities, then legal, financial
and moving help — with each named resource carrying an explicit funding label.

The app already models the *money*. This section covers the part families get wrong before any
number matters: who to call, what to look at on a tour, and which of the organisations offering to
help are paid by the providers they recommend.

- **Do not rebuild what exists.** Buy-in versus rental contracts and refund terms are §6.5b; the
  waitlist field is on `FacilityNote`; "questions to ask before you sign" is its own panel; the
  elder-law-attorney and Medicaid cautions are in `benefits.ts`. This section links to those rather
  than restating them, and adds only what the app did not already say.
- **Every named resource carries a funding label**, on the same principle as §6's Cite Confidence
  rule for figures: `government`, `nonprofit`, `commercial_referral` or `commercial`. A directory
  paid a commission by the communities it recommends is useful *and* conflicted, and a reader
  deciding how much weight to give its checklist needs to know which. Any resource labelled
  `commercial_referral` or `commercial` **must** carry a note naming the conflict — the same
  structural rule as §11.10's derived band needing its own note, and enforced by a unit test rather
  than left to whoever edits the list.
- **No ranking, no "best".** Per §11.2 the app does not name a best option, and that extends to
  resources: the list is categorised, never ordered by preference, and carries no recommendation
  language.
- **Touring guidance is process, not opinion.** Visit in person, at more than one time of day, speak
  to care staff rather than only the sales representative, tour widely before narrowing, and match
  to the specific need (memory care, mobility, a couple staying together). None of this is a claim
  about any particular community.
- **Static content, no network calls.** The list ships in `src/lib/data/startingGuide.ts`. Links are
  ordinary anchors a reader may choose to follow; the app itself fetches nothing, so §1.2 holds and
  the privacy specs continue to pass with all outbound requests blocked.
- **Acceptance criteria (BDD, per `.agents/AGENTS.md` §5).**
  - *Given* the section is open, *When* the in-home, touring, legal, moving and other groups are
    read, *Then* each is present with at least one entry.
  - *Given* any resource paid by the providers it recommends, *When* it is displayed, *Then* its
    funding label and the note naming the conflict are both on screen next to it.
  - *Given* the resource list, *When* it is read, *Then* no entry is described as best, top or
    recommended.
  - *Given* every outbound request is blocked, *When* the section is opened, *Then* it renders in
    full, because nothing here is fetched.

### 11.14 APPROVED AND IMPLEMENTED — Receipt photo capture attached to ledger entries (resolving the §10.5 boundary)

§10.5 asked, and never answered: *"the contribution ledger edges toward being an expense-tracking
app... receipts and recurring entries deferred. Confirm that boundary."* §6.6 accordingly shipped
V1 with "no receipts, no recurring entries" stated flatly. This section proposes where the line
actually goes for receipts specifically — recurring entries are a separate, larger question
(a schedule, an implied future obligation) and stay out of scope here.

**The boundary: a receipt is a photograph, not data.** The app never reads it. No OCR, no
auto-filled amount or category, no parsing of any kind — attaching a photo changes nothing about
what the ledger already asks a family to type. What it adds is narrow and specific: the ability to
keep the proof beside the entry instead of in a shoebox or a separate phone album, for the one
moment that matters — an audit, a Medicaid spend-down review, or a sibling asking "what was this
$340 for?" six months later. This is the same boundary §11.2's facility shortlist already drew for
photos ("a notebook, never a directory"): a photo a family already has, attached to a record they
are already keeping, with the app doing no independent analysis of it. That is what keeps this a
bounded feature rather than the expense-tracking app §10.5 warned against becoming — the test for
any future proposal in this area is the same one: does it make the app *read* the receipt, or just
*hold* it. The former is out of scope; this is the latter.

**One photo per entry, not a gallery.** §11.2 allows up to six photos per facility because a tour
produces several distinct views worth keeping. A receipt is one document. `LedgerEntry` gains a
single optional `receiptPhotoId`, not an array — the simpler shape matches what the feature
actually is, and forecloses a "receipts becoming its own attachment gallery" scope creep before it
starts.

**Storage: a new, separate IndexedDB store — not reusing `lib/photos.ts`'s.** Two reasons this is a
new module (`lib/receipts.ts`) rather than a generalised photo store shared with facility photos.
(1) *Caps must not cross-charge.* §11.2.4's `MAX_PHOTOS_TOTAL` (40) budgets facility tour photos,
which are visited-once and finite over the life of a plan. A family logging ledger entries every
week for a year could plausibly attach far more receipts than that, and a shared cap would mean
photographing receipts quietly uses up the budget a later facility visit needs, with nothing on
screen explaining why the facility panel suddenly refuses a photo. Separate stores mean separate,
independently-sized caps (proposed: `MAX_RECEIPTS_TOTAL = 200`, no per-entry limit since it is
already one-per-entry) — each feature's budget is its own. (2) *Independent erasure and independent
failure.* `lib/photos.ts`'s central lesson (§6, "A Binary Attachment Must Not Share a Storage
Budget With the Record It Annotates") is that a binary store must not share a write-failure surface
with the record it annotates — a receipt-photo `QuotaExceededError` must not be able to fail the
*ledger* write any more than a facility-photo one can fail the *plan* write, and that isolation is
simplest to reason about, and to unit-test, as two independent stores rather than one store carrying
two families of caller-supplied caps. The same downscaling (longest edge 1280px, JPEG q0.7),
quota-error handling, and `PhotoResult<T>` failure-reporting shape as `lib/photos.ts` carry over
unchanged — this is the same architecture applied to a second, independently-budgeted binary type,
not a new one invented. A shared, parameterised attachment-store module is a reasonable refactor
once a third use case for this pattern appears; two is not yet that pressure, and refactoring the
existing, already-tested, already-AGENTS.md-referenced `lib/photos.ts` is unnecessary risk for this
feature to take on.

**`receiptPhotoId` lives on `PlannerState`'s ledger, not on `Plan`'s.** Today `LedgerEntrySchema` is
the *same* schema for both — unlike `FacilityNote`, which exists only on `PlannerState` and never
appears in `Plan` at all, so §11.2 photos are structurally excluded from export and the shared
family link (§11.6) with nothing to remember to strip. Adding `receiptPhotoId` to the shared
`LedgerEntrySchema` as-is would break that property by accident: the id would travel into every
`Plan` export and every shared link, a dangling reference on any device but this one, and a future
ledger view added to `SharedPlanView` would need to remember it cannot resolve it. The fix is the
one the codebase already uses for exactly this shape of problem (§4.1: `Plan` and `PlannerState`
are deliberately separate schemas because `buildPlan()` is a one-way projection that drops fields
`Plan` cannot carry). Concretely: `LedgerEntrySchema` stays as the domain contract engines and
`Plan` consume, unchanged; `PlannerStateSchema`'s `ledger` field is retyped to an array of a new
`PlannerLedgerEntrySchema` (`LedgerEntrySchema.extend({ receiptPhotoId: z.string().min(1).optional()
})`); and `buildPlan()` maps the (already-existing) `PlannerState -> Plan` conversion by dropping
that one field, the same way it already drops `monthsElapsed` and `compareHoursPerWeek`. Every
engine (`engine/ledger.ts`, `engine/tax.ts`) keeps consuming plain `LedgerEntry` and needs no
change. **Removing an entry does not delete its receipt** — this corrects an earlier draft of this
section, which had it backwards. `onFacilityRemove` deliberately leaves a removed facility's photos
in IndexedDB rather than deleting them, because removing a card is an editing action a family may
well undo by re-adding it, and destroying an image on the way past would be a surprise with no
undo; the same reasoning applies at least as strongly to a ledger entry, which a family is more
likely to remove and re-add while correcting a mistake. `onRemoveLedgerEntry` follows the same
pattern: the receipt is orphaned in `lib/receipts.ts`'s store, unreferenced but not destroyed.
"Forget everything on this device" calls a new `clearReceipts()` alongside `clearPhotos()` and
`clearPlannerState()`, which is where deletion is promised and where it actually happens — the
erase control's promise would otherwise be broken for exactly the data this feature adds.

**UI.** `LedgerPanel`'s add-entry form gains an optional file input, "Attach a receipt (optional)."
A logged entry with one shows a small thumbnail and a "View receipt" control that opens the stored
image; a decode or quota failure surfaces `lib/receipts.ts`'s equivalent of
`photoFailureMessage` inline on the entry rather than silently dropping the attachment.

**Acceptance criteria (BDD, per `.agents/AGENTS.md` §5), for the implementation that follows this
design.**
- *Given* a ledger entry, *When* a receipt photo is attached, *Then* the plan payload in
  `localStorage` grows by the size of an id, not the size of an image (mirroring §11.2.4's
  existing quota test).
- *Given* an entry with an attached receipt, *When* the entry is removed, *Then* the entry is gone
  from the ledger but its receipt remains in `lib/receipts.ts`'s store, unreferenced but not
  destroyed — mirroring `onFacilityRemove`'s treatment of a removed facility's photos, and for the
  same reason: an editing action a family may undo should not carry an unrecoverable side effect.
- *Given* a plan is exported or turned into a shared family link (§11.6), *When* the payload is
  inspected, *Then* no `receiptPhotoId` is present — the domain contract structurally excludes it,
  the same way it already excludes `facilities`/`photoIds`.
- *Given* "forget everything on this device" is used, *When* it completes, *Then* every stored
  receipt is gone, proven the same way §11.2.4's photo-erase spec proves it for facility photos.
- *Given* the receipt store's cap is reached, *When* another attachment is attempted, *Then* the
  family is told the cap and the count, not given a silently-failed write.

**Implementation.** `lib/receipts.ts` mirrors `lib/photos.ts`'s architecture exactly (IndexedDB,
downscale to 1280px JPEG q0.7, `ReceiptResult<T>` failure reporting) as its own independent module
and store (`elder-care-planner:receipts`), with `MAX_RECEIPTS_TOTAL = 200` — no per-entry cap,
since the schema already permits at most one receipt per entry. `PlannerLedgerEntrySchema`
(`schemas.ts`) extends `LedgerEntrySchema` with the optional `receiptPhotoId`; `PlannerState.ledger`
is retyped to it, `LedgerEntrySchema` and `Plan.ledger` are untouched, and `buildPlan()` strips the
field on the `PlannerState -> Plan` projection. `LedgerReceipt.tsx` (mirroring `FacilityPhotos.tsx`)
renders the attach/view/remove control per row, wired into `LedgerPanel`'s table as a new column and
into `page.tsx` via a new `onLedgerEntryChange` handler; `eraseEverything()` calls `clearReceipts()`
alongside `clearPhotos()`.

One correction from the original design text above: it said removing a ledger entry deletes its
receipt, "mirroring `onFacilityRemove`" — backwards. `onFacilityRemove` deliberately leaves a
removed facility's photos in IndexedDB rather than deleting them, and `onRemoveLedgerEntry` follows
the same actual behaviour: the receipt is orphaned, not destroyed, because removing a row is an
editing action a family may undo by re-adding it. A separate, explicit "Remove receipt" control
(distinct from removing the whole entry) does delete immediately, mirroring `FacilityPhotos`'
per-photo removal.

Verified: `node scripts/test-app.mjs elder-care-planner` passes in full — lint, tsc, 468 Vitest (25
new: 23 in `receipts.test.ts`, 2 in `plannerState.test.ts`, each mutation-proven per §9.4), and
`e2e/receipts.spec.ts` (6 new Playwright specs: quota margin proven by reload, orphaning proven on
entry removal, explicit removal proven distinct from entry removal, erase reaching the receipt
store, the shared-link exclusion decoded with the app's own `decodePlanFromShare` rather than
re-implemented, and accessibility on both states of the control).
