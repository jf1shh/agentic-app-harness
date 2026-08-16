import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the Digital Closet (WardrobeManager)
// panel added alongside the file-upload custom-closet path.
test.describe('Digital Closet', () => {
  test('Given the custom wardrobe source, When the user opens the Digital Closet and adds an item, Then it appears in the closet list and can be deleted', async ({ page }) => {
    // Given the app is loaded and the custom wardrobe source is selected
    await page.goto('/');
    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();

    // When the user opens the Digital Closet manager
    await page.getByRole('button', { name: /Manage Digital Closet/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Digital Closet' });
    await expect(dialog).toBeVisible();

    // And adds a manual item
    await dialog.getByLabel('Item name').fill('Emerald Silk Scarf');
    await dialog.getByLabel('Role').selectOption('layer');
    await dialog.getByLabel('Color').selectOption('green');
    await dialog.getByRole('button', { name: 'Add to closet' }).click();

    // Then the item appears in the closet list
    await expect(dialog.getByText('Emerald Silk Scarf')).toBeVisible();
    await expect(dialog.getByText('Your items (1)')).toBeVisible();

    // And it can be deleted again
    await dialog.getByRole('button', { name: 'Delete Emerald Silk Scarf' }).click();
    await expect(dialog.getByText('Emerald Silk Scarf')).not.toBeVisible();
    await expect(dialog.getByText('Your items (0)')).toBeVisible();

    // And closing the panel hides it
    await dialog.getByRole('button', { name: 'Close digital closet' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('Given the app is loaded, When the Digital Closet is opened, Then it has no accessibility violations', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    await page.goto('/');
    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();
    await page.getByRole('button', { name: /Manage Digital Closet/ }).click();
    await expect(page.getByRole('dialog', { name: 'Digital Closet' })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Given the Digital Closet is opened, When Escape is pressed, Then it closes and focus returns to the button that opened it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Upload Custom Closet (.txt / .md)' }).check();
    const openButton = page.getByRole('button', { name: /Manage Digital Closet/ });
    await openButton.click();

    const dialog = page.getByRole('dialog', { name: 'Digital Closet' });
    await expect(dialog).toBeVisible();

    // Focus lands inside the dialog, on the close control, not a hidden element.
    await expect(dialog.getByRole('button', { name: 'Close digital closet' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(openButton).toBeFocused();
  });
});
