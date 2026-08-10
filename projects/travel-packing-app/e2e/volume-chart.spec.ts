import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the packed-volume-by-category
// donut chart in the Knapsack Engine panel. Third-party APIs are stubbed
// per the "live third-party API" lesson in .agents/AGENTS.md §6.
const stubWeather = (page: import('@playwright/test').Page) => {
  return Promise.all([
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
          },
        }),
      })
    ),
    page.route('https://api.frankfurter.dev/v1/latest**', (route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

test.describe('Packed volume by category donut chart', () => {
  test('Given a generated packing plan, When the Knapsack Engine panel renders, Then a donut chart and a legend breaking down packed volume by category are shown', async ({ page }) => {
    await stubWeather(page);

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();

    const chart = page.getByRole('img', { name: 'Packed Volume by Category' });
    await expect(chart).toBeVisible();
    const sliceCount = await chart.locator('circle').count();
    // At least one category slice is drawn as an arc on the donut.
    expect(sliceCount).toBeGreaterThan(0);

    // The legend lists one entry per slice, each carrying a liters figure
    // and a percent share (e.g. "shirt — 2.0L (20%)").
    const legendItems = page.locator('h3:has-text("Packed Volume by Category")').locator('xpath=following-sibling::div[1]//li');
    await expect(legendItems).toHaveCount(sliceCount);
    for (const text of await legendItems.allTextContents()) {
      expect(text).toMatch(/—\s*\d+(\.\d+)?L\s*\(\d+%\)/);
    }
  });
});
