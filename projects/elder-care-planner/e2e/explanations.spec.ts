import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection } from './support';

/**
 * Calculation transparency (spec §6.10).
 *
 * The unit tests prove the derivations balance in cents. These prove the thing
 * a family actually does: open the panel beside a number and check it by hand.
 * The arithmetic is therefore parsed back out of the *rendered* strings, not
 * read from the engine — a derivation can be correct in cents and still show a
 * table that visibly does not add up, and that is the failure that costs trust.
 */

/** Read the derivation table currently on screen and add it up as displayed. */
async function readDerivation(page: Page, scope: string) {
  const rows = page.locator(`${scope} table.derivation tbody tr`);
  const parts: number[] = [];
  let total: number | null = null;

  for (const text of await rows.locator('td.num').allTextContents()) {
    const trimmed = text.trim();
    if (trimmed === '') continue;
    const amount = Number(trimmed.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(amount)) continue;

    if (trimmed.startsWith('+')) parts.push(amount);
    else if (trimmed.startsWith('−')) parts.push(-amount);
    else if (trimmed.startsWith('=')) total = amount;
  }

  return { parts, total };
}

test.describe('BDD Spec: Every number can be checked by the family reading it', () => {
  test('Given results on screen, When the question mark beside the all-in cost is pressed, Then its derivation opens', async ({
    page,
  }) => {
    // Given a plan with fees that push the real cost above the advertised one
    await gotoPlanner(page);
    await openSection(page, 'refine');
    await page.getByLabel('Care-level surcharge, monthly').fill('1500');
    await page.getByLabel(/Medication management/).check();

    // When the question mark beside the all-in figure is pressed
    await page.getByTestId('why-all-in').click();

    // Then a panel opens showing the formula and the working behind it
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('all-in monthly = advertised base rate');
    await expect(drawer).toContainText('Care-level surcharge');
    await expect(drawer).toContainText('Medication management');
  });

  test('Given an open derivation, When its parts are added up as displayed, Then they equal the total as displayed', async ({
    page,
  }) => {
    // Given a plan carrying a surcharge, two add-ons and everyday costs
    await gotoPlanner(page);
    await openSection(page, 'refine');
    await page.getByLabel('Care-level surcharge, monthly').fill('1500');
    await page.getByLabel(/Medication management/).check();
    await page.getByLabel(/Incontinence care and supplies/).check();

    // When the all-in derivation is opened and read off the page
    await page.getByTestId('why-all-in').click();
    const { parts, total } = await readDerivation(page, '[role="dialog"]');

    // Then the rendered parts sum to the rendered total, to the cent
    expect(parts.length).toBeGreaterThan(2);
    const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(sum).toBe(total);
  });

  test('Given an open derivation of the monthly gap, When income is subtracted, Then the subtraction is shown and balances', async ({
    page,
  }) => {
    // Given the default plan, where income does not cover the cost
    await gotoPlanner(page);

    // When the gap derivation is opened
    await page.getByTestId('why-monthly-gap').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('monthly gap = all-in monthly cost');

    // Then income appears as a subtraction and the arithmetic balances
    const { parts, total } = await readDerivation(page, '[role="dialog"]');
    expect(parts.some((p) => p < 0)).toBe(true);
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100).toBe(total);
  });

  test('Given a derivation is open, When Escape is pressed, Then it closes and focus returns to the control that opened it', async ({
    page,
  }) => {
    // Given an open explanation
    await gotoPlanner(page);
    const trigger = page.getByTestId('why-runway');
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // When Escape is pressed
    await page.keyboard.press('Escape');

    // Then the panel closes and the reader keeps their place on the page
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('Given a derivation is open, When it is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    // Given an open explanation panel
    await gotoPlanner(page);
    await page.getByTestId('why-runway').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // When axe audits the page with the dialog open
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then the panel is as accessible as the page behind it
    expect(results.violations).toEqual([]);
  });

  test('Given the break-even and split sections, When their question marks are pressed, Then each explains its own method', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    await openSection(page, 'split');

    // When the crossover explanation is opened
    await page.getByTestId('why-break-even').click();
    await expect(page.getByRole('dialog')).toContainText('crossover hours a week =');
    await page.keyboard.press('Escape');

    // And when the split explanation is opened
    await page.getByTestId('why-split').click();

    // Then it names the rounding method that makes the shares add up
    await expect(page.getByRole('dialog')).toContainText('largest-remainder');
  });

  test('Given a reader who wants the whole method at once, When the methodology section is opened, Then every derivation is already present', async ({
    page,
  }) => {
    // Given the planner as loaded
    await gotoPlanner(page);

    // The section is collapsed like every other one after the results (spec
    // §5.1a), so what stands in for "visible without hunting" is its status
    // line: it states how many derivations are inside before anything is
    // clicked, rather than making the reader open it to find out.
    await expect(page.getByTestId('status-methodology')).toContainText(
      'derived step by step',
    );

    // When the methodology section is inspected
    await openSection(page, 'methodology');
    const methodology = page.getByRole('region', {
      name: 'How every number on this page is worked out',
    });
    await expect(methodology).toBeVisible();

    // Then each figure's method is on the page, findable without discovering a control
    for (const id of [
      'base-rate',
      'all-in',
      'first-month',
      'monthly-gap',
      'runway',
      'sensitivity',
      'break-even',
      'split',
    ]) {
      await expect(page.getByTestId(`method-${id}`)).toHaveCount(1);
    }
  });

  test('Given a derivation that leans on a published median, When it is read, Then it names its source and its confidence', async ({
    page,
  }) => {
    // Given memory care, a care type the survey does not price separately
    await gotoPlanner(page);
    await page.getByLabel('What kind of care?').selectOption('memory_care');

    // When the base-rate derivation is opened
    await page.getByTestId('why-base-rate').click();
    const drawer = page.getByRole('dialog');

    // Then the weaker basis is disclosed rather than presented as a measurement
    await expect(drawer).toContainText('Cost of Care Survey');
    await expect(drawer).toContainText('not separately surveyed');
    await expect(drawer).toContainText('What this figure cannot tell anyone');
  });
});
