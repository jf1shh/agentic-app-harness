# Project Specification: Elder Care Cost Planner

> **Status:** DRAFT — awaiting human approval before implementation (per `.agents/AGENTS.md` §1–2).

## 1. Product Overview

**Name:** Elder Care Cost Planner (working title: "CareCost")

**Description:** A private, offline-first planner that answers the question families actually
face when a parent needs care: *"What will this cost, how long can we afford it, and who pays
for what?"* It compares real care options side by side (in-home aide, adult day care, assisted
living, memory care, nursing home), projects how long savings will last against inflating care
costs, screens which public benefits realistically apply, and splits the shortfall fairly across
siblings.

**Target Audience:** Adult children (typically 45–65) coordinating care for a parent, often
across siblings and often under time pressure after a fall, a diagnosis, or a hospital discharge.
Secondary: older adults planning their own care, and the "sandwich generation" weighing whether
to reduce their own work hours.

**Why this app:** Cost-of-care information exists but is scattered across insurer PDFs, state
Medicaid pages, and VA fact sheets. Nobody joins it to *your* numbers. Three things are almost
never calculated for families and are the core value of this app:

1. **Runway** — the single number families need: *"we can fund this for 6.2 years."*
2. **Caregiver opportunity cost** — the lost wages, employer retirement match, and Social
   Security credits when a family member cuts hours. Usually the largest hidden number.
3. **A fair, explicit sibling split** — with a printable summary to bring to a family meeting.

**Explicitly not:** medical, legal, tax, or financial advice. This is an estimator. Every output
carries its assumptions, and the app states plainly where a professional is required
(Medicaid planning, elder law, tax filing).

---

## 2. Core Features

### MVP (V1)
- [ ] **Care Scenario Builder** — define one or more care scenarios (care type, hours/week or
      residential, ZIP/state, start date).
- [ ] **Cost Engine** — monthly cost from a real, cited cost-of-care dataset with state-level
      medians, plus per-scenario ancillary costs (medications, supplies, transport, dental/
      vision/hearing, one-time home modifications).
- [ ] **Funding & Runway Engine** — income sources vs. cost, assets drawn down monthly, care-cost
      inflation and investment return applied annually; outputs months-until-depletion, a
      year-by-year table, and the monthly shortfall.
- [ ] **Scenario Comparison** — 2–4 scenarios side by side on monthly cost, runway, and total
      5-year cost.
- [ ] **Benefit Reality Check** — a plain-language screener for Medicare, Medicaid, VA Aid &
      Attendance, and long-term care insurance, correcting the most expensive misconception in
      the whole domain: **Medicare does not pay for long-term custodial care.**
- [ ] **Family Cost-Sharing Split** — divide the monthly shortfall across contributors by equal
      share, income-proportional share, or custom amounts.
- [ ] **Caregiver Opportunity Cost** — model reduced hours or leaving work: lost net wages, lost
      employer retirement match, lost Social Security credit years.
- [ ] **Family Meeting Summary** — a print/PDF-friendly one-page summary of the recommended
      scenario, the numbers behind it, and the split.
- [ ] **Local-only persistence + export/import** — `localStorage`, no account, no network calls
      for user data; JSON export/import validated with Zod at the boundary.
- [ ] **Accessibility-first UI** — WCAG 2.1 AA, large-type mode, plain language, full keyboard
      operation.

### Deferred (V2 — documented here, not built in V1)
- [ ] Medicaid spend-down modeling with 5-year lookback and state-specific asset limits.
- [ ] Actual-vs-planned expense tracking (log what was really spent each month).
- [ ] Shared family link (encrypted, URL-fragment payload) so siblings see the same plan.
- [ ] Care-hours scheduler across family members.

---

## 3. Architecture & Tech Stack

- **Frontend:** Next.js (App Router), `output: 'export'` — matches `travel-packing-app` and
  `smart-recipe-app`.
- **Styling:** Vanilla CSS. No Tailwind (consistent with sibling apps).
- **Backend/API:** None. All computation is client-side and synchronous.
- **Database:** `localStorage`, single namespaced key, Zod-validated on read.
- **Deployment:** GitHub Pages under `/agentic-app-harness/elder-care-planner` via
  `deploy-pages.yml`; `basePath` set only when `isProd`.
- **Container:** Web only — **no Capacitor**. (Therefore the `capacitor-absolute-base` guardrail
  does not apply and an absolute prod `basePath` is correct here.)
- **Dependencies:** `next`, `react`, `react-dom`, `zod` only. No charting library — the runway
  chart is hand-rolled inline SVG, keeping the bundle small and the a11y story controllable
  (every chart has an equivalent data table).

