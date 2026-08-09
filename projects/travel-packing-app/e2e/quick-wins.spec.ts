import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E specs for the destination-aware travel
// adapter essential, the "Start Over" reset, and "Delete All My Data".
// Third-party APIs are stubbed per the "live third-party API" lesson in
// .agents/AGENTS.md §6.
const stubWeather = (page: import('@playwright/test').Page, geocodeResult: Record<string, unknown>) => {
  return Promise.all([
    page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [geocodeResult] }),
      })
    ),
    page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [28, 29, 27],
            temperature_2m_min: [22, 23, 21],
            precipitation_sum: [0, 0, 0],
          },
        }),
      })
    ),
    page.route('https://api.frankfurter.dev/v1/latest**', (route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

test.describe('Destination-aware travel adapter', () => {
  test('Given a destination that resolves to Germany, When Analyze runs, Then the checklist lists a Type C/F adapter', async ({ page }) => {
    await stubWeather(page, { latitude: 52.52, longitude: 13.4, name: 'Berlin', country: 'Germany', country_code: 'DE' });

    await page.goto('/');
    await page.locator('#dest').fill('Berlin');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText('1x Travel Adapter (Type C/F outlets)')).toBeVisible();
  });

  test('Given a destination with no resolved country, When Analyze runs, Then the checklist falls back to a universal adapter', async ({ page }) => {
    await stubWeather(page, { latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' });

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText('1x Universal Travel Adapter')).toBeVisible();
  });
});

test.describe('Start Over', () => {
  test('Given a generated plan, When Start Over is clicked, Then the results clear and the trip form is ready for a new plan', async ({ page }) => {
    await stubWeather(page, { latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' });

    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    await page.getByRole('button', { name: /Start Over/ }).click();

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toHaveCount(0);
    await expect(page.locator('h2:has-text("Knapsack Engine")')).toHaveCount(0);
    await expect(page.locator('button.btn-primary')).toBeVisible();
  });
});

test.describe('Delete All My Data', () => {
  test('Given the confirmation is dismissed, When Delete All My Data is clicked, Then no data is cleared and the page does not reload', async ({ page }) => {
    await page.goto('/');
    await page.locator('#dest').fill('A Destination That Should Survive');

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: /Delete All My Data/ }).click();

    await expect(page.locator('#dest')).toHaveValue('A Destination That Should Survive');
  });

  test('Given the confirmation is accepted, When Delete All My Data is clicked, Then local storage is cleared and the page reloads to its defaults', async ({ page }) => {
    await page.goto('/');
    await page.locator('#dest').fill('A Destination That Should Not Survive');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Delete All My Data/ }).click();

    await page.waitForLoadState('load');
    await expect(page.locator('#dest')).toHaveValue('Hawaii');
  });
});
