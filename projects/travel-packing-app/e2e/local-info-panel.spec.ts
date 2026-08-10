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

  test('Given a multi-destination trip, When Analyze runs, Then Local Info shows a labeled section per leg with each leg\'s own currency and advisory, never one leg\'s figures under another leg\'s heading', async ({ page }) => {
    const GEOCODE_RESULTS: Record<string, { latitude: number; longitude: number; name: string; country: string; country_code: string }> = {
      Berlin: { latitude: 52.52, longitude: 13.4, name: 'Berlin', country: 'Germany', country_code: 'DE' },
      Tokyo: { latitude: 35.68, longitude: 139.69, name: 'Tokyo', country: 'Japan', country_code: 'JP' },
    };

    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) => {
      const name = new URL(route.request().url()).searchParams.get('name') || '';
      const result = GEOCODE_RESULTS[name];
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: result ? [result] : [] }),
      });
    });
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) => {
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
            temperature_2m_max: days.map(() => 25),
            temperature_2m_min: days.map(() => 15),
            precipitation_sum: days.map(() => 0),
          },
        }),
      });
    });
    await page.route('https://api.frankfurter.dev/v1/latest**', (route) => {
      const to = new URL(route.request().url()).searchParams.get('to');
      const rate = to === 'JPY' ? { JPY: 150 } : { EUR: 0.92 };
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ base: 'USD', date: '2026-08-01', rates: rate }),
      });
    });
    await page.route('https://www.gov.uk/api/content/foreign-travel-advice/germany', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Foreign travel advice: Germany',
          public_updated_at: '2026-07-01T00:00:00Z',
          details: { parts: [{ slug: 'summary', title: 'Summary', body: '<p>Germany is generally very safe.</p>' }] },
        }),
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
    await page.locator('#dest').fill('Berlin');
    await page.getByRole('button', { name: '+ Add Another Destination' }).click();
    await page.locator('#dest-2').fill('Tokyo');

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const panel = page.locator('.glass-panel').filter({ has: page.locator('h2:has-text("Local Info")') });
    await expect(panel).toBeVisible();

    // Each leg gets its own labeled section...
    const berlinSection = panel.locator('h3', { hasText: 'Berlin' }).locator('xpath=..');
    const tokyoSection = panel.locator('h3', { hasText: 'Tokyo' }).locator('xpath=..');
    await expect(berlinSection).toBeVisible();
    await expect(tokyoSection).toBeVisible();

    // ...and each section's figures belong to that leg's own country, never
    // the other leg's currency or advisory text under the wrong heading.
    await expect(berlinSection.getByText('Typical Costs (EUR)')).toBeVisible();
    await expect(berlinSection.getByText('Germany is generally very safe.')).toBeVisible();
    await expect(berlinSection.getByText('Typical Costs (JPY)')).toHaveCount(0);
    await expect(berlinSection.getByText('Japan is generally very safe.')).toHaveCount(0);

    await expect(tokyoSection.getByText('Typical Costs (JPY)')).toBeVisible();
    await expect(tokyoSection.getByText('Japan is generally very safe.')).toBeVisible();
    await expect(tokyoSection.getByText('Typical Costs (EUR)')).toHaveCount(0);
    await expect(tokyoSection.getByText('Germany is generally very safe.')).toHaveCount(0);
  });
});
