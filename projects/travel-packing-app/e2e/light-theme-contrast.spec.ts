import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// BDD (Given -> When -> Then) E2E specs auditing WCAG AA color contrast in
// light theme specifically. PR #166 fixed two hardcoded-dark-background +
// inherit/dark-var contrast bugs it happened to surface via the app's first
// post-Analyze a11y scan, in PackingChecklist.tsx and WardrobeAnalyzer.tsx --
// see the "Accessibility (a11y) Color Contrast" lesson in .agents/AGENTS.md
// #6 -- but explicitly did not audit the rest of the app. This file is that
// audit: every major page state, scanned in light theme, asserting zero
// axe color-contrast violations.
//
// A subtlety that made the first pass of this audit under-report real bugs:
// this app's `body` carries a decorative `background-image: radial-gradient`
// (globals.css), and every panel sits on a semi-transparent `.glass-panel`
// surface over it. axe-core's color-contrast rule cannot compute an
// effective background through a CSS gradient -- it reports the element as
// "incomplete" (needs manual review) rather than a "violation", so the
// existing `expect(violations).toEqual([])` pattern used elsewhere in this
// suite silently passes on text sitting over the gradient, which is most of
// the app. `neutralizeBackgroundGradient` strips the gradient with an
// injected stylesheet, *in the test only* -- production CSS is untouched --
// which lets axe fall through to the flat `--background`/`--surface`
// colors the design already uses everywhere else, and turns those
// "incomplete" results into real, checkable violations. Verified: with the
// gradient present, this same suite's Analyze-results scan reports 0
// violations and ~55 "incomplete" nodes; with it neutralized, axe finds the
// exact violations manual WCAG contrast-ratio math predicts.
async function forceLightTheme(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('packright_theme', 'light');
  });
}

async function neutralizeBackgroundGradient(page: Page) {
  await page.addStyleTag({ content: 'body { background-image: none !important; }' });
}

async function scanColorContrast(page: Page) {
  await neutralizeBackgroundGradient(page);
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  return results.violations;
}

// Stubbed exactly like travel-app.spec.ts / outfit-editor.spec.ts -- see the
// "live third-party API" lesson in .agents/AGENTS.md #6: a deterministic
// gate can't depend on Open-Meteo/Nominatim/Frankfurter/GOV.UK being
// reachable. Weather is warm enough to guarantee at least one item goes
// unused across a 3-day trip against the default archetype's fuller
// palette, which is what makes the Smart Swap Suggestion panel render.
async function stubWeather(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii', country_code: 'US' }],
      }),
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
  // Fulfilled with real content (not the 404/500 travel-app.spec.ts uses)
  // so LocalInfoPanel actually renders its currency and advisory copy --
  // the panel renders nothing on a failed fetch, which would mean this
  // audit never reaches its text at all.
  await page.route('https://api.frankfurter.dev/v1/latest**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ amount: 1, base: 'USD', date: '2026-08-01', rates: { EUR: 0.92 } }),
    })
  );
  await page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Hawaii travel advice',
        details: { summary: 'Test advisory summary content for the audit fixture.' },
      }),
    })
  );
}

test.describe('Light-theme WCAG AA color contrast audit', () => {
  test('Given light theme is forced, When the trip-input form (and Suitcase Finder search) loads, Then there are no color-contrast violations', async ({ page }) => {
    // Given light theme is forced
    await forceLightTheme(page);
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    // The `data-theme` attribute is set from a useEffect, so it lands one
    // tick after first paint rather than being present immediately --
    // waitForFunction proves the app actually landed in light theme, not
    // just that the localStorage flag was set.
    await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');

    // When the Suitcase Finder is searched (a page state the app's own
    // first post-Analyze a11y scan never reached, since it's on the
    // pre-Analyze form)
    await page.fill('#suitcase-finder', 'Away');
    await expect(page.locator('text=Find a suitcase')).toBeVisible();

    // Then there are no color-contrast violations -- this is the state
    // that catches the "Delete All My Data" button's #ef4444-on-transparent
    // text, present in the page footer from the very first render.
    const violations = await scanColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('Given light theme is forced, When Analyze fails and the inline error message renders, Then it has no color-contrast violations', async ({ page }) => {
    // Given light theme is forced and geocoding is stubbed to fail
    await forceLightTheme(page);
    await page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) => route.fulfill({ status: 500, body: '' }));
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // When the user clicks Analyze and it fails
    await page.click('button.btn-primary');
    await expect(page.locator('.glass-panel > div', { hasText: /./ }).first()).toBeVisible();

    // Then the error message (a literal `color: red` on the light page
    // background) has no color-contrast violations
    const violations = await scanColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('Given light theme is forced, When a custom wardrobe file loads and the Digital Closet manager is opened, Then the success message has no color-contrast violations', async ({ page }) => {
    // Given light theme is forced
    await forceLightTheme(page);
    await page.goto('/');
    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();

    // When a wardrobe file is uploaded (renders the "Loaded N garments"
    // success message) and the Digital Closet manager is opened
    await page.setInputFiles('#closet-upload', {
      name: 'wardrobe.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Top: White Tee | white | 200g | 500cm3\nBottom: Khaki Shorts | khaki | 300g | 800cm3\n'),
    });
    await expect(page.locator('text=Loaded 2 garments')).toBeVisible();
    await page.getByRole('button', { name: /Manage Digital Closet/ }).click();
    await expect(page.getByRole('dialog', { name: 'Digital Closet' })).toBeVisible();

    // Then the success message (a literal #22c55e on the light page
    // background) has no color-contrast violations
    const violations = await scanColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('Given light theme is forced, When Analyze completes with the default wardrobe, Then the wearability report, knapsack panel, itinerary, and Local Info panel have no color-contrast violations', async ({ page }) => {
    // Given light theme is forced and the network is stubbed deterministically
    await forceLightTheme(page);
    await stubWeather(page);
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    // When Analyze runs against the default archetype wardrobe
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    // Then the Smart Swap Suggestion panel is showing (the default
    // archetype over a 3-day Hawaii trip always leaves at least one item
    // unused), proving this scan actually reaches its warning-tinted text
    await expect(page.locator('h3:has-text("Smart Swap Suggestion")')).toBeVisible();
    // And the airline-compliance panel is showing at least one warning
    // (this suitcase/airline default pairing already exceeds a carry-on
    // dimension), proving this scan reaches the orange warning-list text
    await expect(page.locator('text=exceeds')).toBeVisible();
    // And the Local Info panel rendered its stubbed advisory copy, proving
    // this scan reaches that panel's text too
    await expect(page.locator('text=Test advisory summary')).toBeVisible();

    // Then there are no color-contrast violations
    const violations = await scanColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('Given the packing checklist after Analyze, When a garment item and a trip-essential item are checked off, Then the checked rows have no color-contrast violations', async ({ page }) => {
    // Given light theme is forced and Analyze has run
    await forceLightTheme(page);
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();

    // When a garment item is checked off (its row's background swaps from
    // the fixed dark placeholder box to a translucent green "done" tint
    // over the light page)
    await page.locator('.print-section input[type=checkbox]').first().click({ force: true });

    // And a trip-essential item is checked off too (same background swap,
    // separate code path)
    const essentialCheckbox = page
      .locator('h3:has-text("Trip Essentials")')
      .locator('xpath=following-sibling::ul[1]')
      .locator('input[type=checkbox]')
      .first();
    await essentialCheckbox.click({ force: true });
    await expect(essentialCheckbox).toBeChecked();

    // Then there are no color-contrast violations
    const violations = await scanColorContrast(page);
    expect(violations).toEqual([]);
  });
});
