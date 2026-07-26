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
  STORAGE_KEY,
  type StorageLike,
} from './storage';
import { DEFAULT_ASSUMPTIONS, type Plan } from './schemas';

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
