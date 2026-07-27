import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * Two decisions families actually face: home or a facility, and who pays.
 */
test.describe('BDD Spec: The home-versus-facility crossover', () => {
  test('Given paid help at home, When the hours rise past the crossover, Then the cheaper option flips', async ({
    page,
  }) => {
    // Given a modest amount of paid help at home
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    await page.getByLabel('Paid help at home, hours per week').fill('20');
    await expect(page.getByTestId('cheaper-option')).toContainText('Care at home');

    // When the hours rise well past the crossover
    await page.getByLabel('Paid help at home, hours per week').fill('60');

    // Then residential care becomes the cheaper option
    await expect(page.getByTestId('cheaper-option')).toContainText('Residential care');
  });

  test('Given the cost of running the home is counted, When it is entered, Then the comparison changes', async ({
    page,
  }) => {
    // Given 40 hours a week of paid help and no housing costs counted
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    await page.getByLabel('Paid help at home, hours per week').fill('40');
    const before = await page.getByTestId('in-home-monthly').textContent();

    // When the real cost of keeping the home running is included
    await page.getByLabel('Monthly cost of running the home').fill('2000');

    // Then staying at home is no longer flattered by an incomplete comparison
    await expect(page.getByTestId('in-home-monthly')).not.toHaveText(before ?? '');
    await expect(page.getByTestId('cheaper-option')).toContainText('Residential care');
  });

  test('Given a crossover exists, When it is reported, Then it is expressed in hours a week', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);
    await openSection(page, 'breakeven');

    // When the break-even summary is read
    // Then it names a concrete number of hours
    await expect(page.getByTestId('breakeven-summary')).toContainText('hours a week');
  });
});

test.describe('BDD Spec: Splitting the cost between family members', () => {
  test('Given three family members sharing the gap, When split equally, Then the shares sum to exactly the total', async ({
    page,
  }) => {
    // Given three contributors
    await gotoPlanner(page);
    await page.getByLabel('How many family members will share the cost?').fill('3');
    await openSection(page, 'split');

    // When the shares are read
    const shares = await page.locator('[data-testid^="share-c"]').allTextContents();
    expect(shares).toHaveLength(3);

    const toCents = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, '')) * 100);
    const sum = shares.reduce((acc, s) => acc + toCents(s), 0);
    const total = toCents((await page.getByTestId('split-total').textContent()) ?? '0');

    // Then not a cent is lost or invented in the division
    expect(sum).toBe(total);
  });

  test('Given a family member contributes care rather than money, When hours are entered, Then the care is valued and shown', async ({
    page,
  }) => {
    // Given two contributors
    await gotoPlanner(page);
    await openSection(page, 'split');

    // When one provides 20 unpaid hours a week
    await page.getByLabel('Unpaid care hours per week').first().fill('20');

    // Then the value of that care appears beside the cash shares
    await expect(page.locator('table').filter({ hasText: 'Value of that care' })).toContainText(
      '$3,033',
    );
  });

  test('Given income differs sharply between siblings, When split by income, Then the shares differ', async ({
    page,
  }) => {
    // Given an income-proportional split
    await gotoPlanner(page);
    await openSection(page, 'split');
    await page.getByLabel('How should the cost be divided?').selectOption('income_proportional');

    // When incomes are supplied
    const incomes = page.getByLabel('Annual income');
    await incomes.nth(0).fill('90000');
    await incomes.nth(1).fill('30000');

    // Then the higher earner carries the larger share
    const shares = await page.locator('[data-testid^="share-c"]').allTextContents();
    const toCents = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, '')) * 100);
    expect(toCents(shares[0])).toBeGreaterThan(toCents(shares[1]));
  });
});
