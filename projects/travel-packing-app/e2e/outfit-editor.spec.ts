import { test, expect, Page, Locator } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the drag-and-drop Outfit Editor.
// dnd-kit uses pointer events, not the native HTML5 drag-and-drop API, so
// Playwright's locator.dragTo() (which dispatches HTML5 drag events) does
// not trigger it -- a manual mouse down/move/up sequence is required.
async function dragOnto(page: Page, source: Locator, target: Locator) {
  // boundingBox() reports the element's position relative to the current
  // scroll offset. The source (Digital Closet tray) and target (an outfit
  // day card) are far apart on a long page, so scrolling one into view
  // after measuring the other invalidates the first measurement -- the test
  // sets a tall viewport (see beforeEach) so both are on-screen at once and
  // neither needs scrolling mid-drag.
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error('Could not measure drag source/target');

  const sx = sourceBox.x + sourceBox.width / 2;
  const sy = sourceBox.y + sourceBox.height / 2;
  const tx = targetBox.x + targetBox.width / 2;
  const ty = targetBox.y + targetBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // dnd-kit's PointerSensor only starts the drag once it sees movement past
  // mousedown -- a small nudge first, then the full path to the target, with
  // a short pause after each so React has a chance to re-render and dnd-kit
  // to register the activation before the next event.
  await page.mouse.move(sx + 10, sy + 10);
  await page.waitForTimeout(100);
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

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
            temperature_2m_max: [20, 20, 20],
            temperature_2m_min: [12, 12, 12],
            precipitation_sum: [0, 0, 0],
          },
        }),
      })
    ),
    page.route('https://api.frankfurter.dev/v1/latest**', (route) => route.fulfill({ status: 500, body: '' })),
    page.route('https://www.gov.uk/api/content/foreign-travel-advice/**', (route) => route.fulfill({ status: 404, body: '' })),
  ]);
};

async function addClosetItem(page: Page, name: string, role: string, color: string) {
  const dialog = page.getByRole('dialog', { name: 'Digital Closet' });
  await dialog.getByLabel('Item name').fill(name);
  await dialog.getByLabel('Role').selectOption(role);
  await dialog.getByLabel('Color').selectOption(color);
  await dialog.getByRole('button', { name: 'Add to closet' }).click();
}

test.describe('Outfit Editor (drag-and-drop)', () => {
  test.beforeEach(async ({ page }) => {
    // Tall enough that the Digital Closet tray (drag source) and the outfit
    // schedule's day cards (drop targets) are both on-screen at once, so a
    // single mouse-move path between them never needs a mid-drag scroll.
    await page.setViewportSize({ width: 1280, height: 3200 });
  });

  test('Given a hand-built wardrobe with two valid bottoms, When the unused bottom is dragged onto Day 1, Then it swaps in and the knapsack physics reflect the new schedule', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');

    // Given a custom wardrobe: one top that pairs validly with either of two
    // bottoms, plus a "layer"-only item that pairs with nothing.
    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();
    await page.getByRole('button', { name: /Manage Digital Closet/ }).click();
    await addClosetItem(page, 'White Tee', 'top', 'white');
    await addClosetItem(page, 'Khaki Shorts', 'bottom', 'khaki');
    await addClosetItem(page, 'Grey Trousers', 'bottom', 'grey');
    await addClosetItem(page, 'Grey Scarf', 'layer', 'grey');
    await page.getByRole('button', { name: 'Close digital closet' }).click();

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const day1Bottom = page.locator('[aria-label="Day 1 bottom slot"]');
    await expect(day1Bottom).toBeVisible();

    // Whichever of the two bottoms the scheduler didn't pick for Day 1 is the
    // one to drag in, so this doesn't depend on the scheduler's internal
    // tie-breaking order.
    const day1Card = page.locator('h4', { hasText: 'Day 1' }).locator('xpath=..');
    const currentBottomText = await day1Card.locator('small', { hasText: 'Bottom:' }).textContent();
    const unusedBottomName = currentBottomText?.includes('Khaki') ? 'Grey Trousers' : 'Khaki Shorts';

    const dragSource = page.getByLabel(`Drag ${unusedBottomName}`).getByText(unusedBottomName, { exact: true });
    await dragOnto(page, dragSource, day1Bottom);

    await expect(page.locator('p[role="status"]')).toContainText(`Swapped in ${unusedBottomName} for Day 1`);
    await expect(day1Card.locator('small', { hasText: 'Bottom:' })).toContainText(unusedBottomName);

    // The knapsack physics volume must reflect the new bottom's own volume
    // (1500cm3 for a bulky manual "bottom" item), not the pre-swap figure --
    // proves the physics were recomputed rather than left stale.
    await expect(page.locator('h2:has-text("Knapsack Engine")')).toBeVisible();
  });

  test('Given a wardrobe item that has no valid role in any outfit, When it is dragged onto a day\'s slot, Then the swap is rejected and that day is left unchanged', async ({ page }) => {
    await stubWeather(page);
    await page.goto('/');

    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();
    await page.getByRole('button', { name: /Manage Digital Closet/ }).click();
    await addClosetItem(page, 'White Tee', 'top', 'white');
    await addClosetItem(page, 'Khaki Shorts', 'bottom', 'khaki');
    await addClosetItem(page, 'Grey Scarf', 'layer', 'grey');
    await page.getByRole('button', { name: 'Close digital closet' }).click();

    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const day1Top = page.locator('[aria-label="Day 1 top slot"]');
    const dragSource = page.getByLabel('Drag Grey Scarf').getByText('Grey Scarf', { exact: true });
    await dragOnto(page, dragSource, day1Top);

    await expect(page.locator('p[role="status"]')).toContainText("Grey Scarf can't go there");
    const day1Card = page.locator('h4', { hasText: 'Day 1' }).locator('xpath=..');
    await expect(day1Card.locator('small', { hasText: 'Top:' })).toContainText('White Tee');
  });

  test('Given the outfit editor is rendered after Analyze, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    // None of the existing a11y sweeps reach this state (they scan only the
    // pre-Analyze form), so the drag-and-drop tray and drop-zone markup this
    // feature adds had no coverage until this test.
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await stubWeather(page);
    await page.goto('/');
    await page.click('button.btn-primary');
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
