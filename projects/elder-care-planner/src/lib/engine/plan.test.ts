import { describe, it, expect } from 'vitest';
import {
  activeScenario,
  aideHourlyRateCents,
  buildRunwayInput,
  computeBreakEvenForPlan,
  computePlan,
} from './plan';
import type { CareScenario, Plan } from '../schemas';

// Mutation testing (node scripts/run-mutation.mjs elder-care-planner --mutate
// "src/lib/engine/plan.ts","src/lib/plannerState.ts") found plan.ts at 37%.
// Unlike every other engine module, plan.ts has never had a dedicated test
// file at all -- it was only ever exercised indirectly through
// explain/build.test.ts's happy-path fixtures, which never probed the
// orchestration edge cases below.

const baseScenario: CareScenario = {
  id: 's1',
  label: 'Primary',
  careType: 'assisted_living',
  stateCode: 'US',
  fees: { communityFeeCents: 0, careLevelTierCents: 0, annualEscalatorRate: 0.04, addOns: [] },
  ancillary: [],
};

function basePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    careRecipientLabel: 'Mom',
    scenarios: [baseScenario],
    activeScenarioId: 's1',
    income: [],
    assets: [],
    contributors: [],
    ledger: [],
    caregiverImpacts: [],
    assumptions: { careInflationRate: 0.04, generalInflationRate: 0.03, projectionYears: 5, splitMethod: 'equal' },
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('activeScenario', () => {
  it('Given a plan with no scenarios at all, When the active scenario is resolved, Then it is null rather than throwing', () => {
    expect(activeScenario(basePlan({ scenarios: [] }))).toBeNull();
  });

  it('Given an activeScenarioId that matches no scenario, When resolved, Then it falls back to the first scenario rather than returning null', () => {
    const plan = basePlan({ activeScenarioId: 'does-not-exist' });
    expect(activeScenario(plan)).toBe(plan.scenarios[0]);
  });

  it('Given an activeScenarioId that matches a non-first scenario, When resolved, Then that exact scenario is returned', () => {
    const second: CareScenario = { ...baseScenario, id: 's2', label: 'Second' };
    const plan = basePlan({ scenarios: [baseScenario, second], activeScenarioId: 's2' });
    expect(activeScenario(plan)).toBe(second);
  });
});

describe('aideHourlyRateCents', () => {
  it('Given a state with no state-level figure (every state, since STATE_MEDIANS is empty), When the hourly rate is resolved, Then it returns the real national median rather than the zero catch-all', () => {
    const rate = aideHourlyRateCents('US');
    expect(rate).toBeGreaterThan(0);
  });
});

describe('buildRunwayInput — contributor capacity', () => {
  it('Given no contributors have a monthly capacity entered, When the runway input is built, Then contributorCapacityCents is undefined rather than zero', () => {
    const plan = basePlan({ contributors: [] });
    const input = buildRunwayInput(plan, baseScenario);
    expect(input.contributorCapacityCents).toBeUndefined();
  });

  it('Given two contributors with monthly capacities entered, When the runway input is built, Then contributorCapacityCents is their sum', () => {
    const plan = basePlan({
      contributors: [
        { id: 'c1', name: 'A', monthlyCapacityCents: 30_000, providesUnpaidHoursPerWeek: 0, ownsTasks: [] },
        { id: 'c2', name: 'B', monthlyCapacityCents: 45_000, providesUnpaidHoursPerWeek: 0, ownsTasks: [] },
      ],
    });
    const input = buildRunwayInput(plan, baseScenario);
    expect(input.contributorCapacityCents).toBe(75_000);
  });
});

describe('computeBreakEvenForPlan', () => {
  it('Given a plan with only a residential scenario and no in-home scenario, When break-even is computed, Then it is null rather than comparing against nothing', () => {
    const plan = basePlan({ scenarios: [baseScenario] });
    expect(computeBreakEvenForPlan(plan)).toBeNull();
  });

  it('Given a plan with only an in-home scenario and no residential scenario, When break-even is computed, Then it is null', () => {
    const inHome: CareScenario = { ...baseScenario, id: 's1', careType: 'in_home_health_aide', hoursPerWeek: 20 };
    const plan = basePlan({ scenarios: [inHome] });
    expect(computeBreakEvenForPlan(plan)).toBeNull();
  });

  it('Given a plan with both an in-home and a residential scenario, When break-even is computed, Then a real comparison is returned', () => {
    const inHome: CareScenario = { id: 'in', label: 'Home', careType: 'in_home_homemaker', stateCode: 'US', hoursPerWeek: 20, ancillary: [] };
    const residential: CareScenario = { ...baseScenario, id: 'res' };
    const plan = basePlan({ scenarios: [inHome, residential] });

    const result = computeBreakEvenForPlan(plan);
    expect(result).not.toBeNull();
    expect(result!.residentialMonthlyCents).toBeGreaterThan(0);
  });

  it('Given an in-home scenario using the other hourly care type (in_home_health_aide), When break-even is computed, Then it is still recognized as the in-home side', () => {
    const inHome: CareScenario = { id: 'in', label: 'Home', careType: 'in_home_health_aide', stateCode: 'US', hoursPerWeek: 20, ancillary: [] };
    const residential: CareScenario = { ...baseScenario, id: 'res' };
    const plan = basePlan({ scenarios: [inHome, residential] });

    expect(computeBreakEvenForPlan(plan)).not.toBeNull();
  });
});

describe('computePlan', () => {
  it('Given a plan with no scenarios, When computed, Then active is null and split is withheld rather than computed against nothing', () => {
    const result = computePlan(basePlan({ scenarios: [] }));
    expect(result.active).toBeNull();
    expect(result.split).toBeNull();
  });

  it('Given a plan whose activeScenarioId is stale (points at a removed scenario), When computed, Then the first remaining scenario becomes active', () => {
    const result = computePlan(basePlan({ activeScenarioId: 'removed-long-ago' }));
    expect(result.active?.scenario.id).toBe('s1');
  });
});
