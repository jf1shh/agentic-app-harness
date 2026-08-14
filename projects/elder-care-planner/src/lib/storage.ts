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
import { PlanSchema, PlannerStateSchema, type Plan, type PlannerState } from './schemas';
import {
  encryptWithKey,
  decryptWithKey,
  getOrCreateDeviceKey,
  ENCRYPTED_PREFIX,
  type DeviceKeyProvider,
} from './planEncryption';

export const STORAGE_KEY = 'elder-care-planner:plan:v1';

/**
 * Where the form is kept between visits.
 *
 * The version lives in the key rather than inside the payload: a future v2
 * simply reads a different key, so an old payload is ignored instead of being
 * half-migrated into a shape the app then has to defend against everywhere.
 */
export const PLANNER_STATE_KEY = 'elder-care-planner:state:v1';

/** Minimal shape we need, so the parser can be tested without a DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// The six functions below operate on a `Plan` under `STORAGE_KEY`. Nothing in
// this app currently calls them — the live persistence path is the
// PlannerState section further down (`savePlannerStateEncrypted` /
// `loadPlannerStateEncrypted`), per spec §4.1 ("why it is the form state
// rather than a Plan"). They stay for the contract itself (`parsePlan`'s
// validation shape) and are not encrypted, since encrypting code nothing
// calls protects nothing.

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

/* ---- The form state, which is what actually persists between visits ---- */

/** Validate an unknown payload as planner state. Null when it does not conform. */
export function parsePlannerState(raw: unknown): PlannerState | null {
  const result = PlannerStateSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parsePlannerStateJson(json: string): PlannerState | null {
  try {
    return parsePlannerState(JSON.parse(json));
  } catch {
    return null;
  }
}

/**
 * Three outcomes, deliberately distinguished.
 *
 * `absent` is a first visit; `invalid` is a payload that failed the contract —
 * a half-written write, a hand-edited key, or data from a future version. The
 * app must not silently start over in the second case: a family that typed
 * thirty ledger entries deserves to be told they are gone rather than left to
 * notice on their own.
 */
export type RestoreResult =
  | { status: 'absent' }
  | { status: 'restored'; state: PlannerState }
  | { status: 'invalid' };

/**
 * Plaintext read/write of the `PlannerState` key. Used directly by nothing in
 * the app any more — `app/page.tsx` calls the encrypted versions below, which
 * wrap these — but kept as the plaintext core both encrypt and the legacy
 * fallback build on, and for tests that don't need the crypto layer.
 */
export function loadPlannerState(storage: StorageLike): RestoreResult {
  const raw = storage.getItem(PLANNER_STATE_KEY);
  if (raw === null) return { status: 'absent' };
  const state = parsePlannerStateJson(raw);
  return state === null ? { status: 'invalid' } : { status: 'restored', state };
}

export function savePlannerState(storage: StorageLike, state: PlannerState): void {
  storage.setItem(PLANNER_STATE_KEY, JSON.stringify(state));
}

/**
 * Encryption at rest (spec §4.1a, .agents/AGENTS.md §11). The stored value is
 * either a legacy plaintext JSON payload or an `encv1.<iv>.<ciphertext>`
 * envelope; `loadPlannerStateEncrypted` tells them apart by prefix, so an
 * existing plan keeps loading unchanged and is transparently re-encrypted on
 * the next save — no explicit migration step.
 *
 * `getKey` defaults to the real device key (IndexedDB-backed,
 * `planEncryption.ts`) but is a parameter so tests can inject a key generated
 * directly in the test process, the same `StorageLike`-injection pattern this
 * module already uses for testability without a DOM.
 */
export async function loadPlannerStateEncrypted(
  storage: StorageLike,
  getKey: DeviceKeyProvider = getOrCreateDeviceKey,
): Promise<RestoreResult> {
  const raw = storage.getItem(PLANNER_STATE_KEY);
  if (raw === null) return { status: 'absent' };
  if (!raw.startsWith(ENCRYPTED_PREFIX)) {
    // Legacy plaintext, or a payload written while the device key was
    // unavailable (see savePlannerStateEncrypted's fallback below).
    const state = parsePlannerStateJson(raw);
    return state === null ? { status: 'invalid' } : { status: 'restored', state };
  }
  const key = await getKey();
  if (!key) return { status: 'invalid' };
  const json = await decryptWithKey(key, raw);
  if (json === null) return { status: 'invalid' };
  const state = parsePlannerStateJson(json);
  return state === null ? { status: 'invalid' } : { status: 'restored', state };
}

/**
 * Encrypts under the device key when one is available; otherwise falls back
 * to a plaintext write rather than silently failing to persist at all — a
 * working, unencrypted autosave is closer to this app's core promise than a
 * broken one (spec §4.1a).
 */
export async function savePlannerStateEncrypted(
  storage: StorageLike,
  state: PlannerState,
  getKey: DeviceKeyProvider = getOrCreateDeviceKey,
): Promise<void> {
  const key = await getKey();
  const json = JSON.stringify(state);
  storage.setItem(PLANNER_STATE_KEY, key ? await encryptWithKey(key, json) : json);
}

export function clearPlannerState(storage: StorageLike): void {
  storage.removeItem(PLANNER_STATE_KEY);
  // The plan key is cleared alongside it: "forget everything on this device"
  // has to mean everything, or the promise is false.
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
