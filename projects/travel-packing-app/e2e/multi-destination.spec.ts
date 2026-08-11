import { test, expect, Page, Route } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for multi-destination trips. Third-party
// APIs are stubbed per the "live third-party API" lesson in .agents/AGENTS.md §6.
const GEOCODE_RESULTS: Record<string, { latitude: number; longitude: number; name: string; country: string; country_code: string }> = {
  Berlin: { latitude: 52.52, longitude: 13.4, name: 'Berlin', country: 'Germany', country_code: 'DE' },
  Tokyo: { latitude: 35.68, longitude: 139.69, name: 'Tokyo', country: 'Japan', country_code: 'JP' },
};

const stubMultiDestinationApis = (page: Page) => {
  return Promise.all([
    page.route('https://geocoding-api.open-meteo.com/v1/search**', (route: Route) => {
      const name = new URL(route.request().url()).searchParams.get('name') || '';
      const result = GEOCODE_RESULTS[name];
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: result ? [result] : [] }),
      });
    }),
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
            temperature_2m_max: days.map(() => 25),
            temperature_2m_min: days.map(() => 15),
            precipitation_sum: days.map(() => 0),
          },
        }),
      });
    }),
    page.route('https://api.frankfurter.dev/v1/latest**', (route: Route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route: Route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

test.describe('Multi-destination trips', () => {
  test('Given a trip with two destinations, When Analyze runs, Then the itinerary numbers days continuously across both legs and the checklist lists an adapter for each leg\'s plug type', async ({ page }) => {
    await stubMultiDestinationApis(page);

    await page.goto('/');
    await page.locator('#dest').fill('Berlin');
    // Default trip is 2026-08-01 to 2026-08-05 (5 days), split across 2 legs
    // as 3/2 -- Berlin gets days 1-3, Tokyo gets days 4-5.
    await page.getByRole('button', { name: '+ Add Another Destination' }).click();
    await page.locator('#dest-2').fill('Tokyo');

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();

    const itineraryItems = page.locator('h2:has-text("Live Itinerary")').locator('xpath=following-sibling::ul[1]//li');
    await expect(itineraryItems).toHaveCount(5);
    await expect(itineraryItems.nth(0)).toContainText('Day 1 — Berlin');
    await expect(itineraryItems.nth(2)).toContainText('Day 3 — Berlin');
    await expect(itineraryItems.nth(3)).toContainText('Day 4 — Tokyo');
    await expect(itineraryItems.nth(4)).toContainText('Day 5 — Tokyo');

    // Germany resolves to a Type C/F adapter, Japan to Type A/B -- both
    // should be listed rather than only the first leg's.
    await expect(page.getByText('1x Travel Adapter (Type C/F outlets)')).toBeVisible();
    await expect(page.getByText('1x Travel Adapter (Type A/B outlets)')).toBeVisible();
  });

  test('Given the weather API returns one more day of forecast than a leg actually requested, When Analyze runs, Then every day in the combined itinerary still gets a unique day number', async ({ page }) => {
    // Regression test: fetchLegItinerary's day numbers used to advance by
    // leg.days (the SPLIT's intended count) rather than by how many entries
    // the weather fetch actually returned for that leg. A forecast response
    // one entry longer than requested (a truncation/rounding mismatch near
    // the API's forecast horizon is a realistic real-world cause) then made
    // the next leg's days start one too early, so two different legs both
    // rendered "Day 4" -- React logs that as a duplicate list key, and it's
    // the kind of defect this session was asked to check the app for.
    await Promise.all([
      page.route('https://geocoding-api.open-meteo.com/v1/search**', (route: Route) => {
        const name = new URL(route.request().url()).searchParams.get('name') || '';
        const result = GEOCODE_RESULTS[name];
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ results: result ? [result] : [] }),
        });
      }),
      page.route('https://api.open-meteo.com/v1/forecast**', (route: Route) => {
        const url = new URL(route.request().url());
        const start = new Date(url.searchParams.get('start_date')!);
        const end = new Date(url.searchParams.get('end_date')!);
        // Berlin (the first leg) gets one extra day appended past its
        // requested end_date -- everything else matches the requested range.
        const isBerlinLeg = url.searchParams.get('latitude') === String(GEOCODE_RESULTS.Berlin.latitude);
        if (isBerlinLeg) end.setDate(end.getDate() + 1);
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
      }),
      page.route('https://api.frankfurter.dev/v1/latest**', (route: Route) => route.fulfill({ status: 500, body: '' })),
      page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route: Route) => route.fulfill({ status: 404, body: '' })),
    ]);

    const dupKeyWarnings: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('same key')) dupKeyWarnings.push(msg.text());
    });

    await page.goto('/');
    await page.locator('#dest').fill('Berlin');
    // Default trip is 2026-08-01 to 2026-08-05 (5 days), split across 2 legs
    // as 3/2 -- Berlin gets days 1-3 (but its stub returns 4), Tokyo gets 2.
    await page.getByRole('button', { name: '+ Add Another Destination' }).click();
    await page.locator('#dest-2').fill('Tokyo');

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();

    const itineraryItems = page.locator('h2:has-text("Live Itinerary")').locator('xpath=following-sibling::ul[1]//li');
    const itemTexts = await itineraryItems.allTextContents();
    const dayNumbers = itemTexts.map((text) => {
      const match = text.match(/^Day (\d+)/);
      if (!match) throw new Error(`expected an itinerary line to start with "Day N", got: ${text}`);
      return match[1];
    });

    // Six actual forecast entries came back (4 Berlin + 2 Tokyo), and every
    // one of them must have landed on its own day number.
    expect(dayNumbers).toHaveLength(6);
    expect(new Set(dayNumbers).size).toBe(dayNumbers.length);
    expect(dupKeyWarnings).toEqual([]);
  });

  test('Given an additional destination was added, When it is removed before Analyze, Then the trip reverts to a single-destination itinerary with unprefixed day labels', async ({ page }) => {
    await stubMultiDestinationApis(page);

    await page.goto('/');
    await page.locator('#dest').fill('Berlin');
    await page.getByRole('button', { name: '+ Add Another Destination' }).click();
    await page.locator('#dest-2').fill('Tokyo');
    await page.getByRole('button', { name: 'Remove destination 2' }).click();

    await expect(page.locator('#dest-2')).toHaveCount(0);

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();

    const itineraryItems = page.locator('h2:has-text("Live Itinerary")').locator('xpath=following-sibling::ul[1]//li');
    await expect(itineraryItems).toHaveCount(5);
    await expect(itineraryItems.nth(0)).toHaveText(/^Day 1:/);
  });
});
