import { test, expect, Page, Locator } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the decorative, drag-to-reorder
// SuitcaseLayout view in the Knapsack Engine panel. Third-party APIs are
// stubbed per the "live third-party API" lesson in .agents/AGENTS.md §6.
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

// dnd-kit uses pointer events, not the native HTML5 drag-and-drop API, so
// Playwright's locator.dragTo() does not trigger it -- a manual mouse
// down/move/up sequence is required, matching e2e/outfit-editor.spec.ts.
async function dragOnto(page: Page, source: Locator, target: Locator) {
  // boundingBox() reports a position relative to the current scroll offset,
  // and dnd-kit's DndContext auto-scrolls whenever the page is taller than
  // the viewport -- real, desirable behavior that invalidates a coordinate
  // measured before the drag started. The test's viewport (see beforeEach)
  // is set taller than the whole page so nothing is scrollable and
  // auto-scroll never engages, per the drag-and-drop lesson in
  // .agents/AGENTS.md §6.
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Could not measure drag source/target');

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 10, sy + 10);
  await page.waitForTimeout(100);
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

test.describe('SuitcaseLayout (drag-to-reorder)', () => {
  test.beforeEach(async ({ page }) => {
    // Tall enough that the whole page (including the Knapsack Engine panel
    // and the SuitcaseLayout tiles within it) is on-screen at once, so a
    // single mouse-move path never needs a mid-drag auto-scroll.
    await page.setViewportSize({ width: 1280, height: 5000 });
  });

  test('Given a generated packing plan, When the Knapsack Engine panel renders, Then SuitcaseLayout shows one numbered, draggable tile per packed garment', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();
    const layoutHeading = page.locator('h3:has-text("Suitcase Layout")');
    await expect(layoutHeading).toBeVisible();

    const tiles = page.locator('ol li [role="group"]');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);

    // Every tile is numbered #1..#N with no gaps, matching the number of
    // packed garments the donut chart's own legend already reports.
    const legendItems = page.locator('h3:has-text("Packed Volume by Category")').locator('xpath=following-sibling::div[1]//li');
    const packedCategoryCount = await legendItems.count();
    expect(packedCategoryCount).toBeGreaterThan(0);

    for (let i = 0; i < tileCount; i++) {
      await expect(tiles.nth(i)).toContainText(`#${i + 1}`);
    }
  });

  test('Given two suitcase tiles, When the first is dragged onto the second, Then they swap position and a status message confirms the move', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');

    await expect(page.locator('h3:has-text("Suitcase Layout")')).toBeVisible();

    const tiles = page.locator('ol li [role="group"]');
    const tileCount = await tiles.count();
    test.skip(tileCount < 2, 'Needs at least two packed garments to prove a reorder');

    const firstTileName = (await tiles.nth(0).locator('strong').textContent())?.trim();
    const secondTileName = (await tiles.nth(1).locator('strong').textContent())?.trim();

    await dragOnto(page, tiles.nth(0), tiles.nth(1));

    await expect(page.locator('p[role="status"]')).toContainText(`Moved ${firstTileName} to position 2`);

    // The dragged tile now reads position #2, and the tile it displaced
    // reads #1 -- a real reorder, not just a status message with no effect.
    const reorderedTiles = page.locator('ol li [role="group"]');
    await expect(reorderedTiles.nth(0)).toContainText(secondTileName ?? '');
    await expect(reorderedTiles.nth(0)).toContainText('#1');
    await expect(reorderedTiles.nth(1)).toContainText(firstTileName ?? '');
    await expect(reorderedTiles.nth(1)).toContainText('#2');
  });

  test('Given the SuitcaseLayout view is rendered after Analyze, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    // None of the existing a11y sweeps reach this state (they scan only the
    // pre-Analyze form), so the drag tile markup this feature adds had no
    // coverage until this test, matching e2e/outfit-editor.spec.ts's own
    // rationale for the same gap.
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h3:has-text("Suitcase Layout")')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
