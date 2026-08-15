import { test, expect, type Page } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the 3D suitcase-packing-volume
// view (companion to the existing 2D donut chart, volume-chart.spec.ts).
// Third-party APIs are stubbed per the "live third-party API" lesson in
// .agents/AGENTS.md §6.
const stubWeather = (page: Page) => {
  return Promise.all([
    page.route('https://geocoding-api.open-meteo.com/v1/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ latitude: 21.3069, longitude: -157.8583, name: 'Hawaii' }] }),
      })
    ),
    page.route('https://api.open-meteo.com/v1/forecast**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          daily: {
            time: ['2026-08-01', '2026-08-02', '2026-08-03'],
            temperature_2m_max: [28, 29, 27],
            temperature_2m_min: [22, 23, 21],
            precipitation_sum: [0, 0, 0],
          },
        }),
      })
    ),
    page.route('https://api.frankfurter.dev/v1/latest**', (route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

test.describe('3D suitcase packing volume view', () => {
  test('Given a generated packing plan, When the Knapsack Engine panel renders, Then a 3D view with an accessible label/description and a text-fallback breakdown are shown', async ({ page }) => {
    await stubWeather(page);

    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();
    await expect(page.locator('h3:has-text("3D Suitcase Packing View")')).toBeVisible();

    // The accessible name/description are available immediately (computed
    // from the same slices synchronously), independent of the separately
    // code-split Three.js bundle finishing its lazy load.
    const view = page.getByRole('img', { name: /3D Suitcase Packing View:/ });
    await expect(view).toBeVisible();
    const describedBy = await view.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    // The WebGL canvas mounts once the dynamically-imported scene loads.
    await expect(view.locator('canvas')).toBeVisible({ timeout: 15000 });

    // The text-fallback list (the same element aria-describedby points at)
    // repeats the identical breakdown the donut chart's own legend shows,
    // so the two visualizations can never disagree.
    const donutLegendItems = page.locator('h3:has-text("Packed Volume by Category")').locator('xpath=following-sibling::div[1]//li');
    const fallbackListItems = page.locator(`#${describedBy} li`);
    const donutCount = await donutLegendItems.count();
    await expect(fallbackListItems).toHaveCount(donutCount);
    for (const text of await fallbackListItems.allTextContents()) {
      expect(text).toMatch(/—\s*\d+(\.\d+)?L\s*\(\d+%\)/);
    }
  });

  test('Given WebGL is unavailable, When Analyze renders the Knapsack Engine panel, Then the text breakdown still renders and no canvas is mounted', async ({ page }) => {
    await stubWeather(page);
    // Simulate a browser without a usable WebGL context (GPU-less container,
    // restricted WebView, older phone). The override runs before any app code,
    // so three.js's WebGLRenderer cannot construct — the exact condition that
    // must degrade to the text breakdown instead of crashing the panel.
    await page.addInitScript(() => {
      const realGetContext = HTMLCanvasElement.prototype.getContext;
      const blocked = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
        return (
          realGetContext as (this: HTMLCanvasElement, k: string, ...r: unknown[]) => unknown
        ).apply(this, [kind, ...rest]);
      };
      HTMLCanvasElement.prototype.getContext =
        blocked as unknown as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto('/');
    await page.click('button.btn-primary');

    const view = page.getByRole('img', { name: /3D Suitcase Packing View:/ });
    // Wait for the component to *settle* into its no-WebGL state rather than
    // sampling the loading placeholder before the async scene import resolves
    // and the context failure is handled — a race that made an earlier draft
    // pass on the broken build.
    await expect(view.locator('[data-webgl="unavailable"]')).toBeVisible({ timeout: 15000 });

    // No WebGL canvas is mounted — the view degrades to its text breakdown
    // rather than taking the whole knapsack panel down with it.
    await expect(view.locator('canvas')).toHaveCount(0);

    // The text breakdown (the element aria-describedby points at) is intact,
    // so the accessible representation survives when the canvas cannot.
    const describedBy = await view.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy} li`)).not.toHaveCount(0);
  });

  test('Given the 3D view is rendered after Analyze, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');

    const view = page.getByRole('img', { name: /3D Suitcase Packing View:/ });
    await expect(view).toBeVisible();
    // Wait for the real WebGL canvas (not just the loading placeholder) so
    // the scan covers the feature as actually rendered.
    await expect(view.locator('canvas')).toBeVisible({ timeout: 15000 });

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

// A separate describe block because deviceScaleFactor is a browser-context
// option, set once via test.use() rather than per-test.
test.describe('3D suitcase packing volume view on a high-DPI phone', () => {
  test.use({ viewport: { width: 375, height: 700 }, deviceScaleFactor: 3 });

  test('Given a phone-typical devicePixelRatio, When the 3D view renders, Then its canvas is sized to match its container instead of overflowing and being cropped by it', async ({ page }) => {
    // renderer.setSize(w, h, false) never sets the canvas's CSS size, so the
    // browser falls back to the canvas's width/height attributes -- which
    // Three.js sets to w*pixelRatio/h*pixelRatio -- as its layout box. At
    // devicePixelRatio 3 (capped to 2 by this component) that rendered the
    // canvas 2x too large, and the container's overflow:hidden cropped it
    // to a zoomed-in corner instead of showing the whole suitcase.
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');

    const view = page.getByRole('img', { name: /3D Suitcase Packing View:/ });
    await expect(view).toBeVisible();
    const canvas = view.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const canvasBox = await canvas.boundingBox();
    const containerBox = await view.boundingBox();
    if (!canvasBox || !containerBox) throw new Error('expected both the canvas and its container to have a layout box');

    expect(canvasBox.width).toBeCloseTo(containerBox.width, 0);
    expect(canvasBox.height).toBeCloseTo(containerBox.height, 0);
  });
});
