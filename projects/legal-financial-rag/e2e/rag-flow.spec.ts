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

    // First unlock of the session sets the Vault Passphrase
    await page.fill('#input-vault-passphrase', 'SecretCounselPIN2026');
    await page.click('#btn-unlock-vault');

    // Modal should disappear
    await expect(page.locator('#vault-lock-backdrop')).not.toBeVisible();
  });

  test('Given a Vault Passphrase already set -> When re-locking and entering the wrong passphrase -> Then unlock is rejected, and the correct passphrase still unlocks', async ({ page }) => {
    await page.goto('/');

    // Establish the Vault Passphrase on the first lock/unlock of the session
    await page.click('#btn-lock-vault-header');
    await page.fill('#input-vault-passphrase', 'SecretCounselPIN2026');
    await page.click('#btn-unlock-vault');
    await expect(page.locator('#vault-lock-backdrop')).not.toBeVisible();

    // Lock again and try an incorrect passphrase
    await page.click('#btn-lock-vault-header');
    await expect(page.locator('#vault-lock-backdrop')).toBeVisible();
    await page.fill('#input-vault-passphrase', 'AnIncorrectGuess!');
    await page.click('#btn-unlock-vault');

    // Rejected: modal stays open with an error, vault remains locked
    await expect(page.locator('#vault-lock-backdrop')).toBeVisible();
    await expect(page.locator('#vault-lock-backdrop')).toContainText('Incorrect passphrase');

    // The correct passphrase still unlocks it
    await page.fill('#input-vault-passphrase', 'SecretCounselPIN2026');
    await page.click('#btn-unlock-vault');
    await expect(page.locator('#vault-lock-backdrop')).not.toBeVisible();
  });

  test('Given the user clicks Lock Vault, When the modal appears, Then it attributes the lock to the user, not to inactivity', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-lock-vault-header');

    await expect(page.locator('#vault-lock-backdrop')).toContainText('You locked the vault.');
    await expect(page.locator('#vault-lock-backdrop')).not.toContainText('inactivity');
  });

  test('Given 5 minutes pass with no user activity, When the auto-lock fires, Then the modal attributes the lock to inactivity', async ({ page }) => {
    // Clock must be installed before navigation so useAutoLock's timer runs on the fake clock
    await page.clock.install();
    await page.goto('/');

    // No mouse/keyboard activity is dispatched between goto and the fast-forward,
    // so useAutoLock's 5-minute idle timer is the only thing that can fire.
    await page.clock.fastForward('05:01');

    await expect(page.locator('#vault-lock-backdrop')).toBeVisible();
    await expect(page.locator('#vault-lock-backdrop')).toContainText('inactivity');
  });

  test('Given an unrelated state change with no real mouse/keyboard/touch activity, When the original 5-minute idle window still elapses, Then the vault still auto-locks on schedule', async ({ page }) => {
    // Regression test for a bug the previous test can't see: useAutoLock resets
    // its idle timer whenever the callback identity it receives changes, so an
    // inline arrow recreated on every App re-render silently treated *any*
    // re-render as activity, not just the mousemove/keydown/mousedown/touchstart
    // events useAutoLock actually listens for. page.selectOption() changes React
    // state (and re-renders App) without dispatching any of those four event
    // types, so it's a re-render that must NOT reset the countdown.
    await page.clock.install();
    await page.goto('/');

    await page.clock.fastForward('04:00');
    await page.selectOption('#user-role-select', 'FINANCIAL_AUDITOR');

    // Only 1:01 more has passed since page load (5:01 total) — if the role
    // change had reset the timer, the vault would still be unlocked here.
    await page.clock.fastForward('01:01');
    await expect(page.locator('#vault-lock-backdrop')).toBeVisible();
  });

  test('Given the main tab list is focused, When arrow keys are pressed, Then focus moves between tabs and the panel activates', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#tab-query-workbench')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#tab-query-workbench').focus();

    await page.keyboard.press('ArrowRight');

    await expect(page.locator('#tab-document-library')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tab-document-library')).toBeFocused();
    await expect(page.locator('#panel-document-library')).toBeVisible();
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

  test('Given a narrow phone viewport -> When the workbench loads and a query runs -> Then the page never scrolls sideways', async ({ page }) => {
    // Three independent causes previously overflowed a 320-375px viewport:
    // the un-wrapped privilege-filter/lock-vault header rows, the hybrid
    // search hyperparameters row, and — least obviously — WatermarkOverlay's
    // rotated (-25deg) full-bleed label, whose CSS-transformed *rendered*
    // bounding box (not its layout box) contributed to scrollable overflow
    // despite being nearly invisible at opacity 0.04.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/');

    let overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'overflow before running a query').toBeLessThanOrEqual(1);

    // Then after the citations/results panel renders too
    await page.locator('#chip-prompt-0').click();
    await expect(page.locator('#rag-response-container')).toBeVisible({ timeout: 10000 });

    overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'overflow after a query with citations rendered').toBeLessThanOrEqual(1);
  });
});
