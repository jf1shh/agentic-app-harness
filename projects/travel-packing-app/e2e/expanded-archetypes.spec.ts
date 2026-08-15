import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for Phase 16's expanded style
// archetypes. Third-party APIs are stubbed per the "live third-party API"
// lesson in .agents/AGENTS.md §6 -- see travel-app.spec.ts for the same
// pattern applied to the default (quiet-luxury) archetype's Analyze flow.
test.describe('Expanded style archetypes (Phase 16)', () => {
  test('Given the Corporate Power archetype is selected, When the user runs Analyze, Then a wearability report and packing checklist render end-to-end', async ({ page }) => {
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ latitude: 40.7128, longitude: -74.006, name: 'New York' }],
        }),
      })
    );
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [24, 23, 25],
            temperature_2m_min: [16, 15, 17],
            precipitation_sum: [0, 0, 0],
          },
        }),
      })
    );

    // Given the app is loaded with the archetype-preset wardrobe source
    await page.goto('/');
    await expect(page.locator('h1:has-text("SmartPack")')).toBeVisible();

    // And the new "Corporate Power" archetype is selectable and selected
    const archetypeSelect = page.locator('#archetype');
    await expect(archetypeSelect.locator('option[value="corporate"]')).toHaveText('Corporate Power');
    await archetypeSelect.selectOption('corporate');
    await expect(archetypeSelect).toHaveValue('corporate');

    // When the user clicks Analyze
    await page.click('button.btn-primary');

    // Then the wearability report renders with a flexibility score
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.locator('h3:has-text("Flexibility Score")')).toBeVisible();

    // And the physical packing checklist is rendered, proving the
    // corporate archetype's generated wardrobe scheduled real outfits
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 1")')).toBeVisible();
  });

  test('Given the trip-details form, When the archetype dropdown is inspected, Then all three new archetypes are present alongside the original twelve', async ({ page }) => {
    await page.goto('/');
    const archetypeSelect = page.locator('#archetype');

    const values = await archetypeSelect.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value)
    );

    expect(values).toEqual(
      expect.arrayContaining([
        'quiet-luxury', 'gorpcore', 'scandi', 'streetwear', 'dark-academia', 'athleisure',
        'bohemian', 'preppy', 'rock', 'whimsigoth', 'coastal', 'cottagecore',
        'corporate', 'old-money', 'balletcore',
      ])
    );
    expect(values).toHaveLength(15);
  });
});
