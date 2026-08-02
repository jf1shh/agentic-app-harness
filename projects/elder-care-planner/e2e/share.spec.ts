import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner } from './support';

const PASSPHRASE = 'correct horse battery staple';

/**
 * Shared family link (spec §11.6). The plan is serialised, compressed, and
 * encrypted with a passphrase, and lives entirely in the URL fragment — never
 * sent to a server. It is a snapshot, not sync: the recipient sees the same
 * figures the sender saw at the moment of sharing, with no path back into
 * either side's own editable plan.
 */
test.describe('BDD Spec: A shared family link is a snapshot, not sync', () => {
  test('Given a filled-in plan, When shared and reopened with the right passphrase, Then the recipient sees the same headline figure', async ({
    page,
  }) => {
    // Given a plan with a distinctive income, so the headline figure is not
    // just whatever the defaults happen to produce
    await gotoPlanner(page);
    await page.getByLabel('Their monthly income').fill('2500');
    const allInBefore = await page.getByTestId('all-in').textContent();

    // When it is shared with a passphrase
    await page.getByLabel('Passphrase').fill(PASSPHRASE);
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();
    expect(link).toContain('#share=v1.');

    // When the recipient opens that link and enters the same passphrase
    const fragment = link.slice(link.indexOf('#'));
    await page.goto(fragment);
    await expect(
      page.getByRole('heading', { name: 'A family member shared a plan with you' }),
    ).toBeVisible();
    await page.getByTestId('shared-passphrase').fill(PASSPHRASE);
    await page.getByTestId('shared-open').click();

    // Then the snapshot framing is explicit, and the same headline figure comes back
    await expect(page.getByTestId('shared-banner')).toContainText('snapshot, not a live sync');
    await expect(page.getByTestId('all-in')).toHaveText(allInBefore ?? '');
  });

  test('Given a shared link, When opened with the wrong passphrase, Then it fails cleanly rather than showing a plan', async ({
    page,
  }) => {
    // Given a shared link
    await gotoPlanner(page);
    await page.getByLabel('Passphrase').fill(PASSPHRASE);
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();
    const fragment = link.slice(link.indexOf('#'));

    // When it is opened with the wrong passphrase
    await page.goto(fragment);
    await page.getByTestId('shared-passphrase').fill('a completely different passphrase');
    await page.getByTestId('shared-open').click();

    // Then an error is shown, and no plan data is ever rendered
    await expect(page.getByTestId('shared-error')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The answer' })).toHaveCount(0);
  });

  test('Given a recipient viewing a shared snapshot, When they choose their own plan instead, Then the normal calculator returns', async ({
    page,
  }) => {
    // Given an opened shared snapshot
    await gotoPlanner(page);
    await page.getByLabel('Passphrase').fill(PASSPHRASE);
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();
    const fragment = link.slice(link.indexOf('#'));

    await page.goto(fragment);
    await page.getByTestId('shared-passphrase').fill(PASSPHRASE);
    await page.getByTestId('shared-open').click();
    await expect(page.getByTestId('shared-banner')).toBeVisible();

    // When the recipient discards the shared view
    await page.getByRole('button', { name: 'Use my own plan instead' }).click();

    // Then this device's own calculator is back, and the link no longer opens it
    await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
  });

  test('Given every outbound request is blocked, When a plan is shared and reopened, Then it still works end to end', async ({
    page,
  }) => {
    // Given nothing may leave the machine — the same proof privacy.spec.ts
    // applies to the rest of the app, applied to sharing specifically: the
    // encryption and compression are local, so this must not need a server.
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

    // When a plan is shared and reopened with the right passphrase
    await gotoPlanner(page);
    await page.getByLabel('Passphrase').fill(PASSPHRASE);
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();
    const fragment = link.slice(link.indexOf('#'));

    await page.goto(fragment);
    await page.getByTestId('shared-passphrase').fill(PASSPHRASE);
    await page.getByTestId('shared-open').click();

    // Then it still worked
    await expect(page.getByTestId('shared-banner')).toBeVisible();
    expect(blocked, `unexpected outbound requests:\n${blocked.join('\n')}`).toEqual([]);
  });

  test('Given the share panel and an opened snapshot, When each is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    // The share-panel form
    await gotoPlanner(page);
    const shareResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('#share-panel')
      .analyze();
    expect(shareResults.violations).toEqual([]);

    // The passphrase gate
    await page.getByLabel('Passphrase').fill(PASSPHRASE);
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();
    const fragment = link.slice(link.indexOf('#'));
    await page.goto(fragment);

    const gateResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(gateResults.violations).toEqual([]);

    // The opened snapshot
    await page.getByTestId('shared-passphrase').fill(PASSPHRASE);
    await page.getByTestId('shared-open').click();
    await expect(page.getByTestId('shared-banner')).toBeVisible();

    const snapshotResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(snapshotResults.violations).toEqual([]);
  });
});
