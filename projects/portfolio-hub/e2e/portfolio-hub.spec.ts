import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('BDD Spec: Master Portfolio Showcase Hub Portal', () => {
  test('Given visitor opens Portfolio Hub homepage, When viewing showcase portal, Then render main heading and all project cards', async ({ page }) => {
    // Given visitor visits Portfolio Hub
    await page.goto('/');

    // Then render main heading
    await expect(page.locator('h1')).toContainText('Agentic App Harness');

    // And render all showcase project cards
    await expect(page.locator('text=MoodDiner')).toBeVisible();
    await expect(page.locator('text=Travel Packing App')).toBeVisible();
    await expect(page.locator('text=Smart Kitchen Recipe Manager')).toBeVisible();
  });

  test('Given a project card on Portfolio Hub, When clicking View Spec button, Then open architecture spec viewer modal', async ({ page }) => {
    // Given visitor on Portfolio Hub page
    await page.goto('/');

    // When clicking View Spec button on MoodDiner card
    await page.click('#view-spec-btn-mood-diner');

    // Then open architecture spec viewer modal
    await expect(page.locator('h2', { hasText: 'Architecture Specification' })).toBeVisible();
  });

  test('Given Portfolio Hub UI portal, When audited by axe accessibility scanner, Then pass zero WCAG 2.0 AA violations', async ({ page }) => {
    // Given visitor on Portfolio Hub
    await page.goto('/');

    // When running automated WCAG 2.0 AA accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then verify zero violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
