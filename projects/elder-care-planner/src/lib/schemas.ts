/**
 * Contract-first data models for the Elder Care Cost Planner.
 *
 * Per .agents/AGENTS.md §1, every application data model is a runtime Zod
 * schema from which the TypeScript type is inferred. Untrusted input — anything
 * read back from localStorage or imported from a JSON file — is validated at
 * the boundary (see storage.ts), never trusted because it "should" be shaped
 * right.
 *
 * Money is stored as integer cents throughout. Rates are decimals (0.04 = 4%).
 */
import { z } from 'zod';

export const CareTypeSchema = z.enum([
  'in_home_homemaker', // non-medical help: cooking, cleaning, errands
  'in_home_health_aide', // hands-on personal care
  'adult_day_care',
  'independent_living', // §6.5b — Independent Living community (entry fee + refund schedule)
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
  'family_provided', // unpaid family care — cost is opportunity cost, not fees
]);
export type CareType = z.infer<typeof CareTypeSchema>;

export const RESIDENTIAL_CARE_TYPES: readonly CareType[] = [
  'assisted_living',
  'independent_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
];

export const HOURLY_CARE_TYPES: readonly CareType[] = [
  'in_home_homemaker',
  'in_home_health_aide',
];

export const ExpenseCategorySchema = z.enum([
  'medication',
  'supplies',
  'transport',
  'dental_vision_hearing',
  'home_modification',
  'legal',
  'respite',
  'other',
]);
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

/**
 * Buy-in contract — Independent Living / Continuing Care Retirement Community
 * entry fees and refund schedules (spec §6.5b / §7.1). Optional; presence is
 * what flips `independent_living` scenarios into the IL comparison flow.
 *
 * Contracts publish `entryCents` and a refund schedule that decreases with
 * tenure. Money is stored as integer cents; refund is stored as percent so a
 * community that amends its entry fee doesn't silently invalidate the schedule.
 */
export const BuyInContractSchema = z.object({
  entryCents: z.number().int().min(0).default(0),
  amortized: z.boolean().default(false),
  refundSchedule: z
    .array(
      z.object({
        tenureMonths: z.number().int().min(0),
        refundPercent: z.number().min(0).max(100),
      }),
    )
    .default([]),
  monthlyServiceCentsRate: z.number().int().min(0).default(0),
});
export type BuyInContract = z.infer<typeof BuyInContractSchema>;

/**
 * The fee structure that makes the advertised rate differ from the real one.
 * See spec §2.1 — care-level tiers, community fees and escalators are the
 * documented source of the "we're paying 44% more than we budgeted" surprise.
 */
export const FacilityAddOnSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  kind: z.enum([
    'medication_management',
    'incontinence_supplies',
    'transport',
    'outside_caregiver_coordination',
    'second_person',
    'other',
  ]),
  monthlyCents: z.number().int().min(0),
});
export type FacilityAddOn = z.infer<typeof FacilityAddOnSchema>;

export const FacilityFeesSchema = z.object({
  communityFeeCents: z.number().int().min(0).default(0), // one-time, usually non-refundable
  careLevelTierCents: z.number().int().min(0).default(0), // current tier surcharge
  careLevelIncreaseAtMonth: z.number().int().min(1).optional(),
  careLevelIncreaseCents: z.number().int().min(0).optional(),
  annualEscalatorRate: z.number().min(0).max(0.2).default(0.04), // researched 3–5% band
  addOns: z.array(FacilityAddOnSchema).default([]),
  // §6.5b — opt-in: when present AND `careType === 'independent_living'`,
  // surfaces the IL community's buy-in contract. Its `entryCents` is folded
  // into `oneTimeCents`'s aggregate; `monthlyServiceCentsRate` becomes the
  // base when no `costOverrideCents` is set.
  buyInContract: BuyInContractSchema.optional(),
});
export type FacilityFees = z.infer<typeof FacilityFeesSchema>;

/**
 * The cost of staying home, which most home-vs-facility comparisons omit and
 * which is what makes the break-even honest (spec §2.3). Residential care
 * includes room and board; staying home does not stop these bills.
 */
