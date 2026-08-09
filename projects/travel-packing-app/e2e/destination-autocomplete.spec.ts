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
    await dest.fill('Par');

    const listbox = page.getByRole('listbox', { name: 'Destination suggestions' });
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option', { name: /Paris, France/ })).toBeVisible();

    await listbox.getByRole('option', { name: /Paris, France/ }).click();
    await expect(dest).toHaveValue('Paris, France');
  });

  test('Given a query shorter than 2 characters, When typed, Then no suggestions dropdown appears', async ({ page }) => {
    await page.goto('/');
    await page.locator('#dest').fill('a');
    await expect(page.getByRole('listbox', { name: 'Destination suggestions' })).not.toBeVisible();
  });
});
