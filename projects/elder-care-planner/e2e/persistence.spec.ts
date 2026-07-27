import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * Local persistence (spec §1.2, §4).
 *
 * Persistence is not a convenience here, it is the same trust argument as the
 * privacy note: a family entering a parent's real finances under time pressure
 * will not do it twice. Losing a ledger of thirty logged payments to an
 * accidental refresh is the fastest way to make someone go back to a
 * spreadsheet.
 *
 * These specs prove it survives a reload rather than asserting that it does,
 * and — just as importantly — that it can be erased on a borrowed computer.
 */
test.describe('BDD Spec: The plan is still here on the next visit', () => {
  test('Given figures typed into the planner, When the page is reloaded, Then they are all still there', async ({
    page,
  }) => {
    // Given a family who has entered their own numbers
    await gotoPlanner(page);
    await page.getByLabel('Their monthly income').fill('3125');
    await page.getByLabel('Savings available for care').fill('84000');
    await page.getByLabel('Which state?').selectOption('CA');
    await expect(page.getByLabel('Their monthly income')).toHaveValue('3125');

    // When they close the page and come back
    await page.reload();
    await gotoPlanner(page);

    // Then nothing has to be typed again
    await expect(page.getByLabel('Their monthly income')).toHaveValue('3125');
    await expect(page.getByLabel('Savings available for care')).toHaveValue('84000');
    await expect(page.getByLabel('Which state?')).toHaveValue('CA');
  });

  test('Given a ledger of logged payments, When the page is reloaded, Then the ledger and its reconciliation survive', async ({
    page,
  }) => {
    // Given several months of care and a logged payment
    await gotoPlanner(page);
    await openSection(page, 'ledger');
    await page.getByLabel('Months of care paid for so far').fill('5');
    await page.getByLabel('When?').fill('2026-02-01');
    await page.getByLabel('How much?').fill('1200');
    await page.getByTestId('add-ledger-entry').click();
    await expect(page.getByTestId('ledger-total')).toHaveText('$1,200.00');

    // When the page is reloaded
    await page.reload();
    await gotoPlanner(page);
    // Which section is open is a view preference, not part of the plan, so it
    // deliberately does not persist — the ledger has to be reopened to read it.
    await openSection(page, 'ledger');

    // Then the entry, the total and the months behind the reconciliation are intact
    await expect(page.getByTestId('ledger-row')).toHaveCount(1);
    await expect(page.getByTestId('ledger-total')).toHaveText('$1,200.00');
    await expect(page.getByLabel('Months of care paid for so far')).toHaveValue('5');
    await expect(page.getByTestId('paid-c1')).toHaveText('$1,200.00');
  });

  test('Given a borrowed or shared computer, When everything is erased, Then nothing survives the next visit', async ({
    page,
  }) => {
    // Given a plan holding a family's real figures
    await gotoPlanner(page);
    await page.getByLabel('Their monthly income').fill('4200');
    await expect(page.getByLabel('Their monthly income')).toHaveValue('4200');

    // When the plan is erased, which takes a deliberate confirmation
    await page.getByTestId('erase').click();
    await page.getByTestId('confirm-erase').click();

    // Then the figures are gone immediately, and stay gone after a reload
    await expect(page.getByLabel('Their monthly income')).not.toHaveValue('4200');
    await page.reload();
    await gotoPlanner(page);
    await expect(page.getByLabel('Their monthly income')).not.toHaveValue('4200');
  });

  test('Given someone changes their mind mid-erase, When they keep the plan, Then nothing is deleted', async ({
    page,
  }) => {
    // Given a plan and an erase that was started
    await gotoPlanner(page);
    await page.getByLabel('Their monthly income').fill('4200');
    await page.getByTestId('erase').click();

    // When the confirmation is declined
    await page.getByRole('button', { name: 'Keep it' }).click();

    // Then the figures are untouched
    await expect(page.getByLabel('Their monthly income')).toHaveValue('4200');
    await page.reload();
    await gotoPlanner(page);
    await expect(page.getByLabel('Their monthly income')).toHaveValue('4200');
  });

  test('Given a stored plan that cannot be read, When the page loads, Then it says so rather than silently starting over', async ({
    page,
  }) => {
    // Given a payload that fails the contract — a truncated write, or a hand-edit
    // — already on the device before the app runs. It has to be seeded this way
    // rather than written and reloaded, because the save-on-hide would rewrite
    // valid state over it on the way out, which is the app behaving correctly.
    await page.addInitScript(() =>
      window.localStorage.setItem('elder-care-planner:state:v1', '{"monthlyIncomeCents":"lots"'),
    );

    // When the page is opened
    await gotoPlanner(page);

    // Then the family is told their saved plan was not loaded, rather than being
    // left to notice that their figures quietly reverted to the defaults
    await expect(page.getByTestId('restore-failed')).toBeVisible();
    await expect(page.getByTestId('restore-failed')).toContainText('could not be read');
  });

  test('Given the app persists financial figures, When the privacy note is read, Then it discloses that and how to erase it', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the privacy note is read
    const note = page.locator('.privacy-note');

    // Then storing the data on the device is disclosed, not left to be discovered
    await expect(note).toContainText('saved in this browser');
    await expect(note).toContainText('nothing is uploaded');
    await expect(page.getByTestId('erase')).toBeVisible();
  });
});
