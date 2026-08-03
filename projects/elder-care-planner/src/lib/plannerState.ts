/**
 * The bridge between the UI's simple form state and the Plan contract.
 *
 * Kept out of React so that "what the form produces" is unit-testable, and so
 * the components cannot quietly introduce arithmetic of their own.
 */
import {
  DEFAULT_ASSUMPTIONS,
  type AddOnToggle,
  type CareScenario,
  type Contributor,
  type FacilityNote,
  type Plan,
  type PlannerState,
  type CareType,
  type ILOption,
  type HousingCarryCost,
} from './schemas';
import { SELECTABLE_CARE_TYPES } from './data/costOfCare';

// The form's shape is a Zod schema in schemas.ts, so what the app holds in
// React and what it validates on read out of the browser cannot drift apart
// (.agents/AGENTS.md §1). Re-exported here because this is where callers
// already look for it.
export type { AddOnToggle, PlannerState, ILOption, FacilityNote };

/** How many IL options the comparison panel will hold (spec §6.5b.4). */
export const MAX_IL_OPTIONS = 3;

/**
 * A blank option. Deliberately all zeros: §7 forbids inventing figures, and a
 * seeded $400,000 entry fee would be exactly that — a number a family might
 * leave in place and then compare against.
 */
export function makeILOption(index: number): ILOption {
  return {
    id: `il${index + 1}`,
    label: `Option ${String.fromCharCode(65 + index)}`,
    entryCents: 0,
    amortized: false,
    refundSchedule: [],
    monthlyServiceCentsRate: 0,
  };
}

/**
 * A blank facility card. All figures start empty rather than seeded: §7 forbids
 * inventing numbers, and a plausible-looking default rent is exactly the kind a
 * family leaves in place and then compares against.
 */
export function makeFacility(index: number, careType: CareType): FacilityNote {
  return {
    id: `f${index + 1}`,
    label: `Community ${index + 1}`,
    careType,
    waitlist: 'unknown',
    ratings: [],
    photoIds: [],
  };
}

/**
 * The plan priced at this community's quoted figures (spec §11.2.3).
 *
 * This is the join that makes the shortlist worth building: without it the
 * ratings are a notes app sitting next to a calculator, and the family never
 * finds out what preferring a place costs them. With it, every downstream
 * engine — all-in cost, runway, break-even, split — re-runs against a real
 * quote instead of a survey median.
 *
 * All three quoted figures are written together, with an absent quote taken as
 * zero rather than left at whatever the previous community charged. Carrying
 * one place's community fee into another place's pricing is a silent
 * misattribution, and it would land on the one number a family is least likely
 * to re-check. The panel says plainly that adopting replaces all three.
 */
export function withFacilityAdopted(
  state: PlannerState,
  facility: FacilityNote,
): PlannerState {
  return {
    ...state,
    // Guarded rather than assigned: a hand-edited payload could name a care
    // type the triage picker cannot show, which would strand the form on an
    // option the family has no control to change.
    careType: SELECTABLE_CARE_TYPES.includes(facility.careType)
      ? facility.careType
      : state.careType,
    costOverrideCents: facility.quotedMonthlyCents ?? null,
    communityFeeCents: facility.quotedCommunityFeeCents ?? 0,
    careLevelTierCents: facility.quotedTierCents ?? 0,
  };
}

