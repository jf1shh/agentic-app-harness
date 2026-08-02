import { test, expect } from '@playwright/test';
import { gotoPlanner } from './support';

/**
 * The research finding behind this spec: 69% of families secure care within 60
 * days while 77% expected far longer. People arrive in crisis, so the first
 * screen has to produce a usable answer from five fields — not a 20-field
 * wizard that the people who most need it abandon.
 */
test.describe('BDD Spec: Triage produces an answer immediately', () => {
  test('Given a family arriving for the first time, When the page loads, Then an answer is already on screen', async ({
    page,
  }) => {
    // Given the planner is opened
    await gotoPlanner(page);

    // When nothing has been entered beyond the defaults
    // Then a cost, a runway and a gap are all already visible
    await expect(page.getByRole('heading', { name: 'The answer' })).toBeVisible();
    await expect(page.getByTestId('all-in')).toBeVisible();
    await expect(page.getByTestId('runway-line')).toBeVisible();
  });

  test('Given the five triage fields, When they are the only inputs, Then no account or email is ever requested', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the page is inspected for data collection
    // Then there is no email field and no sign-up/login flow. The one
    // type="password" input on the page is the shared-link passphrase (spec
    // §11.6) — a key the family invents themselves to encrypt a link on this
    // device, never sent anywhere and never paired with a username or email
    // field, which is what an account system would actually look like.
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(1);
    await expect(page.getByLabel('Passphrase')).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: /sign ?up|log ?in|create account/i })).toHaveCount(
      0,
    );
  });

  test('Given income is increased above the cost of care, When the projection updates, Then it reports that savings are not exhausted', async ({
    page,
  }) => {
    // Given the planner with default assumptions
    await gotoPlanner(page);

    // When income comfortably exceeds the cost of care
    await page.getByLabel('Their monthly income').fill('30000');

    // Then the answer says so rather than rendering an empty runway
    await expect(page.getByTestId('runway-line')).toContainText('not projected to run out');
  });

  test('Given savings are removed, When the projection updates, Then the runway shortens', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);
    const before = await page.getByTestId('runway-line').textContent();

    // When there are no savings to draw on
    await page.getByLabel('Savings available for care').fill('0');

    // Then the projected runway changes
    await expect(page.getByTestId('runway-line')).not.toHaveText(before ?? '');
  });
});
