# Project Specification: Elder Care Cost Planner

> **Status:** DRAFT — awaiting human approval before implementation (per `.agents/AGENTS.md` §1–2).
> **Revision 2** — scope rewritten from user research (§2). Region: US-only. Cost data: cited
> medians + per-facility override.

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

### 2.4 Money is the #1 source of sibling conflict → **Split + Ledger** (§6.4)
76% of family caregivers report not receiving consistent help from family, and 78% report
out-of-pocket expenses averaging **$7,242/year**. Guidance is consistent: the fight is rarely
about whether Mom needs help, it is about who pays. Two capabilities follow:
- A **fair-split calculator** with equal / income-proportional / custom methods, so the
  conversation starts from arithmetic instead of resentment.
- A **contribution ledger** — who actually paid what, and who contributed hours or coordination.
  Non-cash contribution is first-class: the recommended framing is that a sibling who cannot pay
  can contribute time, coordination, or a specific task, and the lead caregiver's time *is* their
  contribution.

### 2.5 Caregiving costs the caregiver → **Opportunity Cost + Contributor Affordability** (§6.5)
Family caregivers spend more than a quarter of their annual income on caregiving, and roughly
40% cut back or leave their jobs. About 60% of people supporting parents take on debt — 13% take
on **$25,000 or more**. So the projection cannot stop at the parent's assets: it must show when
*contributors* start funding care from debt, and what a caregiver's reduced work costs over a
lifetime.

### 2.6 Delay forfeits benefits → **Benefit Reality Check with timing** (§6.6)
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
- [ ] **60-Second Triage** — five inputs (state, care type, parent's monthly income, liquid
      assets, number of contributors) → immediate all-in cost, runway, and shortfall. Every
      later feature is optional refinement of this result.
- [ ] **All-In Cost Engine** — base rate + care-level tier + à la carte fees + one-time move-in
      fee + annual escalator. Displays **"Advertised base" vs "Realistic all-in"** side by side
      with the delta called out.
- [ ] **Break-Even Analyzer** — the paid-hours-per-week crossover between in-home and
      residential care, both sides fully loaded (in-home includes housing carry costs).
- [ ] **Funding & Runway Engine** — month-by-month depletion with care inflation, income COLA,
      asset returns, and expiring LTC benefit periods. Outputs months-to-depletion plus the
      month contributors begin funding from income or debt.
- [ ] **Scenario Comparison** — up to 4 scenarios on all-in monthly cost, runway, and 5-year total.
- [ ] **Benefit Reality Check** — Medicare (leading with what it does *not* cover), Medicaid
      (spend-down, 5-year lookback, spousal impoverishment protections), VA Aid & Attendance,
      and LTC insurance — each with its timing trap surfaced.
- [ ] **Family Cost-Sharing Split** — equal / income-proportional / custom, with cash, hours, and
      task ownership all treated as contributions.
- [ ] **Contribution Ledger** — log what was actually paid, by whom, in what category; reconcile
      actual vs. pledged; feeds the tax estimate.
- [ ] **Caregiver Opportunity Cost** — lost net wages, lost employer retirement match, and a
      qualitative Social Security flag for reduced work years.
- [ ] **Tax Estimate** — unreimbursed medical expenses above 7.5% of AGI, with a
      multiple-support flag when siblings split support.
- [ ] **Family Meeting Summary** — one printable page: recommendation, numbers, assumptions, split.
- [ ] **Local-only persistence + export/import** — `localStorage`, no account, no network calls
      for user data; JSON export/import Zod-validated at the boundary.
- [ ] **Accessibility-first UI** — WCAG 2.1 AA, large-type mode, plain language, full keyboard use.

### Deferred to V2 (documented, not built)
- [ ] Medicaid eligibility modeling with state-specific asset limits (see §9.4 — deliberate).
- [ ] Shared family link (encrypted URL-fragment payload) so siblings see one live plan.
- [ ] Care-hours scheduler across family members.
- [ ] Reverse mortgage / home-sale proceeds modeling.
- [ ] Receipt photo capture attached to ledger entries.

---

## 4. Architecture & Tech Stack

- **Frontend:** Next.js (App Router), `output: 'export'` — matches `travel-packing-app` and
  `smart-recipe-app`.
