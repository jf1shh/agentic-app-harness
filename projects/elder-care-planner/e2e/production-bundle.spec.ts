import { test, expect, type Page } from '@playwright/test';

/**
 * Production-bundle smoke test.
 *
 * Every other spec here runs against the dev server, which strips the deploy
 * path and serves assets from the root — structurally incapable of catching a
 * wrong production `basePath`. That is the class of bug that once shipped a
 * build 404ing every asset while E2E, a11y and the live deploy all stayed green.
 *
 * This loads the real built output at the exact subpath GitHub Pages serves it
 * from, and fails on any request that 404s. Served by scripts/serve-dist.mjs —
 * see the webServer array in playwright.config.ts.
 */

const PAGES_URL = 'http://localhost:5190/agentic-app-harness/elder-care-planner/';

/**
 * Records every failed (>=400) response so a broken asset URL cannot pass
 * silently. Speculative RSC prefetches are excluded: a miss there falls back to
 * a normal navigation and is not a deployment defect. A wrong basePath still
 * breaks the document's own chunks under _next/static, which is caught here,
 * and blanks the page, which the render assertion catches.
 */
function trackFailures(page: Page): string[] {
  const failed: string[] = [];
  page.on('response', (r) => {
    const url = r.url();
    if (url.includes('_rsc=')) return;
    if (r.status() >= 400) failed.push(`${r.status()} ${url}`);
  });
  return failed;
}

test.describe('BDD Spec: Production bundle boots at its deploy origin', () => {
  test('Given the production build served under the GitHub Pages subpath, When the app loads, Then it renders with no failed asset requests', async ({
    page,
  }) => {
    // Given the built output mounted at the real deploy path
    const failed = trackFailures(page);

    // When the app loads
    await page.goto(PAGES_URL, { waitUntil: 'networkidle' });

    // Then the app actually mounted rather than showing a blank screen
    await expect(page.locator('h1')).toContainText('Elder Care Cost Planner');

    // And the interactive core hydrated and computed a real answer
    await expect(page.getByTestId('all-in')).toBeVisible();

    // And every asset the document referenced resolved
    expect(failed, `failed requests under the deploy subpath:\n${failed.join('\n')}`).toEqual([]);
  });
});