export const HousingCarryCostSchema = z.object({
  mortgageOrRentCents: z.number().int().min(0).default(0),
  utilitiesCents: z.number().int().min(0).default(0),
  propertyTaxMonthlyCents: z.number().int().min(0).default(0),
  insuranceMonthlyCents: z.number().int().min(0).default(0),
  groceriesCents: z.number().int().min(0).default(0),
  maintenanceMonthlyCents: z.number().int().min(0).default(0),
  transportCents: z.number().int().min(0).default(0),
  /**
   * Home costs the family has not itemised (spec §11.12). Carries the
   * single-figure entry that predates per-line entry, rather than mislabelling
   * a lump sum as mortgage or rent, which is what the mapping did before.
   */
  otherCents: z.number().int().min(0).default(0),
});
export type HousingCarryCost = z.infer<typeof HousingCarryCostSchema>;

export const AncillaryExpenseSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  category: ExpenseCategorySchema,
  amountCents: z.number().int().min(0),
  cadence: z.enum(['monthly', 'annual', 'one_time']),
  taxDeductibleCandidate: z.boolean().default(false),
});
export type AncillaryExpense = z.infer<typeof AncillaryExpenseSchema>;

export const CareScenarioSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  careType: CareTypeSchema,
  stateCode: z.string().length(2),
  hoursPerWeek: z.number().min(0).max(168).optional(), // hourly care types
  daysPerMonth: z.number().min(0).max(31).optional(), // adult day care
  costOverrideCents: z.number().int().min(0).optional(), // a real quote beats a median
  fees: FacilityFeesSchema.optional(), // residential care
  housingCarry: HousingCarryCostSchema.optional(), // in-home / family-provided
  ancillary: z.array(AncillaryExpenseSchema).default([]),
});
export type CareScenario = z.infer<typeof CareScenarioSchema>;

export const IncomeSourceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  kind: z.enum([
    'social_security',
    'pension',
    'annuity',
    'rental',
    'va_aid_attendance',
    'ltc_insurance',
    'other',
  ]),
  monthlyCents: z.number().int().min(0),
  colaRate: z.number().min(0).max(0.2).default(0),
  // Long-term care policies pay nothing until the elimination period elapses
  // and stop when the benefit period runs out. Both are common ways a plan that
  // looked funded quietly stops being funded (spec §2.6).
  eliminationPeriodDays: z.number().int().min(0).default(0),
  endsAfterMonths: z.number().int().min(0).optional(),
});
export type IncomeSource = z.infer<typeof IncomeSourceSchema>;

export const AssetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  kind: z.enum(['cash', 'brokerage', 'retirement', 'home_equity', 'other']),
  balanceCents: z.number().int().min(0),
  annualReturnRate: z.number().min(-0.5).max(0.5).default(0.04),
  liquid: z.boolean().default(true), // home equity is excluded unless sold
});
export type Asset = z.infer<typeof AssetSchema>;

export const CareTaskSchema = z.enum([
  'care_coordination',
  'medical_appointments',
  'finances',
  'household',
  'transport',
  'advocacy',
]);
export type CareTask = z.infer<typeof CareTaskSchema>;

/**
 * A typical-week coverage pattern (spec §11.15) — never a calendar date. Every
 * hours figure in this app already means "a typical week" (`hoursPerWeek`,
 * `providesUnpaidHoursPerWeek`), and this stays in that paradigm on purpose:
 * the literal "scheduler" of dated shifts and reminders was considered and
 * declined in §11.15 as scope creep away from a cost planner.
 */
export const DayOfWeekSchema = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const CareTimeBlockSchema = z.enum(['morning', 'afternoon', 'evening', 'overnight']);
export type CareTimeBlock = z.infer<typeof CareTimeBlockSchema>;

/**
 * One covered cell of the weekly grid. Only covered cells are stored — an
 * absent (day, block) pair is uncovered, the same "list what exists" shape
 * `facilityWeights` already uses rather than a fully-enumerated grid.
 */
export const CareCoverageSlotSchema = z.object({
  day: DayOfWeekSchema,
  block: CareTimeBlockSchema,
  contributorId: z.string().min(1),
});
export type CareCoverageSlot = z.infer<typeof CareCoverageSlotSchema>;

export const ContributorSchema = z.object({
  id: z.string().min(1),
  // A label. The UI explicitly discourages full legal names — see §8 privacy.
  name: z.string().min(1).max(80),
  annualIncomeCents: z.number().int().min(0).optional(), // income-proportional split
  monthlyPledgeCents: z.number().int().min(0).optional(), // custom split
  monthlyCapacityCents: z.number().int().min(0).optional(), // debt-risk flag (§2.5)
  providesUnpaidHoursPerWeek: z.number().min(0).max(168).default(0),
  ownsTasks: z.array(CareTaskSchema).default([]),
});
export type Contributor = z.infer<typeof ContributorSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().min(1),
  contributorId: z.string().min(1),
  date: z.string().min(1),
  amountCents: z.number().int().min(0),
  category: ExpenseCategorySchema,
  note: z.string().max(200).optional(),
  taxDeductibleCandidate: z.boolean().default(false),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

