import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E specs for the Travel Mode preference:
// non-flying trips skip airline carry-on constraints and the checklist
// gains road-trip essentials when driving. Third-party APIs are stubbed
// per the "live third-party API" lesson in .agents/AGENTS.md §6.
const stubWeather = (page: import('@playwright/test').Page) =>
  Promise.all([
    page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }] }),
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
            uv_index_max: [3, 3, 3],
          },
        }),
      })
    ),
  ]);

test.describe('Travel Mode', () => {
  test('Given the default flying mode, When Analyze runs, Then the airline dropdown is shown and carry-on limits apply', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');
    await expect(page.getByLabel('Airline (Carry-on Limits)')).toBeVisible();

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText(/Weight: .*kg \/ .*kg Limit/)).toBeVisible();
  });

  test('Given travel mode is set to driving, When Analyze runs, Then the airline dropdown is hidden, carry-on limits are not applicable, and road-trip essentials are added', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');

    await page.getByLabel('Travel Mode').selectOption('driving');
    await expect(page.getByLabel('Airline (Carry-on Limits)')).toHaveCount(0);

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    await expect(page.getByText(/Not applicable.*not flying/)).toBeVisible();
    await expect(page.getByText(/^Weight: [\d.]+kg$/)).toBeVisible();
    await expect(page.getByText('1x Car USB Charger')).toBeVisible();
    await expect(page.getByText('1x Emergency Road Kit')).toBeVisible();
  });

  test('Given travel mode is set to train, When Analyze runs, Then no road-trip essentials are added', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');

    await page.getByLabel('Travel Mode').selectOption('train');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    await expect(page.getByText('1x Car USB Charger')).toHaveCount(0);
    await expect(page.getByText('1x Emergency Road Kit')).toHaveCount(0);
  });
});