### Module layout
```
src/
  lib/
    schemas.ts            # all Zod schemas + inferred types (single contract source)
    data/costOfCare.ts    # cited national + state cost dataset
    data/benefits.ts      # cited benefit thresholds (VA MAPR, Medicare SNF copay, ...)
    engine/cost.ts        # scenario -> monthly cost breakdown
    engine/runway.ts      # cost + income + assets -> depletion projection
    engine/split.ts       # shortfall -> per-contributor contributions
    engine/opportunity.ts # caregiver work reduction -> lifetime cost
    engine/tax.ts         # medical-expense deduction estimate
    storage.ts            # localStorage read/write, Zod-validated boundary
  app/                    # routes
  components/             # presentational components
```

Every `engine/*` module is a **pure function** — no React, no storage, no `Date.now()` passed
implicitly. This is what makes 100% Vitest coverage of the math achievable.

---

## 4. Data Models

All models are runtime Zod schemas with types inferred via `z.infer<>` (`.agents/AGENTS.md` §1).
Money is stored as **integer cents** to avoid float drift; rates are decimals (`0.045` = 4.5%).

```typescript
import { z } from 'zod';

export const CareTypeSchema = z.enum([
  'in_home_homemaker',    // non-medical help: cooking, cleaning, errands
  'in_home_health_aide',  // hands-on personal care
  'adult_day_care',
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
  'family_provided',      // unpaid family care — cost is opportunity cost, not fees
]);

export const CareScenarioSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  careType: CareTypeSchema,
  stateCode: z.string().length(2),        // US state / DC for regional cost lookup
  hoursPerWeek: z.number().min(0).max(168).optional(), // hourly care types only
  daysPerMonth: z.number().min(0).max(31).optional(),  // adult day care only
  costOverrideCents: z.number().int().min(0).optional(), // a real quoted price beats a median
  startDate: z.string().date(),
  ancillary: z.array(AncillaryExpenseSchema),
});

export const AncillaryExpenseSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  category: z.enum([
    'medication', 'supplies', 'transport', 'dental_vision_hearing',
    'home_modification', 'legal', 'other',
  ]),
  amountCents: z.number().int().min(0),
  cadence: z.enum(['monthly', 'annual', 'one_time']),
});

export const IncomeSourceSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  kind: z.enum([
    'social_security', 'pension', 'annuity', 'rental',
    'va_aid_attendance', 'ltc_insurance', 'other',
  ]),
  monthlyCents: z.number().int().min(0),
  colaRate: z.number().min(0).max(0.2).default(0), // annual cost-of-living adjustment
  endsAfterMonths: z.number().int().min(0).optional(), // LTC policies have benefit periods
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(80),
  kind: z.enum(['cash', 'brokerage', 'retirement', 'home_equity', 'other']),
  balanceCents: z.number().int().min(0),
  annualReturnRate: z.number().min(-0.5).max(0.5).default(0.04),
  liquid: z.boolean().default(true),   // home equity is excluded from runway unless sold
});

export const ContributorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  annualIncomeCents: z.number().int().min(0).optional(), // income-proportional split only
  monthlyPledgeCents: z.number().int().min(0).optional(), // custom split only
  providesUnpaidHoursPerWeek: z.number().min(0).max(168).default(0),
});

export const CaregiverImpactSchema = z.object({
  contributorId: z.string().uuid(),
  currentAnnualSalaryCents: z.number().int().min(0),
  hoursReducedPerWeek: z.number().min(0).max(60),
  employerMatchRate: z.number().min(0).max(0.25).default(0.04),
  yearsOfReducedWork: z.number().min(0).max(40),
  marginalTaxRate: z.number().min(0).max(0.6).default(0.22),
});

export const PlanSchema = z.object({
  schemaVersion: z.literal(1),
  careRecipientLabel: z.string().min(1).max(80).default('Mom'), // a label, never full PII
  scenarios: z.array(CareScenarioSchema).max(4),
  activeScenarioId: z.string().uuid().optional(),
  income: z.array(IncomeSourceSchema),
  assets: z.array(AssetSchema),
  contributors: z.array(ContributorSchema),
  caregiverImpacts: z.array(CaregiverImpactSchema),
  assumptions: AssumptionsSchema,
  updatedAt: z.string().datetime(),
});

export const AssumptionsSchema = z.object({
  careInflationRate: z.number().min(0).max(0.2).default(0.045), // care inflates faster than CPI
  generalInflationRate: z.number().min(0).max(0.2).default(0.03),
  projectionYears: z.number().int().min(1).max(30).default(10),
  splitMethod: z.enum(['equal', 'income_proportional', 'custom']).default('equal'),
});
```

