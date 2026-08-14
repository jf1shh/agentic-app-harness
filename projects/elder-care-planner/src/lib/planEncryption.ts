/**
 * Encryption at rest for the persisted planner state (spec §4.1; decision
 * recorded in spec §4.1a).
 *
 * The key is device-bound: a non-extractable AES-GCM-256 `CryptoKey`,
 * generated once per device and held in IndexedDB (a store the plan payload
 * does not share — the same separation `photos.ts` uses, for the same
 * reason). There is no passphrase and nothing for a family to remember or
 * lose; the trade-off, stated plainly, is that this protects the figures
 * from another app or process reading raw `localStorage` (or a stray backup
 * of it), but not from someone with access to the same unlocked browser
 * profile — see `.agents/AGENTS.md` §11 and spec §4.1a for why that trade
 * was chosen over a `legal-financial-rag`-style passphrase gate.
 *
 * `globalThis.crypto`, not `window.crypto`: this module's key-derivation
 * logic runs under Vitest's `environment: 'node'` (see vitest.config.ts),
 * same reasoning as `share.ts`. The IndexedDB half is browser-only and
 * degrades to `null` everywhere else (server render, a disabled-storage
 * private mode, or the Node test process) — the same defensive shape
 * `photos.ts` already uses for the same reason.
 */
import { bytesToBase64Url, base64UrlToBytes } from './share';

// Exported for E2E tests that need to read the raw key store or envelope
// format directly (`e2e/support.ts`'s `readStoredPlannerState`) — Playwright
// runs that helper inside the page itself, where there is no way to import
// this module, only to reproduce its constants.
export const DB_NAME = 'elder-care-planner:keys';
const DB_VERSION = 1;
export const STORE = 'keys';
export const KEY_ID = 'plan-encryption-key';
const IV_BYTES = 12;

/** Prefix distinguishing an encrypted envelope from a legacy plaintext payload. */
export const ENCRYPTED_PREFIX = 'encv1.';

export type DeviceKeyProvider = () => Promise<CryptoKey | null>;

export function deviceKeyAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!deviceKeyAvailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function getStoredKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(STORE, 'readonly');
    } catch {
      resolve(null);
      return;
    }
    const request = tx.objectStore(STORE).get(KEY_ID);
    request.onsuccess = () => resolve((request.result as CryptoKey | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
}

function putKey(db: IDBDatabase, key: CryptoKey): Promise<boolean> {
  return new Promise((resolve) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(STORE, 'readwrite');
    } catch {
      resolve(false);
      return;
    }
    tx.objectStore(STORE).put(key, KEY_ID);
    tx.oncomplete = () => resolve(true);
    tx.onabort = () => resolve(false);
    tx.onerror = () => resolve(false);
  });
}

async function loadOrCreateKey(): Promise<CryptoKey | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    const existing = await getStoredKey(db);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    const stored = await putKey(db, key);
    return stored ? key : null;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/**
 * Cached for the life of the tab. Repeated saves — the debounced autosave and
 * the pagehide/visibilitychange flush (`app/page.tsx`) — must not re-open
 * IndexedDB on every keystroke, and the flush handlers in particular need the
 * key already in hand: `pagehide` gives no guarantee that a fresh async
 * IndexedDB round trip completes before the page is torn down, while a single
 * already-resolved `crypto.subtle.encrypt` call over an in-memory key
 * reliably does.
 */
let cachedKey: Promise<CryptoKey | null> | null = null;

/** The device's own plan-encryption key: generated once, cached in IndexedDB. */
export function getOrCreateDeviceKey(): Promise<CryptoKey | null> {
  if (!cachedKey) cachedKey = loadOrCreateKey();
  return cachedKey;
}

/** Test-only: drop the in-memory cache so the next call re-resolves it. */
export function resetDeviceKeyCache(): void {
  cachedKey = null;
}

/**
 * Removes the device key. Part of "forget everything on this device"
 * (`eraseEverything` in `app/page.tsx`) — the same "a separate store needs a
 * separate erase" discipline `clearPhotos`/`clearReceipts` already follow,
 * even though the key alone (with no ciphertext) discloses nothing about a
 * family's figures on its own.
 */
export async function clearDeviceKey(): Promise<void> {
  resetDeviceKeyCache();
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, 'readwrite');
      } catch {
        resolve();
        return;
      }
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onabort = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

/** Encrypt a plaintext string under an already-obtained key. Exported for direct testing. */
export async function encryptWithKey(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const bytes = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    bytes as unknown as BufferSource,
  );
  const segments = [bytesToBase64Url(iv), bytesToBase64Url(new Uint8Array(cipherBuffer))];
  return `${ENCRYPTED_PREFIX}${segments.join('.')}`;
}

/**
 * Decrypt an envelope produced by `encryptWithKey`. Every failure mode — a
 * malformed envelope, a wrong/missing key, a tampered ciphertext (AES-GCM's
 * authentication tag) — collapses to `null`, the same "one clean failure"
 * shape `share.ts`'s `decodePlanFromShare` already uses and for the same
 * reason: nothing here should tell a caller *why* it failed.
 */
export async function decryptWithKey(key: CryptoKey, envelope: string): Promise<string | null> {
  try {
    if (!envelope.startsWith(ENCRYPTED_PREFIX)) return null;
    const segments = envelope.slice(ENCRYPTED_PREFIX.length).split('.');
    if (segments.length !== 2 || segments.some((s) => s.length === 0)) return null;
    const [ivB64, cipherB64] = segments;
    const iv = base64UrlToBytes(ivB64);
    const cipherBytes = base64UrlToBytes(cipherB64);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      cipherBytes as unknown as BufferSource,
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}