- **Styling:** Vanilla CSS, consistent with sibling apps. No Tailwind.
- **Backend/API:** None. All computation is client-side and synchronous.
- **Database:** `localStorage`, single namespaced key, Zod-validated on read.
- **Deployment:** GitHub Pages at `/agentic-app-harness/elder-care-planner` via
  `deploy-pages.yml`; `basePath` applied only when `isProd`.
- **Container:** Web only — **no Capacitor**, so the `capacitor-absolute-base` guardrail does not
  apply and an absolute prod `basePath` is correct here.
- **Dependencies:** `next`, `react`, `react-dom`, `zod` only. No charting library — the runway
  chart is hand-rolled inline SVG, keeping the bundle small and every chart paired with an
  equivalent data table for a11y.

### Module layout
```
src/
  lib/
    schemas.ts              # all Zod schemas + inferred types (single contract source)
    data/costOfCare.ts      # cited national + state cost dataset
    data/feeStructures.ts   # cited typical tier/community-fee/escalator ranges
    data/benefits.ts        # cited benefit thresholds + timing rules
    engine/cost.ts          # scenario -> all-in monthly cost breakdown
    engine/breakeven.ts     # in-home vs residential crossover hours
    engine/runway.ts        # cost + income + assets -> depletion projection
    engine/split.ts         # shortfall -> per-contributor contributions
    engine/ledger.ts        # actual contributions -> reconciliation vs pledged
    engine/opportunity.ts   # caregiver work reduction -> lifetime cost
    engine/tax.ts           # medical-expense deduction estimate
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

### 5.2 Visual system
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

### 6.4 Split + Ledger (`engine/split.ts`, `engine/ledger.ts`)
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
running balance and a per-category total that feeds §6.7.

### 6.5 Caregiver opportunity cost (`engine/opportunity.ts`)
```
lostGrossWages = salary * (hoursReduced / 40) * years
lostNetWages   = lostGrossWages * (1 - marginalTaxRate)
lostMatch      = lostGrossWages * employerMatchRate
```
Plus a **qualitative** flag — not a dollar figure — when reduced work years would plausibly
affect the 35-year Social Security earnings average, linking to SSA's own calculator. The app
must not fabricate a benefit-reduction number: that calculation needs a full earnings history the
app does not have.

### 6.6 Benefit Reality Check (`data/benefits.ts`)
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

### 6.7 Tax estimate (`engine/tax.ts`)
Unreimbursed medical expenses above 7.5% of AGI may be deductible when itemizing, and qualifying
long-term care costs can count when care follows a plan of care for a chronically ill person. The
engine estimates the deductible amount from ledger categories and flags the multiple-support
situation when siblings split support. Labeled an estimate, with a clear "confirm with a tax
professional."

---

## 7. Data Models

All models are runtime Zod schemas with types inferred via `z.infer<>` (`.agents/AGENTS.md` §1).
Money is stored as **integer cents** to avoid float drift; rates are decimals (`0.04` = 4%).

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
  taxDeductibleCandidate: z.boolean().default(false),  // feeds §6.7
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
  §6.1–§6.4 are required cases, not suggestions.
- **E2E (Playwright), BDD-named `*.spec.ts`:**
  - Triage completes in 5 fields and renders a runway (§2.2).
  - Adding fees moves "all-in" above "advertised" and the delta is displayed (§2.1).
  - Break-even reports a crossover and flips recommendation as hours cross it (§2.3).
  - A shortfall splits three ways and the parts sum exactly to the shortfall (§2.4).
  - Export then re-import a plan and get byte-identical numbers.
  - The Medicare "does not cover custodial care" copy is visible on the results screen (§2.6).
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
9. `node scripts/test-app.mjs elder-care-planner` passes: security, lint, type-check, Vitest,
   Playwright + axe.
10. `node scripts/harness-status.mjs --gate` reports no new guardrail violations.
11. The Family Meeting Summary prints to one readable page with all assumptions listed.
12. The app is fully operable by keyboard and at 200% zoom, with zero axe violations.

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
5. **Ledger scope creep.** The contribution ledger (§6.4) edges toward being an expense-tracking
   app. V1 keeps it deliberately minimal — amount, date, category, who paid — with receipts and
   recurring entries deferred. Confirm that boundary.