### Cost-of-care dataset contract
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
  name: 'Genworth Cost of Care Survey',
  surveyYear: 0,        // MUST be filled with the actual survey year at implementation
  retrievedOn: '',      // ISO date the figures were transcribed
  url: '',
} as const;
```

The UI must display source name, survey year, and retrieval date wherever a median is used, and
must offer a per-scenario `costOverrideCents` so a family with a real quote from a real facility
can use it. **Implementation rule:** figures are transcribed from the cited source and verified
at build time; no invented or interpolated numbers. Where a state figure is unavailable, fall
back to the national median and label it as such in the UI.

---

## 5. UI/UX Design System

- **Color Palette:** Calm, non-clinical, high contrast. Primary `#1e5f4f` (deep teal),
  Secondary `#9a3412` (amber-800) for warnings, Background `#f8faf9`, Text `#111827`.
  All pairs verified ≥ 4.5:1 — per the a11y lesson in `.agents/AGENTS.md` §6, bright 500/600
  shades against white fail and must not be used.
- **Typography:** Inter. Base size **17px** (not 16) — many users are older adults or reading on
  a phone in a hospital corridor. A "Larger text" toggle scales the root to 20px.
- **Layout:** All grids use `repeat(auto-fit, minmax(min(280px, 100%), 1fr))` — never a fixed
  inline `gridTemplateColumns` (`responsive-grid` guardrail).
- **Viewport:** `width=device-width, initial-scale=1.0, viewport-fit=cover` — never
  `user-scalable=no` (`viewport-no-zoom` guardrail).
- **Tone:** Plain language. "How long the money lasts," not "asset depletion horizon." Numbers
  always paired with the assumption that produced them.
- **Charts:** Inline SVG runway chart, each with a visually-available equivalent data table.
- **Micro-interactions:** No animation on results — this is a stressful context; the numbers
  should appear, not perform. Respect `prefers-reduced-motion` throughout.
- **Print:** A dedicated print stylesheet for the Family Meeting Summary.

---

## 6. Core Logic (the part that must be right)

### 6.1 Runway projection (`engine/runway.ts`)
Month-by-month simulation over `projectionYears`:

```
for each month m:
  careCost(m)   = baseCost * (1 + careInflationRate) ^ floor(m/12)
  ancillary(m)  = monthly + annual/12 + one-time in their month, inflated at generalInflationRate
  income(m)     = Σ sources active at m, each grown by its colaRate annually
  shortfall(m)  = max(0, careCost(m) + ancillary(m) - income(m))
  liquidAssets  = liquidAssets * (1 + annualReturnRate/12) - shortfall(m)
  if liquidAssets <= 0 -> depletionMonth = m; stop
```

Outputs: `depletionMonth | null`, `yearlyBreakdown[]`, `firstYearMonthlyShortfallCents`,
`totalOutOfPocketCents`. Returning `null` for depletion means income covers cost — the app must
say "your parent's income covers this indefinitely," not show an empty chart.

**Edge cases that must be unit-tested:** income exceeds cost (no depletion); zero assets
(depletes month 1); LTC insurance benefit period ending mid-projection (`endsAfterMonths`);
one-time home modification in month 1; negative investment return; home equity excluded unless
`liquid: true`.

### 6.2 Sibling split (`engine/split.ts`)
- `equal` — shortfall ÷ number of contributors.
- `income_proportional` — contributor share = shortfall × (their income ÷ total income). Falls
  back to equal if any contributor's income is missing, and says so.
- `custom` — explicit pledges; surfaces the unfunded remainder if pledges < shortfall.
- Rounding: distribute cents so the parts always sum exactly to the shortfall (largest-remainder
  method). **This must be unit-tested** — a split that loses a cent is the kind of thing a family
  notices.
- Unpaid care hours are shown alongside cash contributions valued at the local home-aide rate,
  so a sibling providing 20 hrs/wk is visibly contributing. It is displayed, never silently
  netted against their cash share — that's a family decision, not the app's.

### 6.3 Caregiver opportunity cost (`engine/opportunity.ts`)
```
lostGrossWages = salary * (hoursReduced / 40) * years
lostNetWages   = lostGrossWages * (1 - marginalTaxRate)
lostMatch      = lostGrossWages * employerMatchRate
```
Plus a **qualitative** flag (not a dollar figure) when `yearsOfReducedWork` would plausibly
affect the 35-year Social Security earnings average, pointing to SSA's own calculator. The app
must not fabricate a benefit-reduction figure — that calculation depends on a full earnings
history the app does not have.

