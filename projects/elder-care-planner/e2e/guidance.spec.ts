import { test, expect } from '@playwright/test';
import { gotoPlanner } from './support';

/**
 * The two pieces of guidance with the highest value per byte in the whole app:
 * the Medicare correction, and the list of questions that force hidden fees into
 * the open before a contract is signed.
 */
test.describe('BDD Spec: The Medicare correction is unavoidable', () => {
  test('Given a family planning long-term care, When results are shown, Then Medicare is corrected on the page, not in a help article', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the benefits section is read without expanding anything
    // Then the most expensive misconception in the domain is corrected in plain sight
    await expect(page.getByTestId('medicare-correction')).toBeVisible();
    await expect(page.getByTestId('medicare-correction')).toContainText(
      'Medicare does not pay for long-term custodial care',
    );
  });

  test('Given Medicaid may become relevant, When the benefit card is opened, Then the five-year lookback is surfaced', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the Medicaid card is expanded
    const medicaid = page.getByTestId('benefit-medicaid');
    await medicaid.locator('summary').click();

    // Then the timing trap that costs families money is stated
    await expect(medicaid).toContainText('five-year lookback');
    await expect(medicaid).toContainText('spousal impoverishment');
  });
});

test.describe('BDD Spec: Questions to ask before signing', () => {
  test('Given residential care is being considered, When the checklist is read, Then it names the fees that are not on the brochure', async ({
    page,
  }) => {
    // Given assisted living is selected
    await gotoPlanner(page);

    // When the questions section is read
    const residential = page.getByTestId('questions-residential');

    // Then the questions target exactly the costs families get blindsided by
    await expect(residential).toContainText('care-level reassessment');
    await expect(residential).toContainText('rate increases');
    await expect(residential).toContainText('community fee refundable');
  });

  test('Given in-home care is selected instead, When the checklist updates, Then it asks about agency terms', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the care type is switched to an hourly one
    await page.getByLabel('What kind of care?').selectOption('in_home_health_aide');

    // Then the checklist changes to match the decision actually being made
    await expect(page.getByTestId('questions-in_home')).toContainText('minimum number of hours');
    await expect(page.getByTestId('questions-residential')).toHaveCount(0);
  });

  test('Given questions the app refuses to answer itself, When the checklist is read, Then it says what to ask an attorney', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the attorney list is read
    // Then the referred-out territory is turned into concrete questions
    await expect(page.getByTestId('questions-attorney')).toContainText('Medicaid lookback');
    await expect(page.getByTestId('questions-attorney')).toContainText('spousal impoverishment');
  });
});

test.describe('BDD Spec: The summary is written for a family conversation', () => {
  test('Given a completed plan, When the summary is read, Then it lists every assumption behind the figures', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the summary section is read
    const summary = page.getByRole('region', { name: 'Summary for a family conversation' });

    // Then the numbers can be argued with, because their basis is on the page
    await expect(summary).toContainText('Assumptions behind these figures');
    await expect(summary).toContainText('Care costs are assumed to rise');
    await expect(summary).toContainText('not financial, legal, tax or medical advice');
  });

  test('Given the summary will be shared, When it is read, Then it never addresses the reader in the second person', async ({
    page,
  }) => {
    // Given the summary section
    await gotoPlanner(page);
    const text =
      (await page.getByRole('region', { name: 'Summary for a family conversation' }).textContent()) ??
      '';

    // Then the app states the figures, rather than telling one sibling what they owe
    expect(text).not.toMatch(/\byou(r|rs)?\b/i);
  });
});
