import { test, expect, type Page } from '@playwright/test';

/**
 * Production-bundle smoke tests.
 *
 * Every other spec in this suite runs against the Vite dev server, where `base`
 * is always '/'. That means no test ever loaded the artifact we actually ship —
 * the structural blind spot that let a production build which 404s every asset
 * in the Android WebView pass E2E, a11y and the live Pages deploy.
 *
 * These specs load the real dist/ bundle at both origins it ships to, served by
 * e2e/serve-dist.mjs, and fail on any request that 404s.
 */

// Two distinct origins on purpose — see the header of e2e/serve-dist.mjs. The
// WebView origin must not know the Pages subpath exists, or a bundle pinned to
// that subpath would still resolve here and the test would pass on a broken app.
const WEBVIEW_URL = 'http://localhost:5179/';                              // Capacitor: https://localhost/
const PAGES_URL = 'http://localhost:5180/agentic-app-harness/mood-diner/'; // GitHub Pages subpath

/** Records every failed (>=400) response so a broken asset URL cannot pass silently. */
function trackFailures(page: Page): string[] {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  return failed;
}

test.describe('BDD Spec: Production bundle boots at every shipping origin', () => {
  test('Given the production build served at the Android WebView origin, When the app loads, Then it renders with no failed asset requests', async ({ page }) => {
    // Given the production bundle mounted at the root, as Capacitor serves it
    const failed = trackFailures(page);

    // When the app loads
    await page.goto(WEBVIEW_URL, { waitUntil: 'networkidle' });

    // Then the app actually mounted — not a blank screen
    await expect(page.locator('h1')).toContainText('MoodDiner');
    await expect(page.locator('.restaurant-grid .glass-panel').first()).toBeVisible();

    // And every asset the document referenced resolved
    expect(failed, `failed requests at the WebView origin:\n${failed.join('\n')}`).toEqual([]);
  });

  test('Given the production build served under the GitHub Pages subpath, When the app loads, Then it renders with no failed asset requests', async ({ page }) => {
    // Given the production bundle mounted under /agentic-app-harness/mood-diner/
    const failed = trackFailures(page);

    // When the app loads
    await page.goto(PAGES_URL, { waitUntil: 'networkidle' });

    // Then the app actually mounted
    await expect(page.locator('h1')).toContainText('MoodDiner');
    await expect(page.locator('.restaurant-grid .glass-panel').first()).toBeVisible();

    // And every asset resolved under the subpath too
    expect(failed, `failed requests at the Pages subpath:\n${failed.join('\n')}`).toEqual([]);
  });

  test('Given the built index.html, When its asset URLs are inspected, Then none are pinned to a deploy-specific absolute path', async ({ page }) => {
    // Given the built document
    const html = await (await page.request.get(WEBVIEW_URL)).text();

    // When collecting the script/stylesheet URLs the browser will request
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => /\.(js|css)$/.test(u));
    expect(urls.length, 'expected the built index.html to reference JS/CSS assets').toBeGreaterThan(0);

    // Then none is a root-absolute path, which would bind the bundle to exactly
    // one origin and 404 everywhere else
    const pinned = urls.filter((u) => u.startsWith('/'));
    expect(pinned, `asset URLs pinned to an absolute deploy path: ${pinned.join(', ')}`).toEqual([]);
  });
});
