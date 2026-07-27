/**
 * Tour photos (spec §11.2.4).
 *
 * The risk in this file is not privacy, it is **quota**, and the failure it
 * exists to prevent is severe: `localStorage` holds about 5MB per origin and
 * the plan payload lives there. A single phone photo base64-encoded is 4–5MB on
 * its own, so storing images beside the plan means a `QuotaExceededError` on
 * the *plan* write — a family loses thirty ledger entries because they attached
 * a picture of a dining room, and nothing on screen explains why.
 *
 * Hence the rules this module enforces:
 *
 *  - Photos live in **IndexedDB**, in a database the plan payload does not
 *    share. A photo write that fails cannot fail a plan write. That separation
 *    is the entire reason this is not three lines inside `storage.ts`.
 *  - Images are **downscaled before storing** (longest edge ≤ 1280px, JPEG
 *    q0.7). Original bytes are never retained.
 *  - Caps are **visible and enforced** — a limit a family can see beats a write
 *    that fails at the worst possible moment.
 *  - `PlannerState` stores photo *ids*, never bytes, so the stored plan cannot
 *    grow with the images.
 *
 * Everything here is browser-only and defensive: in a server render, in a
 * private mode that has disabled IndexedDB, or in a unit-test process, the
 * functions return a stated failure rather than throwing.
 */

const DB_NAME = 'elder-care-planner:photos';
const DB_VERSION = 1;
const STORE = 'photos';

/** Longest edge, in CSS pixels, after downscaling. */
export const MAX_EDGE_PX = 1280;
export const JPEG_QUALITY = 0.7;

/** Per-facility and overall caps (spec §11.2.4). */
export const MAX_PHOTOS_PER_FACILITY = 6;
export const MAX_PHOTOS_TOTAL = 40;

/** Fraction of the storage estimate at which the family is warned. */
export const QUOTA_WARN_FRACTION = 0.8;

export type PhotoFailure =
  | 'unsupported' // no IndexedDB here (server render, or disabled)
  | 'quota' // the browser refused the write
  | 'decode' // the file was not an image this browser can read
  | 'cap' // the family's own limit, not the browser's
  | 'failed'; // anything else, reported rather than swallowed

export type PhotoResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: PhotoFailure };

function fail<T>(reason: PhotoFailure): PhotoResult<T> {
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
  // Never round down to zero — a 4000×3 panorama is degenerate but is still an
  // image, and a zero-width canvas throws.
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** Pure: whether another photo is allowed, and why not when it is not. */
export function capCheck(
  photosOnThisFacility: number,
  photosInTotal: number,
): PhotoResult<true> {
  if (photosOnThisFacility >= MAX_PHOTOS_PER_FACILITY) return fail('cap');
  if (photosInTotal >= MAX_PHOTOS_TOTAL) return fail('cap');
  return { ok: true, value: true };
}

export function photosAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!photosAvailable()) return Promise.resolve(null);
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
 * `createImageBitmap` is used in preference to an `<img>` element because it
 * decodes off the main thread and, unlike an object URL, cannot leak a URL if
 * the caller forgets to revoke it.
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

function put(db: IDBDatabase, id: string, blob: Blob): Promise<PhotoResult<string>> {
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
 * The id goes into `FacilityNote.photoIds`; the bytes never touch the plan.
 */
export async function storePhoto(file: Blob, id: string): Promise<PhotoResult<string>> {
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

export async function loadPhoto(id: string): Promise<Blob | null> {
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

export async function deletePhoto(id: string): Promise<void> {
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

/** Every photo in the store, so "forget everything on this device" means it. */
export async function clearPhotos(): Promise<void> {
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
export function photoFailureMessage(reason: PhotoFailure): string {
  switch (reason) {
    case 'cap':
      return `This plan holds up to ${MAX_PHOTOS_PER_FACILITY} photos per community and ${MAX_PHOTOS_TOTAL} in total. Removing one makes room for another.`;
    case 'quota':
      return 'This browser refused to store the photo — its storage for this site is full. The plan itself is unaffected and has been saved; removing a few photos will make room.';
    case 'decode':
      return 'That file could not be read as an image. JPEG, PNG and HEIC photos from a phone all work.';
    case 'unsupported':
      return 'This browser does not make local photo storage available, so photos cannot be kept here. Everything else on this page still works.';
    default:
      return 'The photo could not be stored. The plan itself is unaffected and has been saved.';
  }
}
