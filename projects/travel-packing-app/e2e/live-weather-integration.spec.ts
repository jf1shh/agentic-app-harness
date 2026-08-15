import { test, expect } from '@playwright/test';

// Opt-in live integration check — NOT part of the deterministic gate.
//
// This is the un-stubbed twin of the "runs Analyze" scenario in
// travel-app.spec.ts: it hits the real Open-Meteo geocoding/forecast APIs
// (and Nominatim as a fallback) instead of fixture data. Per the "live
// third-party API" lesson in .agents/AGENTS.md §6, a deterministic build gate
// must not depend on a third party's uptime or a network-restricted
// environment's ability to reach it, so every test here is skipped unless
// explicitly requested — set RUN_LIVE_E2E=1 to run it, e.g. to sanity-check
// that weatherApi.ts still matches Open-Meteo's real response shape after an
// API change.
test.describe('Live weather API integration (opt-in)', () => {
  test.skip(!process.env.RUN_LIVE_E2E, 'Set RUN_LIVE_E2E=1 to run this against the real Open-Meteo API.');

  test('Given the default wardrobe and a real destination, When the user runs Analyze against the live API, Then a wearability report is shown', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1:has-text("SmartPack")')).toBeVisible();

    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('h2:has-text("Live Itinerary")')).toBeVisible();
  });
});
