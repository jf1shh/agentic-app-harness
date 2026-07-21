import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Smart Recipe App', () => {
  test('should load the dashboard and pass accessibility checks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Welcome to SmartRecipe');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should add an inventory item', async ({ page }) => {
    await page.goto('/inventory');
    
    // Fill the form
    await page.fill('input[name="name"]', 'Test Tomato');
    await page.selectOption('select[name="category"]', 'fridge');
    await page.fill('input[name="quantity"]', '5');
    
    // Submit
    await page.click('button[type="submit"]');

    // Verify it appears in the list
    await expect(page.locator('text=Test Tomato')).toBeVisible();

    // Remove it to clean up
    const removeButton = page.locator('text=Test Tomato').locator('..').locator('..').locator('button', { hasText: 'Remove' }).first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  });
});
