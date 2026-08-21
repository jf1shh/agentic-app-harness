/**
 * Local persistence boundary for the Pro/free feature tier and the daily
 * free-credit allowance.
 *
 * This is the same untrusted boundary `src/lib/storage.ts` already guards for
 * restaurants and reservations (.agents/AGENTS.md §1), and it needs the same
 * treatment for the same reasons:
 *
 *   1. `localStorage` access *throws* — it is not merely empty — when the
 *      browser denies storage (Android WebView with DOM storage disabled, a
 *      private window, or site data blocked). These values are read while the
 *      provider is constructing its initial state at the root of the tree, so
 *      an unguarded throw takes the whole app down to a blank page rather
 *      than degrading to the free tier.
 *   2. A stored tier is untrusted text. Anything that is not exactly 'free'
 *      or 'pro' must fall back to 'free' — the safe tier — rather than being
 *      cast through `as PlanTier` and carried around as a lie about its type.
 *   3. A stored credit count is untrusted text too. `parseInt('')` and
 *      `parseInt('abc')` are both `NaN`, and `NaN` fails every `> 0` test, so
 *      a corrupted value silently locks a free user out of their allowance —
 *      and, because the provider writes state back on change, `NaN.toString()`
 *      persists `"NaN"` and makes the lockout survive every future reload.
 */
import { z } from 'zod';

export type PlanTier = 'free' | 'pro';

export const PlanTierSchema = z.enum(['free', 'pro']);

export const DAILY_FREE_CREDITS = 3;

export const STORAGE_KEY_PLAN = 'mooddiner_plan_tier';
export const STORAGE_KEY_CREDITS = 'mooddiner_daily_credits';
export const STORAGE_KEY_DATE = 'mooddiner_credit_date';

/**
 * A credit balance is a whole number of credits between zero and the daily
 * allowance. `z.coerce` is deliberately not used: it would turn `null` into 0
 * and an empty string into 0, quietly converting "nothing stored" into "no
 * credits left" — the exact lockout this module exists to prevent.
 */
export const CreditBalanceSchema = z.number().int().min(0).max(DAILY_FREE_CREDITS);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Read a key, treating a throwing storage the same as an absent value. */
function safeGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/** Write a key, treating a throwing storage as a no-op rather than a crash. */
export function safeSet(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to save to localStorage key "${key}"`, e);
  }
}

/** The stored feature tier, or 'free' when absent, unreadable or invalid. */
export function loadPlanTier(storage: StorageLike): PlanTier {
  const result = PlanTierSchema.safeParse(safeGet(storage, STORAGE_KEY_PLAN));
  return result.success ? result.data : 'free';
}

export function savePlanTier(storage: StorageLike, plan: PlanTier): void {
  safeSet(storage, STORAGE_KEY_PLAN, plan);
}

/**
 * The credit balance for today, resetting to a full allowance whenever the
 * stored date is not `today`. A corrupt or out-of-range balance resets to the
 * full allowance rather than to zero: the failure mode of handing a free user
 * one extra day of credits is strictly better than silently withholding the
 * allowance the app promises them.
 */
export function loadCreditsForToday(storage: StorageLike, today: string): number {
  if (safeGet(storage, STORAGE_KEY_DATE) !== today) {
    safeSet(storage, STORAGE_KEY_DATE, today);
    safeSet(storage, STORAGE_KEY_CREDITS, String(DAILY_FREE_CREDITS));
    return DAILY_FREE_CREDITS;
  }

  const raw = safeGet(storage, STORAGE_KEY_CREDITS);
  if (raw === null || raw.trim() === '') return DAILY_FREE_CREDITS;

  const result = CreditBalanceSchema.safeParse(Number(raw));
  return result.success ? result.data : DAILY_FREE_CREDITS;
}

export function saveCredits(storage: StorageLike, credits: number): void {
  safeSet(storage, STORAGE_KEY_CREDITS, String(credits));
}
