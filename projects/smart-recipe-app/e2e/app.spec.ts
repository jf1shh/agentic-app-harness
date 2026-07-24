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
});