/**
 * A ledger entry as the form holds it, with the one field `Plan` cannot carry
 * (spec §11.14). `receiptPhotoId` is a key into `lib/receipts.ts`'s IndexedDB
 * store — a local reference that means nothing outside this browser — so it
 * lives only here, never on `LedgerEntrySchema` itself. `buildPlan()` drops it
 * on the `PlannerState -> Plan` projection, the same way it already drops
 * `monthsElapsed` and `compareHoursPerWeek` (spec §4.1): without this split,
 * the id would travel into every export and every shared family link (§11.6)
 * as a dangling reference nothing on the receiving end can resolve.
 */
export const PlannerLedgerEntrySchema = LedgerEntrySchema.extend({
  receiptPhotoId: z.string().min(1).optional(),
});
export type PlannerLedgerEntry = z.infer<typeof PlannerLedgerEntrySchema>;

export const CaregiverImpactSchema = z.object({
  contributorId: z.string().min(1),
  currentAnnualSalaryCents: z.number().int().min(0),
  hoursReducedPerWeek: z.number().min(0).max(60),
  employerMatchRate: z.number().min(0).max(0.25).default(0.04),
  yearsOfReducedWork: z.number().min(0).max(40),
  marginalTaxRate: z.number().min(0).max(0.6).default(0.22),
});
export type CaregiverImpact = z.infer<typeof CaregiverImpactSchema>;

export const SplitMethodSchema = z.enum(['equal', 'income_proportional', 'custom']);
export type SplitMethod = z.infer<typeof SplitMethodSchema>;

export const AssumptionsSchema = z.object({
  careInflationRate: z.number().min(0).max(0.2).default(0.045),
  generalInflationRate: z.number().min(0).max(0.2).default(0.03),
  projectionYears: z.number().int().min(1).max(30).default(10),
  splitMethod: SplitMethodSchema.default('equal'),
});
export type Assumptions = z.infer<typeof AssumptionsSchema>;

export const PlanSchema = z.object({
  schemaVersion: z.literal(1),
  careRecipientLabel: z.string().min(1).max(80).default('Mom'),
  scenarios: z.array(CareScenarioSchema).max(4).default([]),
  activeScenarioId: z.string().min(1).optional(),
  income: z.array(IncomeSourceSchema).default([]),
  assets: z.array(AssetSchema).default([]),
  contributors: z.array(ContributorSchema).default([]),
  ledger: z.array(LedgerEntrySchema).default([]),
  caregiverImpacts: z.array(CaregiverImpactSchema).default([]),
  assumptions: AssumptionsSchema,
  updatedAt: z.string().min(1),
});
export type Plan = z.infer<typeof PlanSchema>;

/**
 * What travels inside an encrypted shared-plan link (spec §11.6).
 *
 * A `Plan`, not a `PlannerState`: the same domain contract export/import
 * already speaks, so the shared link carries no field the recipient's browser
 * cannot also validate. `facilities`/`photoIds` (spec §11.2) live only on
 * `PlannerState` and never on `Plan`, so a shared link structurally cannot
 * carry tour photos or facility notes — nothing here has to remember to strip
 * them. `createdAt`/`createdBy` are the label the spec requires the link to
 * carry: "the link says when it was made and by whom."
 */
export const SharedPlanPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  createdAt: z.string().min(1),
  createdBy: z.string().max(80).optional(),
  plan: PlanSchema,
});
export type SharedPlanPayload = z.infer<typeof SharedPlanPayloadSchema>;

/** One of the optional billed-separately services, with its toggle state. */
export const AddOnToggleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  monthlyCents: z.number().int().min(0),
  enabled: z.boolean(),
});
export type AddOnToggle = z.infer<typeof AddOnToggleSchema>;

/**
 * What the family typed, exactly as the form holds it — and the thing this app
 * persists between visits.
 *
 * It would be tidier to store a `Plan` and rebuild the form from it, and that
 * was the first design. It loses data: `buildPlan()` is a one-way projection,
 * and three real inputs do not survive the round trip — `monthsElapsed` and
 * `compareHoursPerWeek` have no home in `Plan` at all, and `housingCarry` is
 * only written when the care type is hourly. Losing `monthsElapsed` silently
 * would rewrite every figure in the ledger reconciliation on reload, which is
 * a worse failure than not persisting at all: the family would not be told.
 *
 * So `Plan` stays the domain contract that the engines consume and that
 * export/import will speak, and this is the storage contract. Both are Zod, and
 * anything read back from the browser is validated against this one before it
 * reaches React (.agents/AGENTS.md §1).
 */
