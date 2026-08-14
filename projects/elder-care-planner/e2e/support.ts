import { expect, type Page } from '@playwright/test';
import { ENCRYPTED_PREFIX, DB_NAME, STORE, KEY_ID } from '../src/lib/planEncryption';
import { PLANNER_STATE_KEY } from '../src/lib/storage';

/**
 * Open the planner and wait until it is genuinely ready to be typed into.
 *
 * Two things have to have happened before the first interaction, and neither is
 * a network event, so `waitForLoadState` cannot see either:
 *
 *  1. React has hydrated. A `fill()` before that sets the DOM value, fires an
 *     input event nobody is listening for, and is reverted by the first client
 *     render — silently (.agents/AGENTS.md §6).
 *  2. The saved plan has been restored from localStorage. A `fill()` in the
 *     window before that is overwritten when the restore lands, which looks
 *     identical to the app ignoring the input.
 *
 * The page sets `data-planready` from the effect that finishes the restore, so
 * waiting on it covers both: the effect cannot have run before hydration.
 */
export async function gotoPlanner(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
}

/**
 * Expand one of the collapsible sections (spec §5.1a).
 *
 * Every section after the results card is closed on arrival, so a spec that
 * wants to touch a control inside one has to open it first. Clicking the
 * `summary` would *toggle* rather than open — a section left open by an earlier
 * step in the same test would be closed by it, and the failure would surface
 * three actions later on a control that had been on screen a moment before.
 * Setting `open` is idempotent, which is what a test helper needs to be.
 */
export async function openSection(page: Page, id: string) {
  const details = page.getByTestId(`section-${id}`);
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  // The section body is inert until the browser has applied `open`; asserting
  // it here fails at the helper rather than at whatever the caller did next.
  await expect(details.locator('.section-body')).toBeVisible();
}

/** Open every collapsible section, for audits that must see the whole page. */
export async function openAllSections(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLDetailsElement>('details[data-print-open]')
      .forEach((d) => (d.open = true));
  });
}

/** Parse a rendered "$1,234.56" cell back into integer cents. */
export function cents(text: string): number {
  return Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100);
}

/**
 * Wait for the debounced autosave to actually land (spec §4.1a), as an
 * encrypted envelope, before doing anything that depends on it having
 * landed — reloading, or measuring the stored payload's size. Written
 * against the `encv1.` envelope shape rather than any plaintext content, so
 * it works regardless of which figure was just typed.
 */
export async function waitForEncryptedSave(page: Page): Promise<void> {
  await page.waitForFunction(
    ({ key, prefix }) => {
      const raw = window.localStorage.getItem(key);
      return raw !== null && raw.startsWith(prefix);
    },
    { key: PLANNER_STATE_KEY, prefix: ENCRYPTED_PREFIX },
  );
}

/**
 * Decrypt and parse the currently-stored `PlannerState`, for the rare test
 * that genuinely needs to inspect the underlying data shape (e.g. proving an
 * array has no duplicate entry) rather than just synchronizing on the write
 * having landed — most tests want `waitForEncryptedSave` instead. Runs
 * entirely inside the page: the device key is a non-extractable `CryptoKey`
 * that never leaves the browser, so there is no way to decrypt from the Node
 * side of the test.
 */
export async function readStoredPlannerState(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    async ({ key, prefix, dbName, store, keyId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.startsWith(prefix)) {
        throw new Error(`expected an encrypted envelope at "${key}", got: ${String(raw)}`);
      }
      const [ivB64, cipherB64] = raw.slice(prefix.length).split('.');
      const toBytes = (b64url: string) => {
        const padded = b64url.replace(/-/g, '+').replace(/_/g, '/')
          .padEnd(b64url.length + ((4 - (b64url.length % 4)) % 4), '=');
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      };
      const iv = toBytes(ivB64);
      const cipherBytes = toBytes(cipherB64);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const key_ = await new Promise<CryptoKey>((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(keyId);
        req.onsuccess = () => resolve(req.result as CryptoKey);
        req.onerror = () => reject(req.error);
      });
      db.close();
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as BufferSource },
        key_,
        cipherBytes as unknown as BufferSource,
      );
      return JSON.parse(new TextDecoder().decode(plainBuffer)) as Record<string, unknown>;
    },
    { key: PLANNER_STATE_KEY, prefix: ENCRYPTED_PREFIX, dbName: DB_NAME, store: STORE, keyId: KEY_ID },
  );
}
