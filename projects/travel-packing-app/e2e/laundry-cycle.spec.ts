import { test, expect, Page, Route } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for laundry-cycle-aware packing math.
// Third-party APIs are stubbed per the "live third-party API" lesson in
// .agents/AGENTS.md §6.
const stubMonthLongWeather = (page: Page) => {
  return Promise.all([
    page.route('https://geocoding-api.open-meteo.com/v1/search**', (route: Route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ latitude: 41.9, longitude: 12.5, name: 'Rome', country: 'Italy', country_code: 'IT' }] }),
      })
    ),
    page.route('https://api.open-meteo.com/v1/forecast**', (route: Route) => {
      const url = new URL(route.request().url());
      const start = new Date(url.searchParams.get('start_date')!);
      const end = new Date(url.searchParams.get('end_date')!);
      const days: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
      }
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: days,
            temperature_2m_max: days.map(() => 22),
            temperature_2m_min: days.map(() => 14),
            precipitation_sum: days.map(() => 0),
          },
        }),
      });
    }),
    page.route('https://api.frankfurter.dev/v1/latest**', (route: Route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route: Route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

test.describe('Laundry-cycle-aware packing', () => {
  test('Given a trip much longer than one laundry cycle, When laundry access is assumed vs. not assumed, Then a minimalist wardrobe packs fewer garments with laundry access than without', async ({ page }) => {
    await stubMonthLongWeather(page);

    await page.goto('/');
    await page.locator('#dest').fill('Rome');
    await page.locator('#start').fill('2026-08-01');
    await page.locator('#end').fill('2026-08-31'); // 31-day trip, well past one laundry cycle
    await page.locator('#strategy').selectOption('minimalist');

    const laundryCheckbox = page.getByRole('checkbox', { name: 'Assume laundry access on longer trips (weekly)' });
    await expect(laundryCheckbox).toBeChecked(); // on by default

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const garmentItems = page.locator('h3:has-text("Garments to Pack")').locator('xpath=following-sibling::ul[1]//li');
    const countWithLaundryAccess = await garmentItems.count();

    await page.getByRole('button', { name: /Start Over/ }).click();
    await laundryCheckbox.uncheck();
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const countWithoutLaundryAccess = await garmentItems.count();

    expect(countWithLaundryAccess).toBeLessThan(countWithoutLaundryAccess);
  });
});