/**
 * One Independent Living option as the comparison panel holds it (spec §6.5b.4).
 *
 * This is form state, not the contract model: `BuyInContractSchema` is what the
 * engine consumes, and `ilScenarios()` maps one to the other. Keeping them
 * separate means the panel can hold a half-typed refund ladder without the
 * engine ever seeing an invalid contract.
 */
export const ILOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  entryCents: z.number().int().min(0),
  amortized: z.boolean(),
  refundSchedule: z.array(
    z.object({
      tenureMonths: z.number().int().min(0).max(360),
      refundPercent: z.number().min(0).max(100),
    }),
  ),
  monthlyServiceCentsRate: z.number().int().min(0),
});
export type ILOption = z.infer<typeof ILOptionSchema>;

/**
 * The dimensions a family actually compares communities on (spec §11.2).
 *
 * `gut` is deliberately its own axis rather than being folded into the others.
 * A family that left a tour uneasy without being able to say why is holding
 * real information, and the honest place to record it is a line of its own —
 * averaging it invisibly into "staff" would launder a feeling into a judgement
 * about something specific.
 *
 * Widening this enum is a §9.2 event: every `Record<FacilityDimension, …>` and
 * every sweep over it must be visited in the same change.
 */
export const FacilityDimensionSchema = z.enum([
  'community', // the residents, the social life, the atmosphere
  'food', // dining — the most-cited satisfaction driver in resident surveys
  'activities',
  'apartment', // the unit itself: light, size, bathroom, storage
  'staff', // observed interactions, turnover answer, call-bell response
  'location', // distance from the family, not "desirability"
  'upkeep', // cleanliness, smell, maintenance
  'gut', // the overall feeling of the place
]);
export type FacilityDimension = z.infer<typeof FacilityDimensionSchema>;

/** Display order and copy for the dimensions, in one place. */
export const FACILITY_DIMENSIONS: readonly {
  dimension: FacilityDimension;
  label: string;
  hint: string;
}[] = [
  { dimension: 'community', label: 'Community', hint: 'The residents, and whether anyone seemed to be enjoying themselves.' },
  { dimension: 'food', label: 'Food', hint: 'Dining is the thing residents complain about most. Eat there if the tour allows it.' },
  { dimension: 'activities', label: 'Activities', hint: 'What was actually happening, not what the calendar on the wall claimed.' },
  { dimension: 'apartment', label: 'Apartment', hint: 'Light, size, storage, and whether the bathroom works for someone unsteady.' },
  { dimension: 'staff', label: 'Staff', hint: 'How staff spoke to residents when they thought nobody was watching.' },
  { dimension: 'location', label: 'Location', hint: 'How long the drive is for whoever will actually be visiting.' },
  { dimension: 'upkeep', label: 'Upkeep', hint: 'Cleanliness, smell, and whether anything was visibly broken.' },
  { dimension: 'gut', label: 'Overall feeling', hint: 'The impression left on the way out, whether or not it can be pinned to a reason.' },
];

/**
 * One dimension's assessment of one facility.
 *
 * `score` is optional and that is load-bearing: a dimension nobody assessed is
 * not a zero, and scoring it as one would penalise a community for a question
 * the family never got to ask.
 */
export const FacilityRatingSchema = z.object({
  dimension: FacilityDimensionSchema,
  score: z.number().int().min(1).max(5).optional(),
  note: z.string().max(400).optional(),
});
export type FacilityRating = z.infer<typeof FacilityRatingSchema>;

/**
 * How much a dimension matters to this family, 0 ("doesn't matter") to 3
 * ("this is the decision").
 *
 * Stored as a list rather than a `Record` so that adding a dimension to the
 * enum cannot fail the parse of a payload written before it existed — an
 * absent dimension resolves to the default weight (see `engine/fit.ts`).
 */
export const FacilityWeightSchema = z.object({
  dimension: FacilityDimensionSchema,
  weight: z.number().int().min(0).max(3),
});
export type FacilityWeight = z.infer<typeof FacilityWeightSchema>;

