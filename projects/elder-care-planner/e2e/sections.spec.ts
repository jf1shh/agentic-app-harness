import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * The collapsed information architecture (spec §5.1a).
 *
 * The page used to render twelve full-height cards at once, so reaching the
 * printable summary meant scrolling past every refinement panel in the app.
 * Everything after the results is now a disclosure section, which only works if
 * two things hold: the answer §5.1 promises is still on screen without a click,
 * and a closed section still reports the figure a reader came for. A collapse
 * that satisfied only the first would have made the app shorter and less
 * useful.
 */
test.describe('BDD Spec: The page opens on the answer, not on twelve panels', () => {
  test('Given a first visit, When the page loads, Then triage and the answer are open and everything after them is closed', async ({
    page,
  }) => {
    // Given a family arriving for the first time
    await gotoPlanner(page);

    // Then the answer is on screen with nothing to click
    await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The answer' })).toBeVisible();
    await expect(page.getByTestId('all-in')).toBeVisible();

    // And every section after it is collapsed
    for (const id of [
      'refine',
      'breakeven',
      'split',
      'ledger',
      'facilities',
      'il',
      'methodology',
      'benefits',
      'questions',
      'summary',
    ]) {
      await expect(page.getByTestId(`section-${id}`).locator('.section-body')).toBeHidden();
    }
  });

  test('Given the page is collapsed, When its full height is measured, Then it is a fraction of the expanded page', async ({
    page,
  }) => {
    // The whole point of the change, asserted rather than assumed — a collapse
    // that saved no scrolling would be pure ceremony.
    await gotoPlanner(page);
    const collapsed = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => {
      document
        .querySelectorAll<HTMLDetailsElement>('details[data-print-open]')
        .forEach((d) => (d.open = true));
    });
    const expanded = await page.evaluate(() => document.body.scrollHeight);

    expect(collapsed).toBeLessThan(expanded / 2);
  });

  test('Given a closed section, When its status line is read, Then it states the same figure the open panel shows', async ({
    page,
  }) => {
    // Given three people sharing the cost
    await gotoPlanner(page);
    await page.getByLabel('How many family members will share the cost?').fill('3');

    // When the split section is read without being opened
    const status = page.getByTestId('status-split');
    await expect(status).toContainText('Equally — 3 sharing');
    const stated = (await status.textContent()) ?? '';
    const monthly = stated.match(/\$[\d,]+/)?.[0];
    expect(monthly).toBeTruthy();

    // Then opening it shows the same total, rather than a second opinion of it
    await openSection(page, 'split');
    const shares = await page.locator('[data-testid^="share-c"]').allTextContents();
    const toCents = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, '')) * 100);
    const sum = shares.reduce((acc, s) => acc + toCents(s), 0);
    // The status line rounds to whole dollars; the table is shown to the cent.
    // Both must describe the same amount (.agents/AGENTS.md §6, total-and-parts).
    expect(Math.round(sum / 100)).toBe(toCents(monthly ?? '0') / 100);
  });

  test('Given the split method is changed, When the section is closed again, Then its status line has followed the change', async ({
    page,
  }) => {
    // A status line computed once and left behind would be worse than none.
    await gotoPlanner(page);
    await openSection(page, 'split');
    await page.getByLabel('How should the cost be divided?').selectOption('income_proportional');

    await expect(page.getByTestId('status-split')).toContainText('In proportion to income');
  });

  test('Given the shortlist, When communities are added, Then its status line counts them without ranking them', async ({
    page,
  }) => {
    // §11.2 declines to name a best community on purpose, and a status line is
    // not a licence to overturn that from outside the panel.
    await gotoPlanner(page);
    await expect(page.getByTestId('status-facilities')).toHaveText('Nothing added yet');

    await openSection(page, 'facilities');
    await page.getByTestId('add-facility').click();
    await expect(page.getByTestId('status-facilities')).toHaveText('1 community visited');

    await page.getByTestId('add-facility').click();
    await expect(page.getByTestId('status-facilities')).toHaveText('2 communities visited');
  });

  test('Given a payment is logged, When the ledger is closed, Then its status line reports who is behind', async ({
    page,
  }) => {
    // The one thing a family opens the ledger to check.
    await gotoPlanner(page);
    await expect(page.getByTestId('status-ledger')).toHaveText('Nothing logged yet');

    await openSection(page, 'ledger');
    await page.getByLabel('Months of care paid for so far').fill('2');
    await page.getByLabel('When?').fill('2026-02-01');
    await expect(page.getByLabel('When?')).toHaveValue('2026-02-01');
    await page.getByLabel('How much?').fill('500');
    await page.getByTestId('add-ledger-entry').click();

    await expect(page.getByTestId('status-ledger')).toContainText('1 logged, $500 paid');
    await expect(page.getByTestId('status-ledger')).toContainText('behind');
  });

  test('Given a quoted price is entered, When the refinement section is closed, Then its status line says the estimate is no longer a median', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await expect(page.getByTestId('status-refine')).toContainText('Using the published median');

    await openSection(page, 'refine');
    await page.getByLabel('Quoted monthly price, if there is one').fill('7200');

    await expect(page.getByTestId('status-refine')).toHaveText('Using a quoted $7,200 a month');
  });

  test('Given the jump bar, When its entries are compared with the page, Then it lists exactly the sections that exist', async ({
    page,
  }) => {
    // An entry pointing at a section that is not rendered is a broken link, and
    // a section with no entry cannot be reached except by scrolling — which is
    // the thing the bar exists to replace. Asserting the two sets are equal
    // catches both directions, and keeps catching them as sections are added.
    await gotoPlanner(page);

    const ids = (attr: string) =>
      page.evaluate(
        (prefix) =>
          [...document.querySelectorAll(`[data-testid^="${prefix}"]`)]
            .map((el) => el.getAttribute('data-testid')!.slice(prefix.length))
            .sort(),
        attr,
      );

    expect(await ids('nav-')).toEqual(await ids('section-'));

    // And the correspondence survives a change that alters what is on the page
    await page.getByLabel('How many family members will share the cost?').fill('0');
    expect(await ids('nav-')).toEqual(await ids('section-'));
  });
});
