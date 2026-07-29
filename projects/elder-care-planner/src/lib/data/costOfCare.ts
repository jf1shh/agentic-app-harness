/**
 * Cost-of-care reference figures.
 *
 * Spec rule (§7): a number without a source is not shippable. Every figure here
 * carries provenance, and anything we could not cross-check against the primary
 * publication is marked `needs_verification` and surfaced as such in the UI —
 * we do not launder an uncertain figure into a confident one.
 *
 * Nothing here is interpolated or invented. Where a figure does not exist for a
 * care type (memory care is not a surveyed category) it is explicitly derived,
 * with the derivation recorded, and flagged for the user.
 */
import type { CareType } from '../schemas';

export interface CostDataSource {
  readonly name: string;
  readonly surveyYear: number;
  readonly surveyPeriod: string;
  readonly retrievedOn: string;
  readonly url: string;
  /**
   * The spec (§10.1) records dataset licensing as an open question. Until the
   * attribution terms are confirmed for redistribution, the UI leads with the
   * "enter your own quote" path and labels these as reference figures.
   */
  readonly licensingConfirmed: boolean;
}

export const COST_DATA_SOURCE: CostDataSource = {
  name: 'CareScout (Genworth) Cost of Care Survey',
  surveyYear: 2025,
  surveyPeriod: 'July–November 2025',
  retrievedOn: '2026-07-26',
  url: 'https://www.carescout.com/cost-of-care',
  licensingConfirmed: false,
};

/** How confident we are in an individual figure. */
export type FigureConfidence =
  /** Cross-checked against two independent reports of the primary survey. */
  | 'verified'
  /** Reported by a single secondary summary; needs primary-source check. */
  | 'needs_verification'
  /** Not a surveyed category — computed from a verified figure. */
  | 'derived';

export interface CostOfCareEntry {
  readonly careType: CareType;
  readonly stateCode: string; // 'US' = national median
  readonly medianMonthlyCents?: number;
  readonly medianHourlyCents?: number;
  /** Hourly-rate band low (cents), spec §11.10. Optional: requires the band shape. */
  readonly lowHourlyCents?: number;
  /** Hourly-rate band high (cents), spec §11.10. Optional: requires the band shape. */
  readonly highHourlyCents?: number;
  readonly medianDailyCents?: number;
  readonly confidence: FigureConfidence;
  readonly note?: string;
}

/**
 * The 2025 survey merged "homemaker services" and "home health aide" into a
 * single "non-medical caregiver" category after their prices converged, so both
 * of our hourly care types resolve to the same published rate. We keep the two
 * types distinct in the UI because they describe different care, and say plainly
 * that the published rate no longer distinguishes them.
 */
const NON_MEDICAL_CAREGIVER_HOURLY_CENTS = 3500; // $35.00/hr, +3% YoY

