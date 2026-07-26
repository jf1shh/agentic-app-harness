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
  type Plan,
  type PlannerState,
  type CareType,
} from './schemas';

// The form's shape is a Zod schema in schemas.ts, so what the app holds in
// React and what it validates on read out of the browser cannot drift apart
// (.agents/AGENTS.md §1). Re-exported here because this is where callers
// already look for it.
export type { AddOnToggle, PlannerState };

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

  compareHoursPerWeek: 40,
  housingCarryMonthlyCents: 0,

  contributors: makeContributors(2),
  splitMethod: 'equal',

  ledger: [],
  monthsElapsed: 1,
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
    housingCarry: isHourly(state.careType)
      ? {
          mortgageOrRentCents: state.housingCarryMonthlyCents,
          utilitiesCents: 0,
          propertyTaxMonthlyCents: 0,
          insuranceMonthlyCents: 0,
          groceriesCents: 0,
          maintenanceMonthlyCents: 0,
          transportCents: 0,
        }
      : undefined,
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
    ledger: [...state.ledger],
    caregiverImpacts: [],
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      projectionYears: state.projectionYears,
      splitMethod: state.splitMethod,
    },
    updatedAt: new Date().toISOString(),
  };
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
    housingCarry: {
      mortgageOrRentCents: state.housingCarryMonthlyCents,
      utilitiesCents: 0,
      propertyTaxMonthlyCents: 0,
      insuranceMonthlyCents: 0,
      groceriesCents: 0,
      maintenanceMonthlyCents: 0,
      transportCents: 0,
    },
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
