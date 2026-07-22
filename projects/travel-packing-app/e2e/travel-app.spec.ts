import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// BDD (Given -> When -> Then) E2E specs per the harness standard.
test.describe('Travel Packing App V3', () => {
  test('Given the app is loaded, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    // Given the app is loaded
    await page.goto('/');

    // When it is scanned for accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // Then there are no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Given the default wardrobe, When the user runs Analyze, Then a wearability report and dead weight are shown', async ({ page }) => {
    // Given the app is loaded with its default wardrobe source
    await page.goto('/');
    await expect(page.locator('h1:has-text("PackRight V4")')).toBeVisible();
    await expect(page.locator('text=Wardrobe Source')).toBeVisible();

    // When the user clicks Analyze
    await page.click('button.btn-primary');

    // Then the wearability report renders with a flexibility score
    await expect(page.locator('h2:has-text("Wardrobe Wearability Report")')).toBeVisible();
    await expect(page.locator('h3:has-text("Flexibility Score")')).toBeVisible();

    // And the dead weight panel is shown
    const deadWeightBox = page.locator('.glass-panel').filter({ has: page.locator('h3:has-text("Dead Weight")') }).last();
    await expect(deadWeightBox).toBeVisible();

    // And three days are scheduled
    await expect(page.locator('h4:has-text("Day 1")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 2")')).toBeVisible();
    await expect(page.locator('h4:has-text("Day 3")')).toBeVisible();

    // And the physical packing checklist is rendered
    await expect(page.locator('h2:has-text("Physical Packing Checklist")')).toBeVisible();
    await expect(page.locator('text=Packing Progress:')).toBeVisible();
  });
});
