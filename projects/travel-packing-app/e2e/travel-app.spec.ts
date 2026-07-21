import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Travel Packing App', () => {
  test('should pass accessibility scans (a11y)', async ({ page }) => {
    await page.goto('/');
    
    // We disable 'color-contrast' temporarily if there are base Next.js false positives on gradient backgrounds,
    // but typically we want to run the full suite.
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should generate a packing list and mark an item as packed', async ({ page }) => {
    await page.goto('/');

    // Fill out the form
    await page.fill('input[placeholder="e.g. Hawaii"]', 'Hawaii');
    
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2026-08-01');
    await dateInputs.nth(1).fill('2026-08-05');

    // Click the swimming activity
    await page.click('button:has-text("Swimming")');

    // Generate list
    await page.click('button:has-text("Generate Packing List")');

    // Verify UI updated
    await expect(page.locator('h2:has-text("Trip to Hawaii")')).toBeVisible();
    await expect(page.locator('text=Swimsuit')).toBeVisible();

    // Mark swimsuit as packed
    const swimsuitItem = page.locator('li', { hasText: 'Swimsuit' });
    await swimsuitItem.click();

    // Verify it got checked
    await expect(swimsuitItem.locator('text=✓')).toBeVisible();
  });
});
