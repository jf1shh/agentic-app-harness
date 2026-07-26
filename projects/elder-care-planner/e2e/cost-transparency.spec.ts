import { test, expect } from '@playwright/test';
import { gotoPlanner } from './support';

/**
 * The headline research finding: the advertised rate is not the price. Care
 * tiers, community fees and add-ons routinely push the real bill well above the
 * brochure figure, and roughly a third of families report paying more than they
 * expected after moving in.
 *
 * If this suite passes while the app quietly shows only the base rate, the app
 * has lost its main reason to exist — so the gap is asserted explicitly.
 */
test.describe('BDD Spec: The real cost is shown, not the advertised one', () => {
  test('Given a facility with a care tier, When the tier is entered, Then the all-in cost rises above the advertised rate', async ({
    page,
  }) => {
    // Given assisted living priced at the published median
    await gotoPlanner(page);
    const advertised = await page.getByTestId('advertised').textContent();
    await expect(page.getByTestId('all-in')).toHaveText(advertised ?? '');

    // When a care-level surcharge is added
    await page.getByLabel('Care-level surcharge, monthly').fill('1500');

    // Then the advertised rate is unchanged but the real cost is higher
    await expect(page.getByTestId('advertised')).toHaveText(advertised ?? '');
    await expect(page.getByTestId('all-in')).not.toHaveText(advertised ?? '');
    await expect(page.getByTestId('all-in')).toContainText('$7,700');
  });

  test('Given tiers and add-on services, When both are applied, Then the percentage gap is stated plainly', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When a tier and two billed-separately services are added
    await page.getByLabel('Care-level surcharge, monthly').fill('1500');
    await page.getByLabel(/Medication management/).check();
    await page.getByLabel(/Incontinence care and supplies/).check();

    // Then the results state how far above the advertised rate this really is
    await expect(page.locator('.callout').first()).toContainText('advertised rate');
    await expect(page.locator('.callout').first()).toContainText('% higher');
  });

  test('Given a one-time community fee, When it is entered, Then month one is called out separately', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When a non-refundable move-in fee is added
    await page.getByLabel('Community or move-in fee, one-time').fill('4000');

    // Then the first month is flagged as different from every other month
    await expect(page.locator('.callout').filter({ hasText: 'Month one' })).toBeVisible();
  });

  test('Given published medians are being used, When results are shown, Then the source and its year are visible', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the results are read
    // Then the figures are traceable rather than anonymous
    const provenance = page.locator('.provenance').first();
    await expect(provenance).toContainText('Cost of Care Survey');
    await expect(provenance).toContainText('2025');
    await expect(provenance).toContainText('national median');
  });
});
