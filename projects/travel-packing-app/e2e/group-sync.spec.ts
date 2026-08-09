import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for live cross-tab packing sync.
test.describe('Group trip sync', () => {
  test('Given the packing checklist open in two tabs, When an item is checked in one, Then it is checked live in the other', async ({ page, context }) => {
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }] }),
      })
    );
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [30, 31, 29],
            temperature_2m_min: [24, 25, 23],
            precipitation_sum: [0, 0, 2],
          },
        }),
      })
    );

    // Given two tabs both have the checklist open (same trip, same origin)
    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();
    await expect(page.getByText('🔄 Live sync across tabs')).toBeVisible();

    const secondPage = await context.newPage();
    await secondPage.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }] }),
      })
    );
    await secondPage.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [30, 31, 29],
            temperature_2m_min: [24, 25, 23],
            precipitation_sum: [0, 0, 2],
          },
        }),
      })
    );
    await secondPage.goto('/');
    await secondPage.click('button.btn-primary');
    await expect(secondPage.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();

    // When an item is checked off in the first tab
    const firstTabItem = page.locator('li', { hasText: 'Toiletry Kit' });
    await firstTabItem.click();
    await expect(firstTabItem.locator('input[type="checkbox"]')).toBeChecked();

    // Then the second tab reflects the same checked item live, with no reload
    const secondTabItem = secondPage.locator('li', { hasText: 'Toiletry Kit' });
    await expect(secondTabItem.locator('input[type="checkbox"]')).toBeChecked({ timeout: 5000 });

    await secondPage.close();
  });
});
