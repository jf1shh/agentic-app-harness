import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// BDD (Given -> When -> Then) E2E specs per the harness standard.
test.describe('Smart Recipe App', () => {
  test('Given a first-time visitor, When they open the dashboard, Then it loads and is accessible', async ({ page }) => {
    // Given a first-time visitor
    // When they open the dashboard
    await page.goto('/');

    // Then the welcome heading renders and there are no a11y violations
    await expect(page.locator('h1')).toHaveText('Welcome to SmartRecipe');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Given a stocked pantry, When the dashboard loads, Then it recommends a cookable recipe', async ({ page }) => {
    // Given the default pantry is stocked for pesto (basil, garlic, olive oil, parmesan, pine nuts)
    // When the dashboard loads
    await page.goto('/');

    // Then the recommendations panel surfaces the best-matching recipe with its stats.
    // Scope to the top pick's row: the panel lists several recommendations, so a
    // panel-wide text locator would match multiple stat lines under strict mode.
    const panel = page.locator('.glass-panel', { hasText: 'Cook with what you have' });
    await expect(panel).toBeVisible();
    const topPick = panel.locator('li', { hasText: 'Classic Pesto Pasta' });
    await expect(topPick).toBeVisible();
    await expect(topPick.getByText(/ingredients on hand/)).toBeVisible();
  });

  test('Given the inventory page, When a user adds an item, Then it appears in the list', async ({ page }) => {
    // Given the inventory page is open
    await page.goto('/inventory');

    // When the user fills in and submits a new item
    await page.fill('input[name="name"]', 'Test Tomato');
    await page.selectOption('select[name="category"]', 'fridge');
    await page.fill('input[name="quantity"]', '5');
    await page.click('button[type="submit"]');

    // Then the item appears in the inventory list
    await expect(page.locator('text=Test Tomato')).toBeVisible();

    // (cleanup) remove the item so the test is repeatable
    const removeButton = page.locator('text=Test Tomato').locator('..').locator('..').locator('button', { hasText: 'Remove' }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  });

  test('Given a narrow phone viewport, When an item with one long unbroken name is added, Then the page never scrolls sideways', async ({ page }) => {
    // Item names are free text (a grocery brand name, a hyphenated SKU, ...),
    // so a name with no spaces to wrap on is a real input, not a contrived
    // one. The list row is a flex row with no flex-wrap, and its text child
    // had no min-width: 0 / overflow-wrap, so one long word forced the row
    // wider than the viewport.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/inventory');

    const longName = 'Supercalifragilisticexpialidocious-OrganicHeirloomTomatoes2026Edition';
    await page.fill('input[name="name"]', longName);
    await page.selectOption('select[name="category"]', 'pantry');
    await page.click('button[type="submit"]');
    await expect(page.locator(`text=${longName}`)).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // (cleanup) remove the item so the test is repeatable
    const removeButton = page.locator(`text=${longName}`).locator('..').locator('..').locator('button', { hasText: 'Remove' }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  });
});

test('Given browser inventory, When adding then reloading and removing, Then persistence and the displayed identity agree', async ({ page }) => {
  await page.goto('/inventory');
  await page.getByLabel('Item Name').fill('Persistence Tomato');
  await page.getByRole('button', { name: 'Add to Inventory' }).click();
  await expect(page.getByText('Persistence Tomato', { exact: true })).toBeVisible();
  await page.reload();
  const row = page.locator('li').filter({ hasText: 'Persistence Tomato' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('smart_recipe_inventory') || '[]').some((item: { name: string }) => item.name === 'Persistence Tomato'))).toBe(false);
});

test('Given a validated online recipe, When saved, Then it appears in the local catalog after navigation', async ({ page }) => {
  await page.route('https://www.themealdb.com/api/**', (route) => route.fulfill({ json: { meals: [{
    idMeal: '42', strMeal: 'Review Test Soup', strCategory: 'Soup', strArea: 'Demo',
    strMealThumb: 'https://www.themealdb.com/images/test.jpg', strInstructions: 'Boil water.',
    strIngredient1: 'Water', strMeasure1: '1 cup', strYoutube: '',
  }] } }));
  await page.route('https://www.themealdb.com/images/**', (route) => route.abort());
  await page.goto('/recipes/search');
  await page.getByRole('textbox', { name: 'Search recipes' }).fill('soup & rice');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  await expect(page.getByText('Saved Review Test Soup to catalog!')).toBeVisible();
  await page.goto('/recipes');
  await expect(page.getByRole('heading', { name: 'Review Test Soup' })).toBeVisible();
});
