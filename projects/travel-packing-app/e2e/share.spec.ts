import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the Share Trip flow.
test.describe('Share Trip', () => {
  test('Given a customized trip, When Share Trip is clicked, Then a #share= link is copied that restores the same trip in a fresh load', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Given the user customizes some trip fields
    await page.goto('/');
    await page.locator('#dest').fill('Rome');
    await page.getByLabel('Fashion Archetype').selectOption('gorpcore');
    await page.getByLabel('Packing Strategy').selectOption('minimalist');

    // When Share Trip is clicked
    await page.getByRole('button', { name: /Share Trip/ }).click();
    await expect(page.getByRole('button', { name: /Copied!/ })).toBeVisible();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('#share=');

    // Then loading that link fresh restores the same trip
    await page.goto(clipboardText);
    await expect(page.locator('#dest')).toHaveValue('Rome');
    await expect(page.getByLabel('Fashion Archetype')).toHaveValue('gorpcore');
    await expect(page.getByLabel('Packing Strategy')).toHaveValue('minimalist');
  });

  test('Given the app is already open, When a share link is pasted into the address bar (a same-document hash change), Then the trip still updates without a reload', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Given the app is already running in this tab
    await page.goto('/');
    await expect(page.locator('#dest')).toHaveValue('Hawaii');

    // Build a share link the same way a user would (via the app's own Share
    // button), then apply only its hash to the current document -- mirrors
    // pasting a link into an already-open tab: no goto(), no reload.
    await page.locator('#dest').fill('Kyoto');
    await page.getByRole('button', { name: /Share Trip/ }).click();
    const url = await page.evaluate(async () => navigator.clipboard.readText());
    const hash = url.slice(url.indexOf('#'));

    // Reset the field, then apply only the hash (same-document navigation)
    await page.locator('#dest').fill('SomethingElse');
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);

    await expect(page.locator('#dest')).toHaveValue('Kyoto');
  });
});
