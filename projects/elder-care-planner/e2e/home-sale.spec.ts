import { test, expect, type Page } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * Home sale proceeds as a timed liquidity event (spec §11.16).
 *
 * A one-time injection the family enters, not a figure this app estimates —
 * there is no real-estate dataset to derive it from. These specs prove the
 * injection actually reaches the runway simulation at the month entered
 * (rather than, say, landing at month one or being ignored), that it shows
 * up as its own step in the runway derivation, and that it survives a
 * reload like every other figure in the form.
 *
 * The fixture is deliberately hand-computable: a fixed $5,000/month cost
 * against $2,000/month income leaves a flat $3,000 monthly gap, and zeroing
 * the investment return means the savings pot never grows between draws.
 * $9,000 of savings covers exactly three months before the fourth month's
 * draw fails outright — depletion month 4 with no sale, moving to month 6
 * once $6,000 lands in month 2 (verified by hand in the design note and by
 * `runway.test.ts`'s unit coverage of the same injection logic).
 */
async function buildDepletingPlan(page: Page) {
  await page.getByLabel('Their monthly income').fill('2000');
  await page.getByLabel('Savings available for care').fill('9000');

  await openSection(page, 'refine');
  await page.getByLabel('Quoted monthly price, if there is one').fill('5000');
  await page.getByLabel('Assumed annual increase, percent').fill('0');
  await page.getByLabel('Investment return on savings, percent').fill('0');
  await page.getByLabel('Annual rise in income, percent').fill('0');
}

test.describe('BDD Spec: A home sale extends the runway by the amount and timing entered', () => {
  test('Given a plan with no home sale, When savings would run out, Then the depletion figure reflects that', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await buildDepletingPlan(page);

    await expect(page.getByTestId('depletion-months')).toHaveText('4 months');
  });

  test('Given the same plan with a home sale entered, When savings would run out, Then the depletion figure moves out by the sale proceeds', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await buildDepletingPlan(page);
    await expect(page.getByTestId('depletion-months')).toHaveText('4 months');

    // When $6,000 of net proceeds are entered, landing in month 2
    await page.getByLabel('Expected net proceeds from the sale').fill('6000');
    await page.getByLabel('Month the sale is expected to close').fill('2');

    // Then the depletion month moves out — not to zero, not indefinitely, but
    // to the month the arithmetic actually produces once the injection is
    // drawn down alongside the original savings.
    await expect(page.getByTestId('depletion-months')).toHaveText('6 months');
  });

  test('Given a home sale entered, When the runway derivation is opened, Then it shows the injection as its own step', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await buildDepletingPlan(page);
    await page.getByLabel('Expected net proceeds from the sale').fill('6000');
    await page.getByLabel('Month the sale is expected to close').fill('2');
    await expect(page.getByTestId('depletion-months')).toHaveText('6 months');

    await page.getByTestId('why-runway').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Home sale proceeds added to savings in month 2');
    await expect(drawer).toContainText('$6,000.00');
    await expect(drawer).toContainText('entered by the family, not estimated');
  });

  test('Given a home sale entered, When the page is reloaded, Then the figures are still there and still applied', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await buildDepletingPlan(page);
    await page.getByLabel('Expected net proceeds from the sale').fill('6000');
    await page.getByLabel('Month the sale is expected to close').fill('2');
    await expect(page.getByTestId('depletion-months')).toHaveText('6 months');

    const stored = () =>
      page.evaluate(() => localStorage.getItem('elder-care-planner:state:v1') ?? '');
    await expect.poll(stored).toContain('homeSaleProceedsCents');

    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
    await openSection(page, 'refine');

    await expect(page.getByLabel('Expected net proceeds from the sale')).toHaveValue('6000');
    await expect(page.getByLabel('Month the sale is expected to close')).toHaveValue('2');
    await expect(page.getByTestId('depletion-months')).toHaveText('6 months');
  });

  test('Given no home sale is entered, When a plan is shared, Then the shared link still carries the (absent) field validly', async ({
    page,
  }) => {
    // Unlike careCoverage/receiptPhotoId, homeSaleProceeds is a real Plan field
    // (spec §11.16) — there is no exclusion to prove here, only that a plan
    // without one still builds and shares cleanly.
    await gotoPlanner(page);
    await page.getByLabel('Passphrase').fill('correct horse battery staple');
    await page.getByTestId('sharelink-generate').click();
    await expect(page.getByTestId('sharelink-url')).toHaveValue(/#share=/);
  });
});