export const US_STATES: readonly { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export const DEFAULT_ADD_ONS: readonly AddOnToggle[] = [
  { id: 'medication_management', label: 'Medication management', monthlyCents: 50_000, enabled: false },
  { id: 'incontinence_supplies', label: 'Incontinence care and supplies', monthlyCents: 40_000, enabled: false },
  { id: 'transport', label: 'Transport to appointments', monthlyCents: 15_000, enabled: false },
];

export function makeContributors(count: number, existing: readonly Contributor[] = []): Contributor[] {
  const out: Contributor[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(
      existing[i] ?? {
        id: `c${i + 1}`,
        // A label, not a legal name — see the privacy note in the UI.
        name: `Family member ${i + 1}`,
        providesUnpaidHoursPerWeek: 0,
        ownsTasks: [],
      },
    );
  }
  return out;
}

export const INITIAL_STATE: PlannerState = {
  stateCode: 'TX',
  careType: 'assisted_living',
  monthlyIncomeCents: 250_000,
  liquidAssetsCents: 15_000_000,
  contributorCount: 2,

  careRecipientLabel: 'Mom',
  hoursPerWeek: 40,
  costOverrideCents: null,
  careLevelTierCents: 0,
  communityFeeCents: 0,
  annualEscalatorRate: 0.04,
  addOns: [...DEFAULT_ADD_ONS],
  ancillaryMonthlyCents: 0,
  projectionYears: 10,
  assetReturnRate: 0.04,
  incomeColaRate: 0.02,
  homeSaleProceedsCents: 0,
  homeSaleAtMonth: 1,

  compareHoursPerWeek: 40,
  housingCarryMonthlyCents: 0,
  homeMortgageOrRentCents: 0,
  homeUtilitiesCents: 0,
  homePropertyTaxMonthlyCents: 0,
  homeInsuranceMonthlyCents: 0,
  homeGroceriesCents: 0,
  homeMaintenanceMonthlyCents: 0,
  homeTransportCents: 0,

  contributors: makeContributors(2),
  splitMethod: 'equal',

  ledger: [],
  monthsElapsed: 1,

  ilOptions: [],

  facilities: [],
  facilityWeights: [],

  careCoverage: [],
};

function isResidential(careType: CareType): boolean {
  return (
    careType === 'assisted_living' ||
    careType === 'memory_care' ||
    careType === 'nursing_home_semi' ||
    careType === 'nursing_home_private'
  );
}

function isHourly(careType: CareType): boolean {
  return careType === 'in_home_homemaker' || careType === 'in_home_health_aide';
}

/** The scenario the user is actually planning. */
/**
 * Map the planner's itemised home-cost fields onto `HousingCarryCost`
 * (spec §11.12).
 *
 * Defined once because there are two scenario builders — the main planner path
 * and the break-even comparison — and both previously hardcoded six of the
 * seven lines to zero. Fixing one and not the other would have left the other
 * silently dropping whatever the family typed (.agents/AGENTS.md §9.3).
 */
function housingCarryFrom(state: PlannerState): HousingCarryCost {
  return {
    mortgageOrRentCents: state.homeMortgageOrRentCents,
    utilitiesCents: state.homeUtilitiesCents,
    propertyTaxMonthlyCents: state.homePropertyTaxMonthlyCents,
    insuranceMonthlyCents: state.homeInsuranceMonthlyCents,
    groceriesCents: state.homeGroceriesCents,
    maintenanceMonthlyCents: state.homeMaintenanceMonthlyCents,
    transportCents: state.homeTransportCents,
    // The pre-§11.12 single figure. Always meant "everything", and still does
    // for a family that itemises nothing.
    otherCents: state.housingCarryMonthlyCents,
  };
}

export function primaryScenario(state: PlannerState): CareScenario {
  const enabledAddOns = state.addOns
    .filter((a) => a.enabled)
    .map((a) => ({
      id: a.id,
      label: a.label,
      kind: a.id as 'medication_management' | 'incontinence_supplies' | 'transport',
      monthlyCents: a.monthlyCents,
    }));

  return {
    id: 'primary',
    label: 'Current plan',
    careType: state.careType,
    stateCode: state.stateCode,
    hoursPerWeek: isHourly(state.careType) ? state.hoursPerWeek : undefined,
    costOverrideCents: state.costOverrideCents ?? undefined,
    fees: isResidential(state.careType)
      ? {
          communityFeeCents: state.communityFeeCents,
          careLevelTierCents: state.careLevelTierCents,
          annualEscalatorRate: state.annualEscalatorRate,
          addOns: enabledAddOns,
        }
      : undefined,
    housingCarry: isHourly(state.careType) ? housingCarryFrom(state) : undefined,
    ancillary:
      state.ancillaryMonthlyCents > 0
        ? [
            {
              id: 'ancillary',
              label: 'Medications, supplies and transport',
              category: 'other' as const,
              amountCents: state.ancillaryMonthlyCents,
              cadence: 'monthly' as const,
              taxDeductibleCandidate: true,
            },
          ]
        : [],
  };
}

export function buildPlan(state: PlannerState): Plan {
  return {
    schemaVersion: 1,
    careRecipientLabel: state.careRecipientLabel,
    scenarios: [primaryScenario(state)],
    activeScenarioId: 'primary',
    income:
      state.monthlyIncomeCents > 0
        ? [
            {
              id: 'income',
              label: 'Monthly income',
              kind: 'social_security',
              monthlyCents: state.monthlyIncomeCents,
              colaRate: state.incomeColaRate,
              eliminationPeriodDays: 0,
            },
          ]
        : [],
    assets:
      state.liquidAssetsCents > 0
        ? [
            {
              id: 'savings',
              label: 'Savings and investments',
              kind: 'cash',
              balanceCents: state.liquidAssetsCents,
              annualReturnRate: state.assetReturnRate,
              liquid: true,
            },
          ]
        : [],
    contributors: [...state.contributors],
    // receiptPhotoId (spec §11.14) is a local IndexedDB key with no meaning
    // outside this browser and does not exist on LedgerEntrySchema — dropped
    // here the same way monthsElapsed and compareHoursPerWeek are, below.
    ledger: state.ledger.map(({ receiptPhotoId, ...entry }) => {
      void receiptPhotoId;
      return entry;
    }),
    caregiverImpacts: [],
    homeSaleProceeds:
      state.homeSaleProceedsCents > 0
        ? { atMonth: state.homeSaleAtMonth, netCents: state.homeSaleProceedsCents }
        : undefined,
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      projectionYears: state.projectionYears,
      splitMethod: state.splitMethod,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * The IL options as engine scenarios (spec §6.5b.4).
 *
 * Every option becomes an `independent_living` scenario carrying a
 * `buyInContract`, so `projectILVariants` prices all of them from the contract
 * and none from a survey median — independent living is not a surveyed
 * category. Options are mapped in order and keep their `id`, because the
 * projection is aligned by `scenarioId` rather than by index.
 */
export function ilScenarios(state: PlannerState): CareScenario[] {
  return state.ilOptions.map((option) => ({
    id: option.id,
    label: option.label,
    careType: 'independent_living' as const,
    stateCode: state.stateCode,
    fees: {
      communityFeeCents: 0,
      careLevelTierCents: 0,
      annualEscalatorRate: state.annualEscalatorRate,
      addOns: [],
      buyInContract: {
        entryCents: option.entryCents,
        amortized: option.amortized,
        // Sorted on the way into the engine so a ladder typed out of order
        // still reads correctly in the chart's band.
        refundSchedule: [...option.refundSchedule].sort(
          (a, b) => a.tenureMonths - b.tenureMonths,
        ),
        monthlyServiceCentsRate: option.monthlyServiceCentsRate,
      },
    },
    ancillary: [],
  }));
}

/** Both sides of the home-vs-facility comparison, built from the same state. */
export function breakEvenScenarios(state: PlannerState): {
  inHome: CareScenario;
  residential: CareScenario;
} {
  const inHome: CareScenario = {
    id: 'be-in-home',
    label: 'Care at home',
    careType: 'in_home_health_aide',
    stateCode: state.stateCode,
    hoursPerWeek: state.compareHoursPerWeek,
    housingCarry: housingCarryFrom(state),
    ancillary: [],
  };

  const residentialType: CareType = isResidential(state.careType)
    ? state.careType
    : 'assisted_living';

  const residential: CareScenario = {
    id: 'be-residential',
    label: 'Residential care',
    careType: residentialType,
    stateCode: state.stateCode,
    fees: {
      communityFeeCents: 0,
      careLevelTierCents: state.careLevelTierCents,
      annualEscalatorRate: state.annualEscalatorRate,
      addOns: state.addOns
        .filter((a) => a.enabled)
        .map((a) => ({
          id: a.id,
          label: a.label,
          kind: a.id as 'medication_management' | 'incontinence_supplies' | 'transport',
          monthlyCents: a.monthlyCents,
        })),
    },
    ancillary: [],
  };

  return { inHome, residential };
}
