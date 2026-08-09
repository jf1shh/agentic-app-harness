import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E specs for weather-reactive packing
// essentials (umbrella on a rainy trip, sunglasses + sunscreen on a
// high-UV trip). Third-party APIs are stubbed per the "live third-party
// API" lesson in .agents/AGENTS.md §6.
const stubGeocode = (page: import('@playwright/test').Page) =>
  page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }] }),
    })
  );

test.describe('Weather-reactive packing essentials', () => {
  test('Given a trip with a rainy forecast day, When Analyze runs, Then the checklist adds a travel umbrella', async ({ page }) => {
    await stubGeocode(page);
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [24, 23, 22],
            temperature_2m_min: [18, 17, 16],
            precipitation_sum: [0, 12.5, 0],
            uv_index_max: [3, 2, 3],
          },
        }),
      })
    );

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText('1x Compact Travel Umbrella')).toBeVisible();
    await expect(page.getByText('1x Sunglasses')).toHaveCount(0);
  });

  test('Given a trip with a high-UV forecast day, When Analyze runs, Then the checklist adds sunglasses and sunscreen', async ({ page }) => {
    await stubGeocode(page);
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02'],
            temperature_2m_max: [30, 31],
            temperature_2m_min: [24, 25],
            precipitation_sum: [0, 0],
            uv_index_max: [9, 8],
          },
        }),
      })
    );

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText('1x Sunglasses')).toBeVisible();
    await expect(page.getByText('1x Sunscreen (SPF 30+, travel size)')).toBeVisible();
    await expect(page.getByText('1x Compact Travel Umbrella')).toHaveCount(0);
  });

  test('Given a calm, dry, low-UV forecast, When Analyze runs, Then no weather-reactive essentials are added', async ({ page }) => {
    await stubGeocode(page);
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02'],
            temperature_2m_max: [18, 19],
            temperature_2m_min: [12, 13],
            precipitation_sum: [0, 0],
            uv_index_max: [2, 3],
          },
        }),
      })
    );

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.getByText('1x Compact Travel Umbrella')).toHaveCount(0);
    await expect(page.getByText('1x Sunglasses')).toHaveCount(0);
    await expect(page.getByText(/1x Sunscreen/)).toHaveCount(0);
  });
});
