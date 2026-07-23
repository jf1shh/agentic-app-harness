import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('LexiVault Financial RAG - Hardened BDD E2E & Accessibility Test Suite', () => {
  test('Given initial load -> When viewing LexiVault -> Then security badge and navigation tabs are present', async ({ page }) => {
    await page.goto('/');

    // Assert Header branding and privacy badge
    await expect(page.locator('h1.logo-title')).toHaveText('LexiVault');
    await expect(page.locator('.badge-privacy')).toContainText('100% Client-Side Private RAG');

    // Assert main tabs
    await expect(page.locator('#tab-query-workbench')).toBeVisible();
    await expect(page.locator('#tab-document-library')).toBeVisible();
    await expect(page.locator('#tab-pii-redaction')).toBeVisible();
    await expect(page.locator('#tab-audit-ledger')).toBeVisible();
  });

  test('Given grounded dataset -> When user executes RAG query for debt ratio -> Then grounded answer and citations are displayed', async ({ page }) => {
    await page.goto('/');

    const queryInput = page.locator('#rag-query-input');
    await expect(queryInput).toBeVisible();

    // Fill query text
    await queryInput.fill('What are the debt ratio triggers in the Tesla credit agreement?');
    await page.click('#btn-run-query');

    // Assert grounded response container and citations appear
    await expect(page.locator('#rag-response-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#rag-answer-text')).toContainText('Tesla');
    await expect(page.locator('.citation-card').first()).toBeVisible();
  });

  test('Given Lock Vault action -> When clicking Lock Vault -> Then modal locks UI and PBKDF2 passphrase unlocks vault', async ({ page }) => {
    await page.goto('/');

    // Click Lock Vault
    await page.click('#btn-lock-vault-header');

    // Assert Vault Lock Modal appears
    await expect(page.locator('#vault-lock-backdrop')).toBeVisible();

    // Unlock with Passphrase
    await page.fill('#input-vault-passphrase', 'SecretCounselPIN2026');
    await page.click('#btn-unlock-vault');

    // Modal should disappear
    await expect(page.locator('#vault-lock-backdrop')).not.toBeVisible();
  });

  test('Given Audit Ledger -> When viewing Hash Chain -> Then tamper-evident blockchain-style hash chain status is 100% verified', async ({ page }) => {
    await page.goto('/');

    await page.click('#tab-audit-ledger');

    // Assert Cryptographic Hash Chain status banner
    await expect(page.locator('#chain-integrity-banner')).toContainText('100% Verified');
  });

  test('Given custom legal contract -> When user ingests contract via Document Vault -> Then document is parsed and indexed into chunks', async ({ page }) => {
    await page.goto('/');

    // Switch to Documents & Chunks tab
    await page.click('#tab-document-library');

    // Fill ingestion form
    await page.fill('#input-doc-title', 'Acme Corp Credit Facility 2025');
    await page.fill('#input-doc-entity', 'Acme Corp');
    await page.fill('#textarea-doc-content', 'Section 4.02 Financial Covenant.\nBorrower shall maintain a Leverage Ratio below 2.50.\n\nSection 6.01 Event of Default.\nFailure to pay principal within 3 business days triggers acceleration.');

    await page.click('#btn-ingest-doc');

    // Assert new document appears in Indexed Vault list
    await expect(page.locator('#document-manager-view')).toContainText('Acme Corp Credit Facility 2025');
  });

  test('Given PII Redaction tab -> When reviewing sensitive tags -> Then SSN and Tax ID tags are masked with interactive toggle', async ({ page }) => {
    await page.goto('/');

    // Switch to PII Masking tab
    await page.click('#tab-pii-redaction');

    // Verify PII tags are rendered
    await expect(page.locator('#pii-redaction-view')).toBeVisible();
    const tagButtons = page.locator('button[id^="tag-toggle-"]');
    await expect(tagButtons.first()).toBeVisible();

    // Initially masked
    await expect(tagButtons.first()).toContainText('REDACTED');

    // Click first tag to unmask
    await tagButtons.first().click();
    await expect(tagButtons.first()).not.toContainText('REDACTED');
  });

  test('Given LexiVault interface -> When checking accessibility compliance -> Then 0 WCAG AA violations are reported', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
