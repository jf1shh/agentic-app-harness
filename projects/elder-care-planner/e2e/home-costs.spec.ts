import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * BDD Spec §11.12 — itemised home-running costs.
 *
 * The gap: `HousingCarryCostSchema` has carried per-line fields since V1 and
 * `engine/cost.ts` already summed them, but `plannerState.ts` hardcoded six of
 * the seven to zero. A family with an itemised budget had one lump-sum box and
 * nowhere to put the detail.
 *
 * These specs assert on the RENDERED strings rather than on state, because the
 * failure that mattered was a figure being accepted by the form and then
 * dropped before it reached the engine — which state assertions would miss.
 * Each fill is followed by a stuck-value check, per the §6 pre-hydration lesson.
 */

async function openBreakdown(page: import('@playwright/test').Page) {
  await openSection(page, 'breakeven');
  const breakdown = page.getByTestId('home-cost-breakdown');
  await breakdown.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  return breakdown;
}

test.describe('BDD Spec: A family can enter the home costs they actually know', () => {
  test('Given figures typed into several categories, When the total is read, Then it is their sum', async ({
    page,
  }) => {
    await gotoPlanner(page);
    const breakdown = await openBreakdown(page);

    const groceries = breakdown.getByLabel('Food and groceries');
    await groceries.fill('500');
    await expect(groceries).toHaveValue('500');

    const utilities = breakdown.getByLabel('Utilities');
    await utilities.fill('240');
    await expect(utilities).toHaveValue('240');

    // Parsed from the rendered string: the §6 total-and-parts rule asks for the
    // figures a reader can actually see, not the engine's numbers.
    await expect(page.getByTestId('home-cost-total')).toContainText('$740');
  });

  test('Given only some categories are filled, When the total is read, Then the untouched lines count as zero', async ({
    page,
  }) => {
    await gotoPlanner(page);
    const breakdown = await openBreakdown(page);

    const groceries = breakdown.getByLabel('Food and groceries');
    await groceries.fill('420');
    await expect(groceries).toHaveValue('420');

    await expect(page.getByTestId('home-cost-total')).toContainText('$420');
  });

  test('Given a category figure is entered, When the comparison updates, Then it reaches the engine rather than being dropped', async ({
    page,
  }) => {
    // The actual defect: the form accepted these and plannerState zeroed them
    // on the way to the scenario, so the comparison never moved.
    await gotoPlanner(page);
    const breakdown = await openBreakdown(page);

    const before = (await page.getByTestId('in-home-monthly').textContent()) ?? '';

    const groceries = breakdown.getByLabel('Food and groceries');
    await groceries.fill('600');
    await expect(groceries).toHaveValue('600');

    await expect(page.getByTestId('in-home-monthly')).not.toHaveText(before);
  });

  test('Given the itemised lines are all left alone, When the lump-sum box is used, Then it still counts in full', async ({
    page,
  }) => {
    // Backward compatibility, in the UI: a family that ignores the breakdown
    // gets exactly the behaviour they had before.
    await gotoPlanner(page);
    await openSection(page, 'breakeven');

    const lump = page.getByLabel('Monthly cost of running the home, not itemised below');
    await lump.fill('2500');
    await expect(lump).toHaveValue('2500');

    await openBreakdown(page);
    await expect(page.getByTestId('home-cost-total')).toContainText('$2,500');
  });

  test('Given nothing has been entered, When the categories are read, Then every line is empty rather than pre-filled with an estimate', async ({
    page,
  }) => {
    // §11.12 is deliberately the half that needs no dataset. Any figure
    // appearing here without a person typing it would be the invented number
    // §7 forbids, and §11.7 (the cited pre-fill) is still unbuilt.
    await gotoPlanner(page);
    const breakdown = await openBreakdown(page);

    for (const label of [
      'Mortgage or rent',
      'Food and groceries',
      'Utilities',
      'Property tax, monthly share',
      'Home insurance, monthly share',
      'Upkeep and repairs',
      'Transport',
    ]) {
      await expect(breakdown.getByLabel(label)).toHaveValue('');
    }
  });
});
