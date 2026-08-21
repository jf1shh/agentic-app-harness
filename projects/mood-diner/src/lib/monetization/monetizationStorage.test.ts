import { describe, it, expect } from 'vitest';
import {
  loadPlanTier,
  savePlanTier,
  loadCreditsForToday,
  saveCredits,
  DAILY_FREE_CREDITS,
  STORAGE_KEY_PLAN,
  STORAGE_KEY_CREDITS,
  STORAGE_KEY_DATE,
  type StorageLike,
} from './monetizationStorage';

/** An in-memory stand-in for localStorage, seeded with arbitrary raw text. */
function makeStorage(seed: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

/** A storage that denies access outright, as a blocked-site-data browser does. */
function makeDeniedStorage(): StorageLike {
  return {
    getItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
    setItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  };
}

const TODAY = '2026-08-21';

describe('loadPlanTier', () => {
  it('Given a stored tier of "pro", When the tier is loaded, Then it returns "pro"', () => {
    const storage = makeStorage({ [STORAGE_KEY_PLAN]: 'pro' });
    expect(loadPlanTier(storage)).toBe('pro');
  });

  it('Given no stored tier, When the tier is loaded, Then it falls back to "free"', () => {
    expect(loadPlanTier(makeStorage())).toBe('free');
  });

  it('Given a hand-edited tier of "gold", When the tier is loaded, Then it falls back to "free" rather than returning the invalid value', () => {
    const storage = makeStorage({ [STORAGE_KEY_PLAN]: 'gold' });
    expect(loadPlanTier(storage)).toBe('free');
  });

  it('Given a browser that denies storage access, When the tier is loaded, Then it returns "free" instead of throwing', () => {
    expect(() => loadPlanTier(makeDeniedStorage())).not.toThrow();
    expect(loadPlanTier(makeDeniedStorage())).toBe('free');
  });
});

describe('savePlanTier', () => {
  it('Given a browser that denies storage access, When a tier is saved, Then it does not throw', () => {
    expect(() => savePlanTier(makeDeniedStorage(), 'pro')).not.toThrow();
  });
});

describe('loadCreditsForToday', () => {
  it('Given a stored balance from today, When credits are loaded, Then that balance is returned', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '1' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(1);
  });

  it('Given a stored balance from a previous day, When credits are loaded, Then the allowance resets and the new date is persisted', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: '2026-08-20', [STORAGE_KEY_CREDITS]: '0' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(DAILY_FREE_CREDITS);
    expect(storage.data[STORAGE_KEY_DATE]).toBe(TODAY);
    expect(storage.data[STORAGE_KEY_CREDITS]).toBe(String(DAILY_FREE_CREDITS));
  });

  it('Given a spent balance of zero from today, When credits are loaded, Then zero is preserved rather than refilled', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '0' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(0);
  });

  it('Given a corrupt balance of "abc", When credits are loaded, Then the full allowance is returned rather than NaN', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: 'abc' });
    const credits = loadCreditsForToday(storage, TODAY);
    expect(credits).toBe(DAILY_FREE_CREDITS);
    expect(Number.isNaN(credits)).toBe(false);
  });

  it('Given a previously persisted "NaN" balance, When credits are loaded, Then the user is not left permanently locked out', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: 'NaN' });
    const credits = loadCreditsForToday(storage, TODAY);
    expect(credits).toBeGreaterThan(0);
    expect(Number.isNaN(credits)).toBe(false);
  });

  it('Given a balance above the daily allowance, When credits are loaded, Then it is rejected rather than granting unlimited credits', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '9999' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(DAILY_FREE_CREDITS);
  });

  it('Given a negative balance, When credits are loaded, Then it is rejected rather than returned', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '-5' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(DAILY_FREE_CREDITS);
  });

  it('Given a fractional balance, When credits are loaded, Then it is rejected rather than returned', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '1.5' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(DAILY_FREE_CREDITS);
  });

  it('Given an empty stored balance, When credits are loaded, Then the allowance is returned rather than Number("") coercing to zero', () => {
    const storage = makeStorage({ [STORAGE_KEY_DATE]: TODAY, [STORAGE_KEY_CREDITS]: '' });
    expect(loadCreditsForToday(storage, TODAY)).toBe(DAILY_FREE_CREDITS);
  });

  it('Given a browser that denies storage access, When credits are loaded, Then the full allowance is returned instead of throwing', () => {
    const denied = makeDeniedStorage();
    expect(() => loadCreditsForToday(denied, TODAY)).not.toThrow();
    expect(loadCreditsForToday(denied, TODAY)).toBe(DAILY_FREE_CREDITS);
  });
});

describe('saveCredits', () => {
  it('Given a browser that denies storage access, When credits are saved, Then it does not throw', () => {
    expect(() => saveCredits(makeDeniedStorage(), 2)).not.toThrow();
  });

  it('Given a normal storage, When credits are saved, Then the balance is written as text', () => {
    const storage = makeStorage();
    saveCredits(storage, 2);
    expect(storage.data[STORAGE_KEY_CREDITS]).toBe('2');
  });
});
