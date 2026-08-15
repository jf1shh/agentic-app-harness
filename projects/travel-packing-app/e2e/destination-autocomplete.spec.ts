import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for destination autocomplete.
test.describe('Destination Autocomplete', () => {
  test('Given the user types a destination, When Open-Meteo returns suggestions, Then a dropdown appears and selecting one fills the field', async ({ page }) => {
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            { name: 'Paris', latitude: 48.85, longitude: 2.35, country: 'France', country_code: 'FR' },
            { name: 'Paris', latitude: 33.66, longitude: -95.55, country: 'United States', country_code: 'US' },
          ],
        }),
      })
    );

    await page.goto('/');
    const dest = page.locator('#dest');
    await expect(dest).toBeVisible();
    // The input is React-controlled and initialized to "Hawaii"; a fill that
    // lands before hydration sets the DOM value but is reverted by the first
    // client render (the "fill before hydration is swallowed" lesson in
    // .agents/AGENTS.md §6), which reads as a suggestions list that never
    // opens. Retry until the controlled value actually sticks.
    await expect(async () => {
      await dest.fill('Par');
      await expect(dest).toHaveValue('Par');
    }).toPass({ timeout: 15000 });

    const listbox = page.getByRole('listbox', { name: 'Destination suggestions' });
    await expect(listbox).toBeVisible({ timeout: 15000 });
    await expect(listbox.getByRole('option', { name: /Paris, France/ })).toBeVisible();

    await listbox.getByRole('option', { name: /Paris, France/ }).click();
    await expect(dest).toHaveValue('Paris, France');
  });

  test('Given a query shorter than 2 characters, When typed, Then no suggestions dropdown appears', async ({ page }) => {
    await page.goto('/');
    const dest = page.locator('#dest');
    await expect(dest).toBeVisible();
    // Same hydration race as above — assert the value stuck, or a swallowed
    // fill passes vacuously because an empty input also shows no suggestions.
    await expect(async () => {
      await dest.fill('a');
      await expect(dest).toHaveValue('a');
    }).toPass({ timeout: 15000 });
    await expect(page.getByRole('listbox', { name: 'Destination suggestions' })).not.toBeVisible();
  });
});
