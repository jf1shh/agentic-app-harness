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
  loadPlannerStateEncrypted,
  savePlannerStateEncrypted,
  clearPlannerState,
  STORAGE_KEY,
  PLANNER_STATE_KEY,
  type StorageLike,
} from './storage';
import { ENCRYPTED_PREFIX, type DeviceKeyProvider } from './planEncryption';
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

// Encryption at rest (spec §4.1a, .agents/AGENTS.md §11). The real device key
// is IndexedDB-backed and unavailable under Vitest's `environment: 'node'`
// (planEncryption.test.ts covers that "unsupported" path) — these tests
// inject a key generated directly in the test process via the
// `DeviceKeyProvider` parameter, so the full envelope-format/fallback logic
// in storage.ts itself gets real round-trip coverage, not just the
// plaintext-fallback branch.
async function testKeyProvider(): Promise<DeviceKeyProvider> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  return () => Promise.resolve(key);
}

describe('Given a device that can hold an encryption key', () => {
  it('When state is saved and reloaded, Then every figure they typed comes back unchanged', async () => {
    // Given a plan with a distinctive figure and an available device key
    const storage = memoryStorage();
    const getKey = await testKeyProvider();
    const typed: PlannerState = { ...INITIAL_STATE, monthlyIncomeCents: 312_500, stateCode: 'CA' };

    // When it is saved and read back through the encrypted path
    await savePlannerStateEncrypted(storage, typed, getKey);
    const result = await loadPlannerStateEncrypted(storage, getKey);

    // Then nothing was lost on the way through
    expect(result.status).toBe('restored');
    expect(result.status === 'restored' && result.state).toEqual(typed);
  });

  it('When state is saved, Then the raw stored value carries the encrypted envelope prefix and never the plaintext figure', async () => {
    // Given a distinctive income figure
    const storage = memoryStorage();
    const getKey = await testKeyProvider();

    // When it is saved
    await savePlannerStateEncrypted(storage, { ...INITIAL_STATE, monthlyIncomeCents: 312_500 }, getKey);

    // Then what actually landed in storage is an envelope, not JSON a reader could grep
    const raw = storage.getItem(PLANNER_STATE_KEY)!;
    expect(raw.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    expect(raw).not.toContain('312500');
    expect(raw).not.toContain('monthlyIncomeCents');
  });

  it('Given an envelope whose ciphertext was tampered with, When it is loaded, Then it is reported invalid rather than decrypted wrong', async () => {
    // Given a saved, encrypted state
    const storage = memoryStorage();
    const getKey = await testKeyProvider();
    await savePlannerStateEncrypted(storage, INITIAL_STATE, getKey);
    const raw = storage.getItem(PLANNER_STATE_KEY)!;

    // When a byte in the middle of the ciphertext segment is flipped
    const [, ivB64, cipherB64] = raw.split('.');
    const cipherBytes = Uint8Array.from(
      atob(cipherB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    cipherBytes[Math.floor(cipherBytes.length / 2)] ^= 0xff;
    const tamperedB64 = btoa(String.fromCharCode(...cipherBytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    storage.setItem(PLANNER_STATE_KEY, `${ENCRYPTED_PREFIX}${ivB64}.${tamperedB64}`);

    // Then AES-GCM's own authentication catches it — reported, not silently wrong
    const result = await loadPlannerStateEncrypted(storage, getKey);
    expect(result.status).toBe('invalid');
  });

  it('Given a plan encrypted under one device key, When it is loaded with a different key, Then it is reported invalid', async () => {
    // Given a plan saved under one key
    const storage = memoryStorage();
    const originalKey = await testKeyProvider();
    await savePlannerStateEncrypted(storage, INITIAL_STATE, originalKey);

    // When it is read back with a key this device never generated
    const differentKey = await testKeyProvider();
    const result = await loadPlannerStateEncrypted(storage, differentKey);

    // Then it fails cleanly, the same as any other unreadable payload
    expect(result.status).toBe('invalid');
  });

  it('Given an already-encrypted payload, When the device key is no longer available at load time, Then it is reported invalid rather than treated as a first visit', async () => {
    // Given a plan encrypted while a device key existed
    const storage = memoryStorage();
    const keyAtSaveTime = await testKeyProvider();
    await savePlannerStateEncrypted(storage, INITIAL_STATE, keyAtSaveTime);

    // When it is read back after the key became unavailable (e.g. IndexedDB
    // was cleared or disabled between visits) — the envelope is still there,
    // just unreadable
    const noKeyAnymore: DeviceKeyProvider = () => Promise.resolve(null);
    const result = await loadPlannerStateEncrypted(storage, noKeyAnymore);

    // Then this is reported the same as any other unreadable payload, not
    // mistaken for a first visit ('absent') — the family typed real numbers
    // and deserves to be told, not silently started over.
    expect(result.status).toBe('invalid');
  });
});

describe('Given a device that cannot hold an encryption key (no IndexedDB)', () => {
  const noKey: DeviceKeyProvider = () => Promise.resolve(null);

  it('When state is saved, Then it still persists, as plaintext, rather than silently failing to save at all', async () => {
    // Given no device key available
    const storage = memoryStorage();

    // When state is saved anyway
    await savePlannerStateEncrypted(storage, { ...INITIAL_STATE, monthlyIncomeCents: 312_500 }, noKey);

    // Then the family's autosave still works — a working plaintext write beats a broken one
    const raw = storage.getItem(PLANNER_STATE_KEY)!;
    expect(raw.startsWith(ENCRYPTED_PREFIX)).toBe(false);
    const result = await loadPlannerStateEncrypted(storage, noKey);
    expect(result.status === 'restored' && result.state.monthlyIncomeCents).toBe(312_500);
  });
});

describe('Given a plan saved before this app encrypted at rest', () => {
  it('When it is loaded through the encrypted path, Then the legacy plaintext payload still restores', async () => {
    // Given a plaintext payload written by an older version of this app
    const storage = memoryStorage();
    savePlannerState(storage, { ...INITIAL_STATE, monthlyIncomeCents: 275_000 });
    const getKey = await testKeyProvider();

    // When it is restored through the new encrypted-aware loader
    const result = await loadPlannerStateEncrypted(storage, getKey);

    // Then nothing about the family's plan was lost by shipping encryption
    expect(result.status).toBe('restored');
    expect(result.status === 'restored' && result.state.monthlyIncomeCents).toBe(275_000);
  });

  it('When it is saved again, Then it is transparently upgraded to an encrypted envelope', async () => {
    // Given a legacy plaintext payload and a device key now available
    const storage = memoryStorage();
    savePlannerState(storage, INITIAL_STATE);
    const getKey = await testKeyProvider();

    // When the next autosave fires
    await savePlannerStateEncrypted(storage, INITIAL_STATE, getKey);

    // Then the stored value is now the encrypted envelope, with no explicit migration step
    expect(storage.getItem(PLANNER_STATE_KEY)!.startsWith(ENCRYPTED_PREFIX)).toBe(true);
  });
});
