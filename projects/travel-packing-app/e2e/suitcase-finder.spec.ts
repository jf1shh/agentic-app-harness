import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the SuitcaseFinder text-based
// brand/barcode lookup added alongside the existing suitcase dropdown.
test.describe('Suitcase Finder', () => {
  test('Given the trip form, When the user searches for a suitcase brand, Then matching results appear and selecting one updates the Suitcase dropdown', async ({ page }) => {
    // Given the app is loaded
    await page.goto('/');

    // When the user searches for a brand
    const finder = page.getByLabel('Find a suitcase (brand, model, or barcode)');
    await finder.fill('Rimowa');

    // Then matching results appear
    const result = page.getByRole('button', { name: /Rimowa — Essential Cabin/ });
    await expect(result).toBeVisible();

    // When a result is selected
    await result.click();

    // Then the Suitcase dropdown reflects the selection
    await expect(page.locator('#suitcase')).toHaveValue('Rimowa — Essential Cabin');
  });

  test('Given a known barcode number, When it is entered, Then the matching suitcase model appears as a single result', async ({ page }) => {
    await page.goto('/');
    const finder = page.getByLabel('Find a suitcase (brand, model, or barcode)');
    await finder.fill('81875802');

    await expect(page.getByRole('button', { name: /Away — The Carry-On/ })).toBeVisible();
  });

  test('Given a barcode with no match, When it is entered, Then a helpful no-match message is shown instead of silence', async ({ page }) => {
    await page.goto('/');
    const finder = page.getByLabel('Find a suitcase (brand, model, or barcode)');
    await finder.fill('99999999');

    await expect(page.getByText('No suitcase matches that barcode yet')).toBeVisible();
  });
});
