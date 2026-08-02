/**
 * Unit tests for the form-state to Plan bridge.
 *
 * This is where UI convenience meets the validated contract, so the important
 * property is that whatever the form produces is always a valid Plan.
 */
import { describe, it, expect } from 'vitest';
import {
  INITIAL_STATE,
  buildPlan,
  primaryScenario,
  breakEvenScenarios,
  makeContributors,
  ilScenarios,
  makeILOption,
  US_STATES,
  type PlannerState,
} from './plannerState';
import { PlanSchema } from './schemas';
import { housingCarryMonthlyCents } from './engine/cost';

describe('Given the initial triage state', () => {
  it('When a plan is built, Then it satisfies the Plan contract', () => {
    expect(PlanSchema.safeParse(buildPlan(INITIAL_STATE)).success).toBe(true);
  });

  it('When states are listed, Then all 50 states and DC are offered', () => {
    expect(US_STATES).toHaveLength(51);
  });
});

describe('Given a residential care type', () => {
  it('When the scenario is built, Then facility fees are attached and housing carry is not', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, careType: 'assisted_living' });
    expect(scenario.fees).toBeDefined();
    expect(scenario.housingCarry).toBeUndefined();
  });
});

describe('Given an hourly in-home care type', () => {
  it('When the scenario is built, Then hours carry through and fees do not apply', () => {
    const scenario = primaryScenario({
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
      hoursPerWeek: 30,
    });
    expect(scenario.hoursPerWeek).toBe(30);
    expect(scenario.fees).toBeUndefined();
  });
});

describe('Given add-on services are toggled on', () => {
  it('When the scenario is built, Then only the enabled ones are billed', () => {
    const scenario = primaryScenario({
      ...INITIAL_STATE,
      addOns: INITIAL_STATE.addOns.map((a, i) => ({ ...a, enabled: i === 0 })),
    });
    expect(scenario.fees?.addOns).toHaveLength(1);
    expect(scenario.fees?.addOns[0].id).toBe('medication_management');
  });
});

describe('Given the break-even comparison', () => {
  it('When built, Then both sides exist and the residential side is residential', () => {
    const { inHome, residential } = breakEvenScenarios(INITIAL_STATE);
    expect(inHome.careType).toBe('in_home_health_aide');
    expect(residential.careType).toBe('assisted_living');
  });

  it('When the plan is for in-home care, Then assisted living is used as the comparison', () => {
    const { residential } = breakEvenScenarios({
      ...INITIAL_STATE,
      careType: 'in_home_health_aide',
    });
    expect(residential.careType).toBe('assisted_living');
  });
});