/**
 * One community the family actually visited (spec §11.2).
 *
 * This is a notebook, not a directory: nothing here is searched, fetched, or
 * ranked for the family, and nothing is sent anywhere. Every entry exists
 * because someone toured the place. That distinction is what keeps this clear
 * of the §1.1 non-goal against facility directories and referral revenue.
 *
 * `locality` is free text like "20 minutes from Dana" rather than a street
 * address — the §8 privacy rule applies here as everywhere else.
 */
export const FacilityNoteSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  careType: CareTypeSchema,
  locality: z.string().max(80).optional(),
  visitedOn: z.string().max(40).optional(),
  visitedBy: z.string().max(80).optional(),
  quotedMonthlyCents: z.number().int().min(0).optional(),
  quotedCommunityFeeCents: z.number().int().min(0).optional(),
  quotedTierCents: z.number().int().min(0).optional(),
  waitlist: z.enum(['unknown', 'none', 'weeks', 'months']).default('unknown'),
  ratings: z.array(FacilityRatingSchema).default([]),
  /** Keys into the IndexedDB photo store — never the image bytes. See lib/photos.ts. */
  photoIds: z.array(z.string().min(1)).default([]),
  notes: z.string().max(2000).optional(),
});
export type FacilityNote = z.infer<typeof FacilityNoteSchema>;

export const PlannerStateSchema = z.object({
  // Triage
  stateCode: z.string().length(2),
  careType: CareTypeSchema,
  monthlyIncomeCents: z.number().int().min(0),
  liquidAssetsCents: z.number().int().min(0),
  contributorCount: z.number().int().min(0).max(10),

  // Refinement
  careRecipientLabel: z.string().min(1).max(80),
  hoursPerWeek: z.number().min(0).max(168),
  costOverrideCents: z.number().int().min(0).nullable(),
  careLevelTierCents: z.number().int().min(0),
  communityFeeCents: z.number().int().min(0),
  annualEscalatorRate: z.number().min(0).max(0.2),
  addOns: z.array(AddOnToggleSchema),
  ancillaryMonthlyCents: z.number().int().min(0),
  projectionYears: z.number().int().min(1).max(30),
  assetReturnRate: z.number().min(-0.5).max(0.5),
  incomeColaRate: z.number().min(0).max(0.2),

  // Break-even comparison
  compareHoursPerWeek: z.number().min(0).max(168),
  /**
   * The catch-all "anything else" home cost. Predates per-line entry, so a
   * plan saved before §11.12 loads with its whole figure here and totals to
   * exactly the same number.
   */
  housingCarryMonthlyCents: z.number().int().min(0),
  // Itemised home-running costs (spec §11.12). Optional with a zero default so
  // plans saved before this existed still parse.
  homeMortgageOrRentCents: z.number().int().min(0).default(0),
  homeUtilitiesCents: z.number().int().min(0).default(0),
  homePropertyTaxMonthlyCents: z.number().int().min(0).default(0),
  homeInsuranceMonthlyCents: z.number().int().min(0).default(0),
  homeGroceriesCents: z.number().int().min(0).default(0),
  homeMaintenanceMonthlyCents: z.number().int().min(0).default(0),
  homeTransportCents: z.number().int().min(0).default(0),

  // Sharing
  contributors: z.array(ContributorSchema),
  splitMethod: SplitMethodSchema,

  // Contribution ledger
  ledger: z.array(PlannerLedgerEntrySchema),
  monthsElapsed: z.number().int().min(0).max(360),

  // Independent living comparison (§6.5b.4). Defaulted so a plan stored before
  // this panel existed still parses against the v1 storage key — no migration,
  // no silent data loss for a family returning to an older saved plan.
  ilOptions: z.array(ILOptionSchema).default([]),

  // Facility shortlist (§11.2). Defaulted for the same reason `ilOptions` is:
  // a plan stored before this panel existed still parses against the v1 key,
  // so no migration and no silent data loss for a family coming back to it.
  facilities: z.array(FacilityNoteSchema).default([]),
  facilityWeights: z.array(FacilityWeightSchema).default([]),

  // Weekly care-coverage grid (§11.15). PlannerState-only, like facilities —
  // it is a UI mechanism for producing and checking providesUnpaidHoursPerWeek,
  // not a figure any engine consumes, and it does not travel through export
  // or the shared family link (§11.6).
  careCoverage: z.array(CareCoverageSlotSchema).default([]),
});
export type PlannerState = z.infer<typeof PlannerStateSchema>;

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  careInflationRate: 0.045,
  generalInflationRate: 0.03,
  projectionYears: 10,
  splitMethod: 'equal',
};
