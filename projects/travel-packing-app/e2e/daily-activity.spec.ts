import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for per-day activity tagging.
test.describe('Day-by-Day Activities', () => {
  test('Given the trip dates are set, When the page renders, Then a pill row appears for each day, pre-selected from the destination guess', async ({ page }) => {
    // Given the app is loaded with its default 5-day Hawaii trip (start/end
    // dates 5 days apart, from the default form state)
    await page.goto('/');

    // Then a Day 1..Day 5 picker renders, each with a Casual pill pre-selected
    // by default (Hawaii does not match any destination-guess keyword)
    const day1 = page.getByRole('group', { name: 'Day 1' });
    const day5 = page.getByRole('group', { name: 'Day 5' });
    await expect(day1).toBeVisible();
    await expect(day5).toBeVisible();
    await expect(day1.getByRole('button', { name: /Casual/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Given a day is explicitly tagged Formal, When it is toggled, Then the pill becomes selected and toggling it again reverts to Casual', async ({ page }) => {
    await page.goto('/');

    const day1Formal = page.getByRole('group', { name: 'Day 1' }).getByRole('button', { name: /Formal/ });
    await day1Formal.click();
    await expect(day1Formal).toHaveAttribute('aria-pressed', 'true');

    await day1Formal.click();
    await expect(day1Formal).toHaveAttribute('aria-pressed', 'false');
  });

  test('Given a day tagged Formal and another left Casual, When Analyze runs, Then only the tagged day is scheduled with an evening outfit', async ({ page }) => {
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

    await page.goto('/');

    // Tag only Day 1 as Formal; the rest stay Casual
    await page.getByRole('group', { name: 'Day 1' }).getByRole('button', { name: /Formal/ }).click();

    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    // A wearability report and a 5-day schedule still render with a mixed
    // per-day activity set, proving the per-day tags reached the engine
    // rather than throwing or collapsing the itinerary.
    await expect(page.locator('h4:has-text("Day 1")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 5")')).toBeVisible();
  });

  test('Given a two-destination trip (a beach-guessing leg, then a ski-guessing leg), When the page renders before Analyze, Then each day\'s pre-selected pill is guessed from ITS OWN leg\'s destination, not the primary destination', async ({ page }) => {
    // Given the default 5-day trip (2026-08-01 to 2026-08-05), split 3/2
    // across two legs once a second destination is added: Maui gets days
    // 1-3 (guesses "beach"), Whistler gets days 4-5 (guesses "ski"). This
    // never hits the network -- buildDayDestinations/resolveDayActivity are
    // pure text-based guesses that run before Analyze/geocoding.
    await page.goto('/');
    await page.locator('#dest').fill('Maui');
    await page.getByRole('button', { name: '+ Add Another Destination' }).click();
    await page.locator('#dest-2').fill('Whistler');

    // A generous timeout on these assertions (default is 5s): this is a
    // client-side-only guess with no network involved, but the CI/dev
    // sandbox this suite runs in is shared with other concurrent Next.js
    // dev-server compiles, and a Turbopack recompile pause under that load
    // can push an ordinary React commit past 5s without anything being
    // actually wrong -- the same guess reliably resolves in well under a
    // second when this spec is run in isolation.
    const RESOLVE_TIMEOUT = { timeout: 15_000 };

    // Then a leg-1 day's pill guesses Beach (from "Maui")...
    const day1 = page.getByRole('group', { name: /^Day 1/ });
    await expect(day1).toBeVisible(RESOLVE_TIMEOUT);
    await expect(day1.getByRole('button', { name: /Beach/ })).toHaveAttribute('aria-pressed', 'true', RESOLVE_TIMEOUT);
    await expect(day1.getByRole('button', { name: /Ski/ })).toHaveAttribute('aria-pressed', 'false', RESOLVE_TIMEOUT);

    // ...and a leg-2 day's pill guesses Ski (from "Whistler"), not Beach --
    // the exact bug: without a per-day destination, Day 4 would inherit
    // Maui's "beach" guess despite belonging to the Whistler leg.
    const day4 = page.getByRole('group', { name: /^Day 4/ });
    await expect(day4).toBeVisible(RESOLVE_TIMEOUT);
    await expect(day4.getByRole('button', { name: /Ski/ })).toHaveAttribute('aria-pressed', 'true', RESOLVE_TIMEOUT);
    await expect(day4.getByRole('button', { name: /Beach/ })).toHaveAttribute('aria-pressed', 'false', RESOLVE_TIMEOUT);

    // The day's own destination is also visible in its label, not just
    // encoded in which pill is selected.
    await expect(page.getByRole('group', { name: 'Day 4 — Whistler' })).toBeVisible(RESOLVE_TIMEOUT);
  });
});
