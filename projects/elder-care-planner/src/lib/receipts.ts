/**
 * Receipt photos attached to ledger entries (spec §11.14).
 *
 * A separate store from `lib/photos.ts`'s facility-tour photos, deliberately —
 * see spec §11.14 for the reasoning in full. In short: a family logging
 * ledger entries every week could plausibly attach far more receipts over
 * the life of a plan than the finite, visited-once set of facility tours,
 * and a shared cap would mean photographing a receipt quietly uses up the
 * budget a facility visit needs later, with nothing on screen explaining
 * why. Same architecture as `lib/photos.ts` (IndexedDB, downscaled before
 * storing, caps that are visible and enforced, ids only reach
 * `PlannerState` — never the bytes), applied to a second, independently
 * budgeted binary type rather than sharing the first one's specific caps.
 *
 * Everything here is browser-only and defensive: in a server render, in a
 * private mode that has disabled IndexedDB, or in a unit-test process, the
 * functions return a stated failure rather than throwing.
 */

const DB_NAME = 'elder-care-planner:receipts';
const DB_VERSION = 1;
const STORE = 'receipts';

/** Longest edge, in CSS pixels, after downscaling. Same budget as facility photos. */
export const MAX_EDGE_PX = 1280;
export const JPEG_QUALITY = 0.7;

/** Overall cap (spec §11.14) — independent of §11.2.4's facility-photo cap. */
export const MAX_RECEIPTS_TOTAL = 200;

/** Fraction of the storage estimate at which the family is warned. */
export const QUOTA_WARN_FRACTION = 0.8;

export type ReceiptFailure =
  | 'unsupported' // no IndexedDB here (server render, or disabled)
  | 'quota' // the browser refused the write
  | 'decode' // the file was not an image this browser can read
  | 'cap' // the family's own limit, not the browser's
  | 'failed'; // anything else, reported rather than swallowed

export type ReceiptResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: ReceiptFailure };

function fail<T>(reason: ReceiptFailure): ReceiptResult<T> {
  return { ok: false, reason };
}

/** Pure: the target size for an image, preserving aspect ratio. */
export function scaledSize(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** Pure: whether another receipt is allowed, and why not when it is not. */
export function capCheck(totalReceipts: number): ReceiptResult<true> {
  if (totalReceipts >= MAX_RECEIPTS_TOTAL) return fail('cap');
  return { ok: true, value: true };
}

export function receiptsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!receiptsAvailable()) return Promise.resolve(null);
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

function isQuotaError(error: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Downscale a picked file to a JPEG blob.
 *
 * `createImageBitmap` decodes off the main thread and, unlike an object URL,
 * cannot leak a URL if the caller forgets to revoke it.
 */
async function downscale(file: Blob): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}

function put(db: IDBDatabase, id: string, blob: Blob): Promise<ReceiptResult<string>> {
  return new Promise((resolve) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(STORE, 'readwrite');
    } catch {
      resolve(fail('failed'));
      return;
    }
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve({ ok: true, value: id });
    tx.onabort = () => resolve(fail(isQuotaError(tx.error) ? 'quota' : 'failed'));
    tx.onerror = () => resolve(fail(isQuotaError(tx.error) ? 'quota' : 'failed'));
  });
}

/**
 * Store one picked file, downscaled, and return its id.
 *
 * The id goes into `PlannerLedgerEntry.receiptPhotoId`; the bytes never touch
 * the plan.
 */
export async function storeReceipt(file: Blob, id: string): Promise<ReceiptResult<string>> {
  const db = await openDb();
  if (!db) return fail('unsupported');
  try {
    const blob = await downscale(file);
    if (!blob) return fail('decode');
    return await put(db, id, blob);
  } catch (error) {
    return fail(isQuotaError(error) ? 'quota' : 'failed');
  } finally {
    db.close();
  }
}

export async function loadReceipt(id: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return await new Promise<Blob | null>((resolve) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, 'readonly');
      } catch {
        resolve(null);
        return;
      }
      const request = tx.objectStore(STORE).get(id);
      request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

export async function deleteReceipt(id: string): Promise<void> {
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
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

/** Every receipt in the store, so "forget everything on this device" means it. */
export async function clearReceipts(): Promise<void> {
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

export interface StorageUsage {
  readonly usedBytes: number;
  readonly quotaBytes: number;
  readonly fraction: number;
  readonly nearLimit: boolean;
}

/**
 * What the browser says is left. Advisory: browsers deliberately report this
 * coarsely, so it drives a warning rather than a refusal.
 */
export async function estimateUsage(): Promise<StorageUsage | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const fraction = quota > 0 ? usage / quota : 0;
    return {
      usedBytes: usage,
      quotaBytes: quota,
      fraction,
      nearLimit: fraction >= QUOTA_WARN_FRACTION,
    };
  } catch {
    return null;
  }
}

/** Plain-language copy for a failed attachment, in the §5.4 neutral register. */
export function receiptFailureMessage(reason: ReceiptFailure): string {
  switch (reason) {
    case 'cap':
      return `This plan holds up to ${MAX_RECEIPTS_TOTAL} receipt photos in total. Removing one makes room for another.`;
    case 'quota':
      return 'This browser refused to store the receipt — its storage for this site is full. The ledger itself is unaffected and has been saved; removing a few receipts will make room.';
    case 'decode':
      return 'That file could not be read as an image. JPEG, PNG and HEIC photos from a phone all work.';
    case 'unsupported':
      return 'This browser does not make local photo storage available, so receipts cannot be kept here. Everything else on this page still works.';
    default:
      return 'The receipt could not be stored. The ledger itself is unaffected and has been saved.';
  }
}