export const NATIONAL_MEDIANS: readonly CostOfCareEntry[] = [
  {
    careType: 'in_home_homemaker',
    stateCode: 'US',
    medianHourlyCents: NON_MEDICAL_CAREGIVER_HOURLY_CENTS,
    lowHourlyCents: 3000,
    highHourlyCents: 4000,
    confidence: 'verified',
    note: 'Published as the merged "non-medical caregiver" rate: $35/hr, $80,080/yr at 44 hrs/week.',
  },
  {
    careType: 'in_home_health_aide',
    stateCode: 'US',
    medianHourlyCents: NON_MEDICAL_CAREGIVER_HOURLY_CENTS,
    lowHourlyCents: 3000,
    highHourlyCents: 4000,
    confidence: 'verified',
    note: 'Same merged "non-medical caregiver" rate; the 2025 survey no longer prices these separately.',
  },
  {
    careType: 'adult_day_care',
    stateCode: 'US',
    medianMonthlyCents: 205_800,
    confidence: 'needs_verification',
    note: 'Adult day health care fell about 5% year over year. This monthly figure comes from a secondary summary and has not been checked against the published survey.',
  },
  {
    careType: 'assisted_living',
    stateCode: 'US',
    medianMonthlyCents: 620_000,
    confidence: 'verified',
    note: '$6,200/month ($74,400/yr), up 5% year over year.',
  },
  {
    careType: 'memory_care',
    stateCode: 'US',
    medianMonthlyCents: 775_000,
    confidence: 'derived',
    note: 'Memory care is not a surveyed category. Derived as assisted living + 25%, a commonly cited premium. Treat as a placeholder and enter a real quote.',
  },
  {
    careType: 'nursing_home_semi',
    stateCode: 'US',
    medianMonthlyCents: 958_100,
    confidence: 'verified',
    note: '$9,581/month for a semi-private room.',
  },
  {
    careType: 'nursing_home_private',
    stateCode: 'US',
    medianMonthlyCents: 1_079_800,
    confidence: 'verified',
    note: '$10,798/month for a private room.',
  },
  /**
   * `independent_living` is deliberately absent. Independent living is housing,
   * not a surveyed care category, so there is no published median to cite and
   * §7 forbids inventing one. An IL scenario is priced from the community's own
   * contract instead — `fees.buyInContract.monthlyServiceCentsRate` — which
   * `baseMonthlyCents` reads as the advertised rate. `resolveCost` returning
   * null for IL is therefore the correct answer, not a gap.
   */
  {
    careType: 'family_provided',
    stateCode: 'US',
    medianMonthlyCents: 0,
    confidence: 'verified',
    note: 'Unpaid family care has no fee. Its real cost is the caregiver opportunity cost — see the caregiver impact section.',
  },
];

/**
 * State-level medians.
 *
 * Intentionally empty. The survey publishes state figures, but we have not
 * transcribed and verified them, and the spec forbids inventing or interpolating
 * them (§7). Every state therefore resolves to the national median and the UI
 * says so — a labelled fallback is honest; a made-up state number is not.
 */
export const STATE_MEDIANS: readonly CostOfCareEntry[] = [];

export interface ResolvedCost {
  readonly entry: CostOfCareEntry;
  readonly isNationalFallback: boolean;
}

/** Look up the reference cost for a care type in a state. */
export function resolveCost(careType: CareType, stateCode: string): ResolvedCost | null {
  const state = STATE_MEDIANS.find(
    (e) => e.careType === careType && e.stateCode === stateCode,
  );
  if (state) return { entry: state, isNationalFallback: false };

  const national = NATIONAL_MEDIANS.find((e) => e.careType === careType);
  if (!national) return null;
  return { entry: national, isNationalFallback: true };
}

/** Hours-per-week assumption behind the published annual hourly-care figure. */
export const SURVEY_HOURS_PER_WEEK = 44;

/** Convert an hourly rate into a monthly cost at a given weekly hour count. */
export function hourlyToMonthlyCents(hourlyCents: number, hoursPerWeek: number): number {
  return Math.round((hourlyCents * hoursPerWeek * 52) / 12);
}

/**
 * The care types the triage picker offers.
 *
 * `independent_living` is deliberately withheld. It is priced from a buy-in
 * contract (§6.5b) that only the Independent Living tab can capture, and
 * `PlannerState` has no field for one — so offering it here today would put a
 * $0-a-month option in front of a family with no way to correct it. It joins
 * this list in the IL tab PR, along with the contract inputs that make it mean
 * something.
 */
export const SELECTABLE_CARE_TYPES: readonly CareType[] = [
  'in_home_homemaker',
  'in_home_health_aide',
  'adult_day_care',
  'assisted_living',
  'memory_care',
  'nursing_home_semi',
  'nursing_home_private',
  'family_provided',
];

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  in_home_homemaker: 'In-home help (cooking, cleaning, errands)',
  in_home_health_aide: 'In-home aide (personal care)',
  adult_day_care: 'Adult day care',
  independent_living: 'Independent living (community with an entry fee)',
  assisted_living: 'Assisted living',
  memory_care: 'Memory care',
  nursing_home_semi: 'Nursing home (shared room)',
  nursing_home_private: 'Nursing home (private room)',
  family_provided: 'Family provides care (unpaid)',
};
