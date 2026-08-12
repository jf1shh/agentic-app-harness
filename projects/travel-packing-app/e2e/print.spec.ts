import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the print stylesheet.
test.describe('Print stylesheet', () => {
  test('Given the default wardrobe and an Analyze run, When print media is emulated, Then only the packing checklist stays visible', async ({ page }) => {
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

    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();

    // When print media is emulated
    await page.emulateMedia({ media: 'print' });

    // Then the on-screen checklist header (with its Print/Reset buttons) is
    // hidden...
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeHidden();
    // ...and a plain print-only heading takes its place...
    await expect(page.getByText('🎒 Packing Checklist')).toBeVisible();
    // ...while the trip form, header controls, and the wearability report's
    // own heading are all hidden.
    await expect(page.locator('h2:has-text("Trip Details")')).toBeHidden();
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeHidden();
    await expect(page.getByRole('button', { name: /Share Trip/ })).toBeHidden();
  });

  test('Given the packing checklist, When Print is clicked, Then window.print() is invoked', async ({ page }) => {
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

    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();

    let printCalled = false;
    await page.exposeFunction('__printCalled', () => { printCalled = true; });
    await page.evaluate(() => {
      window.print = () => (window as unknown as { __printCalled: () => void }).__printCalled();
    });

    await page.getByRole('button', { name: '🖨️ Print' }).click();
    await expect.poll(() => printCalled).toBe(true);
  });

  test('Given a narrow phone viewport, When the packing checklist renders, Then its Print/Reset button row does not overflow the page horizontally', async ({ page }) => {
    // The checklist header is a `justifyContent: space-between` flex row
    // with the title on the left and the Print/Reset Checkmarks buttons on
    // the right; without flexWrap that row doesn't fit at 375px and pushes
    // the whole page wider than the viewport, clipping the Reset button.
    await page.setViewportSize({ width: 375, height: 900 });
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

    await page.goto('/');
    await page.click('button.btn-primary');
    const resetBtn = page.getByRole('button', { name: /Reset Checkmarks/ });
    await expect(resetBtn).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);

    const resetBox = await resetBtn.boundingBox();
    if (!resetBox) throw new Error('expected the Reset Checkmarks button to have a layout box');
    expect(resetBox.x + resetBox.width).toBeLessThanOrEqual(375);
  });
});