### 6.4 Benefit Reality Check (`data/benefits.ts`)
Rule-based, informational, and **explicitly not an eligibility determination**:
- **Medicare** — covers up to 100 days of skilled nursing after a qualifying hospital stay, with
  a daily copay after day 20; it does **not** cover long-term custodial care in assisted living
  or a nursing home. Shown first and prominently, because assuming otherwise is the most
  expensive mistake in this domain.
- **Medicaid** — pays for nursing home care after spend-down; income/asset limits are
  state-specific with a 5-year lookback on transfers. V1 links to the state agency and
  recommends an elder law attorney; it does not model eligibility.
- **VA Aid & Attendance** — a pension supplement for wartime veterans and surviving spouses
  needing help with daily activities; screener checks service era, care need, and income/asset
  thresholds against cited MAPR figures.
- **LTC insurance** — modeled as income with a daily benefit cap, elimination period (delayed
  start), and benefit period (`endsAfterMonths`).

Every benefit card cites its source and the date the figures were checked.

### 6.5 Tax estimate (`engine/tax.ts`)
Unreimbursed medical expenses above 7.5% of AGI may be deductible when itemizing, and
qualifying long-term care costs can count when care follows a plan of care for a chronically ill
person. The app estimates the deductible amount and flags the multiple-support situation when
siblings split support. Labeled an estimate, with a clear "confirm with a tax professional."

---

## 7. Testing & Compliance

- **Unit Tests (Vitest):** 100% coverage of `src/lib/engine/**` and `schemas.ts`. Every scenario
  in BDD form: `describe('Given ...')` → `it('When ... Then ...')`.
- **E2E (Playwright):** BDD-named `*.spec.ts` covering — build a scenario and see a runway;
  compare two scenarios; split a shortfall three ways; export then re-import a plan and get
  identical numbers; the Medicare misconception copy is present and visible.
- **A11y:** `@axe-core/playwright` on every route, zero violations, including in large-type mode.
- **Production bundle smoke test:** an E2E spec that loads the **built** export via
  `scripts/serve-dist.mjs` on its own port and fails on any response ≥ 400 — per the
  "test the artifact you ship" lesson. Proven by mutation before it's considered done.
- **Security & Privacy:** No network calls carrying user data. No analytics. No PII in logs.
  The care recipient is a free-text *label* — the UI states that full names, SSNs, and account
  numbers should not be entered, and no field invites them.
- **Optimization:** Lighthouse > 90 across the board.
- **Cleanup:** `npm run clean` in the build script, matching sibling apps.

---

## 8. Acceptance Criteria (V1)

1. A user can build a care scenario, enter income and assets, and see a runway in **under 3
   minutes** with no account and no network request carrying their data.
2. The runway projection is correct against hand-computed fixtures for all edge cases in §6.1,
   proven by Vitest.
3. Sibling split amounts always sum exactly to the shortfall, to the cent, under all three
   methods, proven by Vitest.
4. Every cost figure displayed is traceable to a cited source with a survey year and retrieval
   date visible in the UI, and every scenario supports a real-quote override.
5. The app states unambiguously that Medicare does not pay for long-term custodial care, on the
   results screen, not buried in a help page.
6. `node scripts/test-app.mjs elder-care-planner` passes: security, lint, type-check, Vitest,
   Playwright + axe.
7. `node scripts/harness-status.mjs --gate` reports no new guardrail violations.
8. The Family Meeting Summary prints to one readable page with assumptions listed.
9. The app is fully operable by keyboard and at 200% zoom, with zero axe violations.

---

## 9. Open Questions / Unresolved Architecture

1. **Geographic scope.** V1 is US-only: state-level cost medians, Medicare/Medicaid/VA. This is
   what makes it concrete rather than generic. Non-US users are served by the manual
   `costOverrideCents` path. *Confirm US-first is right.*
2. **Cost dataset licensing.** The Genworth survey is publicly published, but figures must be
   attributed and the terms confirmed before the numbers are committed. If attribution is not
   sufficient, fall back to a user-entered "what did the facility quote you?" flow with regional
   figures cited from public government sources (e.g. state ombudsman rate reports).
3. **Home equity.** V1 excludes home equity from runway unless explicitly marked liquid. A full
   reverse-mortgage / home-sale model is deferred to V2.
4. **Medicaid modeling.** Deliberately deferred. Spend-down rules are state-specific and getting
   them subtly wrong causes real financial harm. V1 informs and refers out.
