import { test, expect, type Page } from '@playwright/test';

/**
 * Capacitor-bundle smoke test for PackRight.
 *
 * production-bundle.spec.ts proves the GitHub Pages export resolves at the
 * Pages subpath. This proves the OTHER export — the one `capacitor.config.ts`
 * points `webDir` at — resolves at the origin Capacitor actually serves it
 * from: `https://localhost/` inside the Android WebView, never the Pages
 * subpath. [guardrail: capacitor-absolute-base] blocks a hardcoded Pages
 * subpath in next.config.ts by regex, but a line-level check cannot prove the
 * *built output* actually resolves correctly — only that the config file's
 * text has the right shape. This is that proof, at the artifact level, the
 * same discipline as production-bundle.spec.ts (".agents/AGENTS.md" §6, "Test
 * the Artifact You Ship, at Every Origin It Ships To").
 *
 * Served by scripts/serve-dist.mjs with no --prefix, so the build is mounted
 * only at a bare origin root — CAPACITOR_BUILD=1 (set via playwright.config.ts's
 * webServer env) makes next.config.ts choose the empty basePath for this
 * export, exactly as `npm run build:capacitor` does.
 */

const CAPACITOR_URL = 'http://localhost:5185/';
const PAGES_SUBPATH = '/agentic-app-harness/travel-packing-app';

/**
 * Records every failed (>=400) response so a broken asset URL cannot pass
 * silently. Speculative RSC prefetches are excluded — see
 * production-bundle.spec.ts for why a miss there is not a deployment defect.
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

test.describe('BDD Spec: Capacitor bundle boots at the WebView origin', () => {
  test('Given the Capacitor-target build served at a bare origin root, When the app loads, Then it renders with no failed asset requests and no Pages-subpath asset URLs', async ({ page }) => {
    // Given the Capacitor-target build mounted at a bare root — the same
    // shape https://localhost/ presents inside the Android WebView
    const failed = trackFailures(page);

    // When the app loads
    await page.goto(CAPACITOR_URL, { waitUntil: 'networkidle' });

    // Then the app actually mounted — not a blank screen
    await expect(page.locator('h1')).toContainText('PackRight');

    // And every asset the document referenced resolved at the bare root
    expect(failed, `failed requests at the WebView origin:\n${failed.join('\n')}`).toEqual([]);

    // And no asset URL carries the GitHub Pages subpath. A basePath regression
    // that hardcodes the Pages subpath into this export would already show up
    // as failed requests above, but this names the specific regression the
    // guardrail exists to catch, rather than leaving it as an unexplained
    // blank screen.
    const html = await page.content();
    expect(html).not.toContain(PAGES_SUBPATH);
  });
});
