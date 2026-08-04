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

  test('Given a project card on Portfolio Hub, When expanding its code snippet, Then reveal real source code attributed to a path inside that app', async ({ page }) => {
    // Given visitor on Portfolio Hub page
    await page.goto('/');
    const snippet = page.locator('#snippet-details-legal-financial-rag');

    // Then the snippet body starts collapsed
    await expect(snippet.locator('.code-block')).toBeHidden();

    // When expanding the "View Code Snippet" disclosure on the LexiVault card
    await snippet.locator('summary').click();

    // Then it reveals the real source path and code, not a placeholder
    await expect(snippet.locator('.code-block')).toBeVisible();
    await expect(snippet.locator('.code-block-path')).toContainText('projects/legal-financial-rag/');
    await expect(snippet.locator('code')).toContainText('deriveKeyFromPassphrase');
  });

  test('Given the Engineering Skills section, When expanding a skill card, Then reveal its supporting evidence', async ({ page }) => {
    // Given visitor on Portfolio Hub page
    await page.goto('/');
    const skillCard = page.locator('#skill-card-contract-first-schemas');

    // Then the section heading and skill title are visible without expanding anything
    await expect(page.locator('#skills-heading')).toBeVisible();
    await expect(skillCard.locator('.skill-card-evidence')).toBeHidden();

    // When expanding the skill card
    await skillCard.locator('summary').click();

    // Then its cited evidence becomes visible
    await expect(skillCard.locator('.skill-card-evidence')).toBeVisible();
    await expect(skillCard.locator('.skill-card-evidence li').first()).not.toBeEmpty();
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

  test('Given a code snippet and a skill card expanded, When audited by axe accessibility scanner, Then pass zero WCAG 2.0 AA violations', async ({ page }) => {
    // Given visitor on Portfolio Hub with the new interactive disclosures open —
    // a collapsed <details> section is genuinely absent from the accessibility
    // tree, so a scan that never opens one would not cover its content at all.
    await page.goto('/');
    await page.locator('#snippet-details-mood-diner summary').click();
    await page.locator('#skill-card-accessibility-engineering summary').click();

    // When running the audit against the expanded state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then verify zero violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
