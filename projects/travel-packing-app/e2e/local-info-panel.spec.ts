import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the Local Info panel (currency +
// travel advisory), which appears once Analyze resolves a destination
// country. All three third-party APIs are stubbed per the "live
// third-party API" lesson in .agents/AGENTS.md §6.
test.describe('Local Info panel', () => {
  test('Given a destination that resolves to a country, When Analyze runs, Then typical costs and a travel advisory summary render', async ({ page }) => {
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ latitude: 35.68, longitude: 139.69, name: 'Tokyo', country: 'Japan', country_code: 'JP' }],
        }),
      })
    );
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
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
    );
    await page.route('https://api.frankfurter.dev/v1/latest**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ base: 'USD', date: '2026-08-01', rates: { JPY: 150 } }),
      })
    );
    await page.route('https://www.gov.uk/api/content/foreign-travel-advice/japan', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Foreign travel advice: Japan',
          public_updated_at: '2026-07-01T00:00:00Z',
          details: { parts: [{ slug: 'summary', title: 'Summary', body: '<p>Japan is generally very safe.</p>' }] },
        }),
      })
    );

    await page.goto('/');
    await page.locator('#dest').fill('Tokyo');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const panel = page.locator('.glass-panel').filter({ has: page.locator('h2:has-text("Local Info")') });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Typical Costs (JPY)')).toBeVisible();
    await expect(panel.getByText('Japan is generally very safe.')).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Read full advisory on GOV.UK' })).toHaveAttribute(
      'href',
      'https://www.gov.uk/foreign-travel-advice/japan'
    );
  });
});
