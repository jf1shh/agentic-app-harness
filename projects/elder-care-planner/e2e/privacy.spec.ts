import { test, expect } from '@playwright/test';
import { gotoPlanner } from './support';

/**
 * Non-goal enforcement (spec §1.1/§8).
 *
 * "Nothing leaves this device" is the claim the whole product rests on: a family
 * that does not believe it enters approximate numbers, and approximate numbers
 * make every figure downstream worthless. A claim that important is worth
 * proving mechanically rather than asserting in a paragraph.
 */
test.describe('BDD Spec: The local-only claim is provable, not just stated', () => {
  test('Given every outbound request is blocked, When the full flow is exercised, Then the planner still works end to end', async ({
    page,
  }) => {
    // Given nothing may leave the machine
    const blocked: string[] = [];
    await page.route('**', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        await route.continue();
      } else {
        blocked.push(url.href);
        await route.abort();
      }
    });

    // When a family works through triage, refinement and the split
    await gotoPlanner(page);
    await page.getByLabel('Their monthly income').fill('2500');
    await page.getByLabel('Savings available for care').fill('150000');
    await page.getByLabel('How many family members will share the cost?').fill('3');
    await page.getByLabel('Care-level surcharge, monthly').fill('1200');
    await page.getByLabel('Community or move-in fee, one-time').fill('3500');

    // Then every result still computes, because none of it needed a server
    await expect(page.getByTestId('all-in')).toBeVisible();
    await expect(page.getByTestId('runway-line')).toBeVisible();
    await expect(page.locator('[data-testid^="share-c"]')).toHaveCount(3);
    await expect(
      page.getByRole('region', { name: 'Summary for a family conversation' }),
    ).toBeVisible();

    // And nothing was even attempted against an external host
    expect(blocked, `unexpected outbound requests:\n${blocked.join('\n')}`).toEqual([]);
  });

  test('Given financial details are being entered, When the page is inspected, Then no analytics or tracking endpoint is present', async ({
    page,
  }) => {
    // Given the planner
    const external: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') external.push(url.href);
    });

    // When the app loads and is used
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByLabel('Savings available for care').fill('220000');

    // Then no third-party request happened at all
    expect(external, `third-party requests:\n${external.join('\n')}`).toEqual([]);
  });

  test('Given the privacy claim is made, When it is read, Then it tells the reader how to verify it', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the privacy note is read
    const note = page.locator('.privacy-note');

    // Then it offers a way to check rather than asking for trust
    await expect(note).toContainText('no account');
    await expect(note).toContainText('developer tools');
  });
});