describe('Given the number of contributors changes', () => {
  it('When it grows, Then existing entries are preserved and new ones added', () => {
    const two = makeContributors(2);
    const edited = [{ ...two[0], name: 'Jo' }, two[1]];
    const three = makeContributors(3, edited);
    expect(three).toHaveLength(3);
    expect(three[0].name).toBe('Jo');
  });

  it('When it shrinks, Then the extra entries are dropped', () => {
    expect(makeContributors(1, makeContributors(3))).toHaveLength(1);
  });

  it('When it is zero, Then no contributors exist and the plan is still valid', () => {
    const plan = buildPlan({ ...INITIAL_STATE, contributorCount: 0, contributors: [] });
    expect(plan.contributors).toEqual([]);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('Given a quoted price is entered', () => {
  it('When the plan is built, Then the override replaces the published median', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, costOverrideCents: 725_000 });
    expect(scenario.costOverrideCents).toBe(725_000);
  });

  it('When the quote is cleared, Then no override is set', () => {
    const scenario = primaryScenario({ ...INITIAL_STATE, costOverrideCents: null });
    expect(scenario.costOverrideCents).toBeUndefined();
  });
});

describe('Given independent living options entered in the comparison panel', () => {
  it('When mapped to scenarios, Then each becomes an independent_living scenario carrying its contract', () => {
    // Given two options over the shared plan state
    const state: PlannerState = {
      ...INITIAL_STATE,
      stateCode: 'TX',
      annualEscalatorRate: 0.04,
      ilOptions: [
        {
          id: 'il1',
          label: 'Option A',
          entryCents: 40_000_000,
          amortized: false,
          refundSchedule: [{ tenureMonths: 12, refundPercent: 80 }],
          monthlyServiceCentsRate: 350_000,
        },
        {
          id: 'il2',
          label: 'Option B',
          entryCents: 20_000_000,
          amortized: true,
          refundSchedule: [],
          monthlyServiceCentsRate: 450_000,
        },
      ],
    };

    // When the scenarios are built
    const scenarios = ilScenarios(state);

    // Then the contract, not a survey median, is what prices them
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].careType).toBe('independent_living');
    expect(scenarios[0].id).toBe('il1');
    expect(scenarios[0].fees?.buyInContract?.entryCents).toBe(40_000_000);
    expect(scenarios[0].fees?.buyInContract?.monthlyServiceCentsRate).toBe(350_000);
    expect(scenarios[1].fees?.buyInContract?.amortized).toBe(true);
    // The plan's escalator and state carry through rather than being re-keyed.
    expect(scenarios[0].stateCode).toBe('TX');
    expect(scenarios[0].fees?.annualEscalatorRate).toBe(0.04);
  });

  it('When a refund ladder is typed out of order, Then it reaches the engine sorted', () => {
    // Given rows entered 60m, 12m, 36m — the order a form invites
    const state: PlannerState = {
      ...INITIAL_STATE,
      ilOptions: [
        {
          id: 'il1',
          label: 'Option A',
          entryCents: 40_000_000,
          amortized: false,
          refundSchedule: [
            { tenureMonths: 60, refundPercent: 30 },
            { tenureMonths: 12, refundPercent: 80 },
            { tenureMonths: 36, refundPercent: 60 },
          ],
          monthlyServiceCentsRate: 350_000,
        },
      ],
    };

    // Then the contract carries them ascending by tenure
    const schedule = ilScenarios(state)[0].fees?.buyInContract?.refundSchedule ?? [];
    expect(schedule.map((r) => r.tenureMonths)).toEqual([12, 36, 60]);
  });

  it('When no options are entered, Then no scenarios are produced', () => {
    expect(ilScenarios({ ...INITIAL_STATE, ilOptions: [] })).toEqual([]);
  });

  it('When a blank option is created, Then every figure starts at zero rather than at an invented default', () => {
    // §7 forbids inventing figures. A seeded entry fee is one a family might
    // leave in place and then compare against.
    const option = makeILOption(0);
    expect(option.entryCents).toBe(0);
    expect(option.monthlyServiceCentsRate).toBe(0);
    expect(option.refundSchedule).toEqual([]);
    expect(option.amortized).toBe(false);
    expect(option.label).toBe('Option A');
    expect(makeILOption(2).label).toBe('Option C');
  });
});

