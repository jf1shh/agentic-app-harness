import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Travel Packing App V3', () => {
  test('should pass accessibility scans (a11y)', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should generate a wearability report and identify dead weight', async ({ page }) => {
    await page.goto('/');

    // Verify initial state
    await expect(page.locator('h1:has-text("PackRight V4")')).toBeVisible();

    // Click Analyze
    await page.click('button.btn-primary');

    // Verify UI updated with Report
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    
    // Verify Flexibility Score is rendered (some percentage)
    await expect(page.locator('h3:has-text("Flexibility Score")')).toBeVisible();

    // Verify Dead Weight box rendered
    const deadWeightBox = page.locator('.glass-panel').filter({ has: page.locator('h3:has-text("Dead Weight")') }).last();
    await expect(deadWeightBox).toBeVisible();

    // Verify 3 days were scheduled
    await expect(page.locator('h4:has-text("Day 1")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 2")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 3")')).toBeVisible();
  });
});
