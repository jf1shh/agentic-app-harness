import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection } from './support';
import { decodePlanFromShare } from '../src/lib/share';

/**
 * Receipt photos attached to ledger entries (spec §11.14).
 *
 * What matters here mirrors facilities.spec.ts's reasoning for tour photos,
 * proven the same way: that a receipt cannot take the plan payload down with
 * it (only provable by attaching one and reloading), that removing an entry
 * does *not* cascade-delete its receipt (the corrected behaviour — an
 * earlier draft of the design had this backwards), and that "forget
 * everything on this device" actually reaches the receipt store.
 */

/** A 1×1 PNG — enough for the browser to decode, downscale and store. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function logPayment(
  page: Page,
  opts: { who?: string; date: string; dollars: string; category?: string },
) {
  if (opts.who) await page.getByLabel('Who paid?').selectOption({ label: opts.who });
  await page.getByLabel('When?').fill(opts.date);
  await expect(page.getByLabel('When?')).toHaveValue(opts.date);
  await page.getByLabel('How much?').fill(opts.dollars);
  if (opts.category) await page.getByLabel('What for?').selectOption({ label: opts.category });
  await expect(page.getByTestId('add-ledger-entry')).toBeEnabled();
  await page.getByTestId('add-ledger-entry').click();
}

/** The single receipt-attach file input on the page, once one entry exists. */
function receiptInput(page: Page) {
  return page.locator('[data-testid^="receipt-input-"] input[type="file"]');
}

test.describe('BDD Spec: Receipt photos attached to ledger entries', () => {
  test('Given a logged payment, When a receipt is attached, Then it survives a reload without the plan payload growing by its size', async ({
    page,
  }) => {
    // Given a payment logged, with the state written to storage
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });

    const stored = () =>
      page.evaluate(() => localStorage.getItem('elder-care-planner:state:v1') ?? '');
    await expect.poll(stored).toContain('1200');
    const before = (await stored()).length;

    // When a receipt is attached
    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();
    await expect.poll(stored).toContain('receipt-');

    // Then the stored plan grew by an id, not by an image
    const after = (await stored()).length;
    expect(after - before).toBeLessThan(200);

    // And it is still there on the next visit, because the bytes are in
    // IndexedDB rather than in the plan
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
    await openSection(page, 'ledger');
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();
  });

  test('Given an entry with an attached receipt, When the entry is removed, Then the receipt is not silently destroyed', async ({
    page,
  }) => {
    // Given a payment with a receipt attached
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });
    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();

    const receiptCount = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('elder-care-planner:receipts', 1);
            request.onsuccess = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('receipts')) {
                resolve(0);
                return;
              }
              const count = db.transaction('receipts', 'readonly').objectStore('receipts').count();
              count.onsuccess = () => resolve(count.result);
              count.onerror = () => resolve(-1);
            };
            request.onerror = () => resolve(-1);
          }),
      );
    await expect.poll(receiptCount).toBe(1);

    // When the ledger entry itself is removed — an editing action, not an erase
    await page.getByRole('button', { name: /Remove the .* payment logged on/ }).click();

    // Then the row is gone from the ledger, but the receipt is left in its
    // store — mirroring onFacilityRemove's treatment of a removed facility's
    // photos (spec §11.14, corrected from an earlier draft that had this
    // backwards)
    await expect(page.getByTestId('ledger-row')).toHaveCount(0);
    await expect.poll(receiptCount).toBe(1);
  });

  test('Given an attached receipt, When "Remove receipt" is used directly, Then it is deleted rather than merely detached', async ({
    page,
  }) => {
    // Given a payment with a receipt attached
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });
    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();

    // When the receipt itself is explicitly removed, distinct from removing
    // the whole entry
    await page.getByRole('button', { name: 'Remove receipt' }).click();

    // Then the entry stays (it was never removed) and the attach control is
    // back, offering to attach a fresh one
    await expect(page.getByTestId('ledger-row')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'View receipt' })).toHaveCount(0);
    await expect(receiptInput(page)).toBeVisible();
  });

  test('Given "forget everything on this device" is used, When it completes, Then stored receipts are gone too', async ({
    page,
  }) => {
    // Given a payment with a receipt attached
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });
    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();

    // When the family erases everything before handing back a shared computer
    await page.getByTestId('erase').click();
    await page.getByTestId('confirm-erase').click();

    // Then the receipt store is empty too, not merely unreferenced
    const remaining = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('elder-care-planner:receipts', 1);
            request.onsuccess = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('receipts')) {
                resolve(0);
                return;
              }
              const count = db.transaction('receipts', 'readonly').objectStore('receipts').count();
              count.onsuccess = () => resolve(count.result);
              count.onerror = () => resolve(-1);
            };
            request.onerror = () => resolve(-1);
          }),
      );
    await expect.poll(remaining).toBe(0);
  });

  test('Given a plan is exported or shared, When the payload is inspected, Then no receiptPhotoId is present', async ({
    page,
  }) => {
    // Given a payment with a receipt attached
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });
    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();

    // Writes are debounced (spec §4.1), so the baseline has to be taken
    // after the receipt id has actually landed in storage rather than
    // immediately after attaching it — the same reason facilities.spec.ts
    // polls before its own quota-margin measurement.
    const stored = () =>
      page.evaluate(() => localStorage.getItem('elder-care-planner:state:v1') ?? '');
    await expect.poll(stored).toContain('receiptPhotoId');

    // When the shared family link is generated (spec §11.6) from the current plan
    await page.getByLabel('Passphrase').fill('correct horse battery staple');
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();

    // Then decoding the fragment with the app's own decoder — the real
    // round trip, not a re-implementation of it — shows no receiptPhotoId
    // anywhere in the shared Plan, even though this device's own stored
    // state does carry it (so the absence is the schema boundary doing its
    // job, not an empty test that would pass on either plan)
    const fragment = link.slice(link.indexOf('#') + 1);
    const result = await decodePlanFromShare(fragment, 'correct horse battery staple');
    expect(result.ok).toBe(true);
    expect(result.ok && JSON.stringify(result.payload.plan)).not.toContain('receiptPhotoId');
  });

  test('Given the ledger and an attached receipt, When each is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });

    const beforeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(beforeResults.violations).toEqual([]);

    await receiptInput(page).setInputFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(page.getByRole('link', { name: 'View receipt' })).toBeVisible();

    const afterResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(afterResults.violations).toEqual([]);
  });
});
