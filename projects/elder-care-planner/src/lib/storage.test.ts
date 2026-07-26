/**
 * Unit tests for the persistence boundary.
 *
 * The contract that matters: anything read back is untrusted and must be
 * validated before the rest of the app sees it. A malformed payload yields null,
 * not a half-valid Plan that breaks somewhere deeper.
 */
import { describe, it, expect } from 'vitest';
import {
  parsePlan,
  parsePlanJson,
  exportPlanJson,
  loadPlan,
  savePlan,
  clearPlan,
  loadPlannerState,
  savePlannerState,
  clearPlannerState,
  STORAGE_KEY,
  PLANNER_STATE_KEY,
  type StorageLike,
} from './storage';
import { DEFAULT_ASSUMPTIONS, PlanSchema, type Plan, type PlannerState } from './schemas';
import { INITIAL_STATE, buildPlan } from './plannerState';

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const plan: Plan = {
  schemaVersion: 1,
  careRecipientLabel: 'Mom',
  scenarios: [
    {
      id: 's1',
      label: 'Assisted living',
      careType: 'assisted_living',
      stateCode: 'TX',
      ancillary: [],
    },
  ],
  activeScenarioId: 's1',
  income: [],
  assets: [],
  contributors: [],
  ledger: [],
  caregiverImpacts: [],
  assumptions: DEFAULT_ASSUMPTIONS,
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('Given a valid plan', () => {
  it('When exported and re-imported, Then the numbers survive unchanged', () => {
    const restored = parsePlanJson(exportPlanJson(plan));
    expect(restored).toEqual(plan);
  });

  it('When saved and loaded from storage, Then it round-trips exactly', () => {
    const storage = memoryStorage();
    savePlan(storage, plan);
    expect(loadPlan(storage)).toEqual(plan);
    expect(storage.data[STORAGE_KEY]).toBeDefined();
  });

  it('When cleared, Then nothing is left behind', () => {
    const storage = memoryStorage();
    savePlan(storage, plan);
    clearPlan(storage);
    expect(loadPlan(storage)).toBeNull();
  });
});

describe('Given untrusted or corrupted stored data', () => {
  it('When the JSON is malformed, Then loading returns null rather than throwing', () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadPlan(storage)).toBeNull();
  });

  it('When a required field is missing, Then validation rejects it', () => {
    expect(parsePlan({ schemaVersion: 1 })).toBeNull();
  });

  it('When a money field is negative, Then validation rejects it', () => {
    const bad = {
      ...plan,
      assets: [
        { id: 'a1', label: 'Savings', kind: 'cash', balanceCents: -100, annualReturnRate: 0, liquid: true },
      ],
    };
    expect(parsePlan(bad)).toBeNull();
  });

  it('When the schema version is unknown, Then it is refused rather than guessed at', () => {
    expect(parsePlan({ ...plan, schemaVersion: 99 })).toBeNull();
  });

  it('When nothing has been stored yet, Then loading returns null', () => {
    expect(loadPlan(memoryStorage())).toBeNull();
  });
});

/* ---- The form state, which is what actually persists between visits ---- */

