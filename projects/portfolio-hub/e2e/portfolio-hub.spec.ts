import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Portfolio Hub Suite', () => {
  test('renders portfolio hub homepage with project cards and filters', async ({ page }) => {
    await page.goto('/');

    // Verify main heading
    await expect(page.locator('h1')).toContainText('Agentic App Harness');

    // Verify project cards
    await expect(page.locator('text=MoodDiner')).toBeVisible();
    await expect(page.locator('text=Travel Packing App')).toBeVisible();
    await expect(page.locator('text=Smart Kitchen Recipe Manager')).toBeVisible();
  });

  test('opens spec modal for MoodDiner', async ({ page }) => {
    await page.goto('/');

    // Click View Spec button for MoodDiner
    await page.click('#view-spec-btn-mood-diner');

    // Verify spec modal title
    await expect(page.locator('h2', { hasText: 'Architecture Specification' })).toBeVisible();
  });

  test('passes strict accessibility (a11y) audit', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
