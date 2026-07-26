/**
 * Local persistence boundary.
 *
 * Everything read back from localStorage or an imported file is untrusted and
 * is validated against the Zod contract before it reaches the rest of the app
 * (.agents/AGENTS.md §1). A corrupt or hand-edited payload yields null rather
 * than a half-valid Plan that breaks somewhere deeper.
 *
 * There is no network path here on purpose — see spec §1.1/§1.2. Local-only is
 * what makes families willing to type real numbers, and real numbers are what
 * make every downstream figure worth anything.
 */
import { PlanSchema, type Plan } from './schemas';

export const STORAGE_KEY = 'elder-care-planner:plan:v1';

/** Minimal shape we need, so the parser can be tested without a DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Validate an unknown payload as a Plan. Returns null when it does not conform. */
export function parsePlan(raw: unknown): Plan | null {
  const result = PlanSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** Parse a JSON string into a validated Plan, or null. */
export function parsePlanJson(json: string): Plan | null {
  try {
    return parsePlan(JSON.parse(json));
  } catch {
    return null;
  }
}

export function loadPlan(storage: StorageLike): Plan | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  return parsePlanJson(raw);
}

export function savePlan(storage: StorageLike, plan: Plan): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function clearPlan(storage: StorageLike): void {
  storage.removeItem(STORAGE_KEY);
}

/** Serialise a plan for download. Round-trips exactly through parsePlanJson. */
export function exportPlanJson(plan: Plan): string {
  return JSON.stringify(plan, null, 2);
}

/** The browser's localStorage, or null during server rendering / static export. */
export function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can throw in private browsing modes. The app still works; it just
    // will not remember anything.
    return null;
  }
}