describe('Given a family that has filled in the planner', () => {
  it('When the plan is saved and reloaded, Then every figure they typed comes back unchanged', () => {
    // Given a plan with entries in every part of the form
    const storage = memoryStorage();
    const typed: PlannerState = {
      ...INITIAL_STATE,
      stateCode: 'CA',
      careType: 'memory_care',
      monthlyIncomeCents: 312_500,
      liquidAssetsCents: 8_400_000,
      careLevelTierCents: 150_000,
      communityFeeCents: 400_000,
      ancillaryMonthlyCents: 45_000,
      compareHoursPerWeek: 55,
      housingCarryMonthlyCents: 210_000,
      monthsElapsed: 7,
      splitMethod: 'income_proportional',
      addOns: INITIAL_STATE.addOns.map((a) => ({ ...a, enabled: true })),
      ledger: [
        {
          id: 'l1',
          contributorId: 'c1',
          date: '2026-02-01',
          amountCents: 120_000,
          category: 'medication',
          note: 'Pharmacy',
          taxDeductibleCandidate: true,
        },
      ],
    };

    // When it is saved and read back
    savePlannerState(storage, typed);
    const result = loadPlannerState(storage);

    // Then nothing was lost on the way through
    expect(result.status).toBe('restored');
    expect(result.status === 'restored' && result.state).toEqual(typed);
  });

  it('When the three fields that a Plan cannot carry are saved, Then they still survive', () => {
    // Given the fields buildPlan() drops — the reason state is persisted, not a Plan
    const storage = memoryStorage();
    savePlannerState(storage, {
      ...INITIAL_STATE,
      monthsElapsed: 9,
      compareHoursPerWeek: 61,
      housingCarryMonthlyCents: 275_000,
    });

    // When the plan is restored
    const result = loadPlannerState(storage);

    // Then the ledger reconciliation and the comparison are not silently reset
    expect(result.status === 'restored' && result.state.monthsElapsed).toBe(9);
    expect(result.status === 'restored' && result.state.compareHoursPerWeek).toBe(61);
    expect(result.status === 'restored' && result.state.housingCarryMonthlyCents).toBe(275_000);
  });
});

describe('Given nothing has ever been saved on this device', () => {
  it('When a restore is attempted, Then it reports an absent plan rather than a failure', () => {
    // Given empty storage
    const storage = memoryStorage();

    // When the plan is restored
    const result = loadPlannerState(storage);

    // Then a first visit is distinguished from a corrupt one
    expect(result.status).toBe('absent');
  });
});

describe('Given a stored plan that does not meet the contract', () => {
  it('When it is not valid JSON, Then the restore reports it as invalid rather than throwing', () => {
    // Given a half-written payload
    const storage = memoryStorage();
    storage.setItem(PLANNER_STATE_KEY, '{"stateCode":"CA",');

    // Then the failure is reportable, not a crash
    expect(loadPlannerState(storage).status).toBe('invalid');
  });

  it('When a field is the wrong shape, Then the whole payload is rejected rather than half-loaded', () => {
    // Given a plan whose income is a string, as a hand-edit or an old version might leave it
    const storage = memoryStorage();
    storage.setItem(
      PLANNER_STATE_KEY,
      JSON.stringify({ ...INITIAL_STATE, monthlyIncomeCents: '2500' }),
    );

    // Then nothing is trusted — a half-valid plan is worse than none, because
    // its numbers would carry the authority of the ones that were fine
    expect(loadPlannerState(storage).status).toBe('invalid');
  });

  it('When a figure is outside its allowed range, Then it is rejected', () => {
    // Given more hours in a week than a week has
    const storage = memoryStorage();
    storage.setItem(
      PLANNER_STATE_KEY,
      JSON.stringify({ ...INITIAL_STATE, hoursPerWeek: 400 }),
    );

    expect(loadPlannerState(storage).status).toBe('invalid');
  });
});

describe('Given a family finished with a shared computer', () => {
  it('When everything is erased, Then both the state and the plan keys are gone', () => {
    // Given a device holding both
    const storage = memoryStorage();
    savePlannerState(storage, INITIAL_STATE);
    savePlan(storage, plan);

    // When the plan is erased
    clearPlannerState(storage);

    // Then "forget everything on this device" meant everything
    expect(storage.getItem(PLANNER_STATE_KEY)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadPlannerState(storage).status).toBe('absent');
  });
});

describe('Given the form state and the domain contract are separate schemas', () => {
  it('When state is restored, Then it still builds a valid Plan for the engines', () => {
    // Given a restored plan
    const storage = memoryStorage();
    savePlannerState(storage, { ...INITIAL_STATE, stateCode: 'NY', monthsElapsed: 4 });
    const result = loadPlannerState(storage);

    // When it is turned into the domain model the engines consume
    const built = result.status === 'restored' ? buildPlan(result.state) : null;

    // Then the two schemas have not drifted apart
    expect(built).not.toBeNull();
    expect(PlanSchema.safeParse(built).success).toBe(true);
  });
});
