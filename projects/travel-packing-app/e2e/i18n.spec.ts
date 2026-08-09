import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// BDD (Given -> When -> Then) E2E specs per the harness standard.
test.describe('Language switching', () => {
  test('Given the app is loaded, When the user switches the language to German, Then the trip form re-renders in German', async ({ page }) => {
    // Given the app is loaded in its default (English) language
    await page.goto('/');
    await expect(page.locator('h2:has-text("Trip Details")')).toBeVisible();

    // When the user switches the language to German
    await page.getByLabel('Language').selectOption('de');

    // Then the trip form's headings and labels re-render in German. The
    // destination field itself belongs to DestinationAutocomplete, a
    // component from a different, independently-merged phase branch that
    // this PR's i18n wiring does not reach (see README/spec "Left undone"),
    // so this asserts a label this PR does translate.
    await expect(page.locator('h2:has-text("Reisedetails")')).toBeVisible();
    await expect(page.locator('text=Startdatum')).toBeVisible();
    await expect(page.locator('h2:has-text("Trip Details")')).toHaveCount(0);
  });

  test('Given a language switch, When the page is reloaded, Then the choice is remembered', async ({ page }) => {
    // Given the user has switched to German
    await page.goto('/');
    await page.getByLabel('Language').selectOption('de');
    await expect(page.locator('h2:has-text("Reisedetails")')).toBeVisible();

    // When the page is reloaded
    await page.reload();

    // Then the German UI is restored from the persisted choice
    await expect(page.locator('h2:has-text("Reisedetails")')).toBeVisible();
  });

  test('Given the user switches to Arabic, When the layout is inspected, Then the document direction flips to right-to-left', async ({ page }) => {
    // Given the app is loaded
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // When the user switches the language to Arabic
    await page.getByLabel('Language').selectOption('ar');

    // Then the document direction flips to RTL
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('Given the German language is active, When it is scanned for a11y, Then there are no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Language').selectOption('de');
    await expect(page.locator('h2:has-text("Reisedetails")')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
