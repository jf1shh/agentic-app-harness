import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// BDD (Given -> When -> Then) E2E specs per the harness standard.
test.describe('Travel Packing App V3', () => {
  test('Given the app is loaded, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    // Given the app is loaded
    await page.goto('/');

    // When it is scanned for accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // Then there are no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Given a narrow phone viewport, When the trip-details form loads, Then the theme-toggle button does not overlap the title', async ({ page }) => {
    // The theme-toggle button is absolutely positioned in the header's
    // top-right corner over a centered <h1>; below ~480px the title ran
    // underneath it because the header reserved no vertical space above it.
    // This is a visual collision, not a page-width overflow, so it has to be
    // asserted as a bounding-box check rather than a scrollWidth check.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');

    const title = page.locator('h1:has-text("PackRight")');
    const toggle = page.getByRole('button', { name: /Dark Mode|Light Mode/ });
    await expect(title).toBeVisible();
    await expect(toggle).toBeVisible();

    const titleBox = await title.boundingBox();
    const toggleBox = await toggle.boundingBox();
    if (!titleBox || !toggleBox) throw new Error('expected both elements to have a layout box');

    const verticallyOverlaps = titleBox.y < toggleBox.y + toggleBox.height;
    expect(verticallyOverlaps).toBe(false);
  });

  test('Given the default wardrobe, When the user runs Analyze, Then a wearability report and dead weight are shown', async ({ page }) => {
    // handleAnalyze() calls geocodeLocation() and fetchWeather(), which hit
    // real third-party APIs (Open-Meteo, and Nominatim as a fallback). A
    // deterministic gate can't depend on those being reachable or fast — see
    // the "live third-party API" lesson in .agents/AGENTS.md §6 — so the
    // network is stubbed here with fixture data. The un-stubbed flow is
    // covered separately by the opt-in live-weather-integration.spec.ts.
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }],
        }),
      })
    );
    await page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'],
            temperature_2m_max: [30, 31, 29, 30, 31],
            temperature_2m_min: [24, 25, 23, 24, 25],
            precipitation_sum: [0, 0, 2, 0, 0],
          },
        }),
      })
    );

    // Given the app is loaded with its default wardrobe source
    await page.goto('/');
    await expect(page.locator('h1:has-text("PackRight")')).toBeVisible();
    await expect(page.locator('text=Wardrobe Source')).toBeVisible();

    // When the user clicks Analyze
    await page.click('button.btn-primary');

    // Then the wearability report renders with a flexibility score
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.locator('h3:has-text("Flexibility Score")')).toBeVisible();

    // And the dead weight panel is shown
    const deadWeightBox = page.locator('.glass-panel').filter({ has: page.locator('h3:has-text("Dead Weight")') }).last();
    await expect(deadWeightBox).toBeVisible();

    // And three days are scheduled
    await expect(page.locator('h4:has-text("Day 1")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 2")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 3")')).toBeVisible();

    // And the physical packing checklist is rendered
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();
    await expect(page.locator('text=Packing Progress:')).toBeVisible();
  });
});