describe('Given a family with itemised home-running costs (spec §11.12)', () => {
  // The gap this closes: HousingCarryCostSchema has carried per-line fields
  // since V1 and engine/cost.ts already sums all of them, but plannerState
  // hardcoded six of the seven to zero, so anything typed into them could
  // never reach the engine.
  const itemised = {
    homeMortgageOrRentCents: 180_000,
    homeUtilitiesCents: 24_000,
    homePropertyTaxMonthlyCents: 40_000,
    homeInsuranceMonthlyCents: 12_000,
    homeGroceriesCents: 50_000,
    homeMaintenanceMonthlyCents: 15_000,
    homeTransportCents: 9_000,
  };
  const itemisedTotal = Object.values(itemised).reduce((a, b) => a + b, 0);

  it('When the categories are entered, Then the break-even in-home scenario carries every one of them', () => {
    const { inHome } = breakEvenScenarios({ ...INITIAL_STATE, ...itemised });
    const carry = inHome.housingCarry;

    expect(carry?.mortgageOrRentCents).toBe(itemised.homeMortgageOrRentCents);
    expect(carry?.utilitiesCents).toBe(itemised.homeUtilitiesCents);
    expect(carry?.propertyTaxMonthlyCents).toBe(itemised.homePropertyTaxMonthlyCents);
    expect(carry?.insuranceMonthlyCents).toBe(itemised.homeInsuranceMonthlyCents);
    expect(carry?.groceriesCents).toBe(itemised.homeGroceriesCents);
    expect(carry?.maintenanceMonthlyCents).toBe(itemised.homeMaintenanceMonthlyCents);
    expect(carry?.transportCents).toBe(itemised.homeTransportCents);
  });

  it('When the categories are entered, Then the engine totals them rather than counting one line', () => {
    const { inHome } = breakEvenScenarios({ ...INITIAL_STATE, ...itemised });
    expect(housingCarryMonthlyCents(inHome)).toBe(itemisedTotal);
  });

  it('When only some categories are filled, Then the untouched ones contribute zero', () => {
    const { inHome } = breakEvenScenarios({
      ...INITIAL_STATE,
      homeGroceriesCents: 50_000,
      homeUtilitiesCents: 24_000,
    });
    expect(housingCarryMonthlyCents(inHome)).toBe(74_000);
  });

  it('When a plan predating this feature is loaded, Then its lump sum still totals to the same figure', () => {
    // Backward compatibility: housingCarryMonthlyCents always meant
    // "everything", and for a family that itemises nothing it still does.
    const { inHome } = breakEvenScenarios({
      ...INITIAL_STATE,
      housingCarryMonthlyCents: 250_000,
    });
    expect(housingCarryMonthlyCents(inHome)).toBe(250_000);
  });

  it('When a lump sum and itemised lines are both present, Then the total is their sum and nothing is double counted', () => {
    const { inHome } = breakEvenScenarios({
      ...INITIAL_STATE,
      housingCarryMonthlyCents: 30_000,
      ...itemised,
    });
    expect(housingCarryMonthlyCents(inHome)).toBe(itemisedTotal + 30_000);
  });

  it('When an hourly-care scenario is built from the planner, Then it carries the itemised lines too', () => {
    // The other mapping site. Both zeroed the same six fields, so a fix to one
    // and not the other would leave the main planner path broken (§9.3).
    const scenario = primaryScenario({ ...INITIAL_STATE, careType: 'in_home_health_aide', ...itemised });
    expect(housingCarryMonthlyCents(scenario)).toBe(itemisedTotal);
  });
});

describe('Given a ledger entry with an attached receipt (spec §11.14)', () => {
  it('When a plan is built from the planner state, Then receiptPhotoId does not survive into it', () => {
    // Plan is the domain contract that export and the shared family link
    // (spec §11.6) both speak. receiptPhotoId is a local IndexedDB key that
    // means nothing outside this browser, and it must not travel into either
    // — the same reason `facilities`/`photoIds` never appear on Plan at all.
    const state: PlannerState = {
      ...INITIAL_STATE,
      contributors: makeContributors(1),
      ledger: [
        {
          id: 'l1',
          contributorId: 'c1',
          date: '2026-02-01',
          amountCents: 4_500,
          category: 'medication',
          taxDeductibleCandidate: true,
          receiptPhotoId: 'receipt-abc123',
        },
      ],
    };

    const plan = buildPlan(state);

    expect(plan.ledger).toHaveLength(1);
    expect('receiptPhotoId' in plan.ledger[0]).toBe(false);
    // Every other field on the entry still made it through untouched.
    expect(plan.ledger[0]).toMatchObject({
      id: 'l1',
      contributorId: 'c1',
      date: '2026-02-01',
      amountCents: 4_500,
      category: 'medication',
      taxDeductibleCandidate: true,
    });
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });

  it('When a ledger entry has no attached receipt, Then the plan still builds and the field is simply absent', () => {
    const state: PlannerState = {
      ...INITIAL_STATE,
      contributors: makeContributors(1),
      ledger: [
        {
          id: 'l1',
          contributorId: 'c1',
          date: '2026-02-01',
          amountCents: 4_500,
          category: 'medication',
          taxDeductibleCandidate: true,
        },
      ],
    };

    const plan = buildPlan(state);

    expect('receiptPhotoId' in plan.ledger[0]).toBe(false);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });
});
