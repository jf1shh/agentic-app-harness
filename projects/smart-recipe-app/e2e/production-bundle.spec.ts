import { test, expect, type Page } from '@playwright/test';

/**
 * Production-bundle smoke test for SmartRecipe.
 *
 * Every other spec in this suite runs against the dev server, where the deploy
 * path is stripped and assets are served from the root. That is structurally
 * incapable of catching a wrong production `basePath` — the class of bug that
 * once shipped a build 404ing every asset while E2E, a11y and the live deploy
 * all stayed green.
 *
 * This loads the real built output, served at the exact subpath GitHub Pages
 * serves it from, and fails on any request that 404s.
 * Served by scripts/serve-dist.mjs — see the webServer array in playwright.config.ts.
 */

const PAGES_URL = 'http://localhost:5186/agentic-app-harness/smart-recipe-app/';

/** Records every failed (>=400) response so a broken asset URL cannot pass silently. */
function trackFailures(page: Page): string[] {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  return failed;
}

test.describe('BDD Spec: Production bundle boots at its deploy origin', () => {
  test('Given the production build served under the GitHub Pages subpath, When the app loads, Then it renders with no failed asset requests', async ({ page }) => {
    // Given the built output mounted at the real deploy path
    const failed = trackFailures(page);

    // When the app loads
    await page.goto(PAGES_URL, { waitUntil: 'networkidle' });

    // Then the app actually mounted — not a blank screen
    await expect(page.locator('h1')).toContainText('Welcome to SmartRecipe');

    // And every asset the document referenced resolved
    expect(failed, `failed requests under the deploy subpath:\n${failed.join('\n')}`).toEqual([]);
  });
});
