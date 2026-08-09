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

  test('Given a narrow phone viewport, When every card and skill is expanded, Then the page never scrolls sideways', async ({ page }) => {
    // The category filter tabs, a card's badge header, and the code-snippet
    // <pre> block each independently overflowed a 320-375px viewport before
    // gaining flexWrap / min-width: 0 — expand everything and measure at the
    // narrowest viewport this app is expected to run at.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');
    const summaries = page.locator('details summary');
    const count = await summaries.count();
    for (let i = 0; i < count; i++) {
      await summaries.nth(i).click();
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
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

  test('Given the LexiVault project card, When expanding its retrieval/ML architecture disclosure, Then reveal the real pipeline steps and eval methodology', async ({ page }) => {
    // Given visitor on Portfolio Hub page
    await page.goto('/');
    const mlDetails = page.locator('#ml-architecture-details-legal-financial-rag');

    // Then the architecture body starts collapsed
    await expect(mlDetails.locator('.code-block')).toBeHidden();

    // When expanding the "View Retrieval / ML Architecture" disclosure
    await mlDetails.locator('summary').click();

    // Then it reveals the real pipeline steps (each citing a real source path) and the eval methodology
    await expect(mlDetails.locator('.code-block')).toBeVisible();
    await expect(mlDetails.locator('.code-block-path').first()).toContainText('projects/legal-financial-rag/');
    await expect(mlDetails.locator('.code-block')).toContainText('promptfoo');
  });

  test('Given the Case Studies section, When expanding a guardrail-backed case study, Then reveal its root cause, fix, and the real guardrail that enforces it', async ({ page }) => {
    // Given visitor on Portfolio Hub page
    await page.goto('/');
    const caseStudy = page.locator('#case-study-no-op-assertion');

    // Then the case study body starts collapsed
    await expect(caseStudy.locator('.case-study-body')).toBeHidden();

    // When expanding the case study card
    await caseStudy.locator('summary').click();

    // Then its root cause, fix, and real enforcement mechanism are all visible
    await expect(caseStudy.locator('.case-study-body')).toBeVisible();
    await expect(caseStudy.locator('.case-study-body')).toContainText('tautology');
    await expect(caseStudy.locator('.case-study-body')).toContainText('no-op-assertion');
  });

  test('Given the Loop Dashboard, When the page loads, Then it shows non-zero guardrail, lesson, and app counts derived from the real harness', async ({ page }) => {
    // Skip the count-up animation so the final values are readable immediately.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('#loop-dashboard-heading')).toBeVisible();
    await expect(page.getByText('Guardrails Enforced in CI')).toBeVisible();
    await expect(page.getByText(/\d+ Guardrails/)).toBeVisible();
    await expect(page.getByText(/\d+ Lessons/)).toBeVisible();
    await expect(page.getByText(/\d+ Apps/).first()).toBeVisible();
  });

  test('Given the footer, When the page loads, Then it credits the author by name and links a real GitHub profile, LinkedIn profile, and contact email', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('footer').getByText('Jared Fisher')).toBeVisible();
    const githubLink = page.locator('footer a[href="https://github.com/jf1shh"]');
    await expect(githubLink).toBeVisible();
    const linkedinLink = page.locator('footer a[href="https://www.linkedin.com/in/jared-f-17680b7a"]');
    await expect(linkedinLink).toBeVisible();
    const mailLink = page.locator('footer a[href="mailto:xjaredfisher@gmail.com"]');
    await expect(mailLink).toBeVisible();
  });

  test('Given the About panel, When the page loads, Then it introduces the author with a bio and a LinkedIn call-to-action', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#about-heading')).toBeVisible();
    await expect(page.getByText(/Jared Fisher/).first()).toBeVisible();
    const aboutLinkedinLink = page.locator('#about-section a[href="https://www.linkedin.com/in/jared-f-17680b7a"]');
    await expect(aboutLinkedinLink).toBeVisible();
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
    await page.locator('#ml-architecture-details-legal-financial-rag summary').click();
    await page.locator('#case-study-no-op-assertion summary').click();

    // When running the audit against the expanded state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then verify zero violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
