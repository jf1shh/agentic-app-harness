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
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
  'family_provided', // unpaid family care — cost is opportunity cost, not fees
]);
export type CareType = z.infer<typeof CareTypeSchema>;

export const RESIDENTIAL_CARE_TYPES: readonly CareType[] = [
  'assisted_living',
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

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  careInflationRate: 0.045,
  generalInflationRate: 0.03,
  projectionYears: 10,
  splitMethod: 'equal',
};
