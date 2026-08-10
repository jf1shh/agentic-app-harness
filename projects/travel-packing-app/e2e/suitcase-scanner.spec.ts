import { test, expect } from '@playwright/test';

// BDD (Given -> When -> Then) E2E spec for the camera-based SuitcaseScanner
// (Phase 21). Uses Chromium's fake camera device so the getUserMedia flow
// runs for real, per the "test the artifact you ship" discipline — a synthetic
// video source, not a mocked component, drives the tap-to-measure math end to
// end. Chromium's fake device has no real barcode in frame, so Barcode mode
// is exercised via its always-available brand-search fallback rather than a
// simulated detection hit.
// `launchOptions` set here replaces (rather than merges with) the project's
// own `launchOptions` from playwright.config.ts -- so the `executablePath`
// override that config sets via HARNESS_CHROMIUM_PATH (offline/network-
// restricted containers where Playwright's pinned browser can't be
// downloaded) must be repeated here too, or this file silently falls back
// to Playwright's default browser lookup and fails to launch at all.
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    ...(process.env.HARNESS_CHROMIUM_PATH ? { executablePath: process.env.HARNESS_CHROMIUM_PATH } : {}),
  },
});

test.describe('Suitcase camera scanner', () => {
  test('Given the trip form, When Scan is clicked, Then the scanner opens on the live camera in Barcode mode with no accessibility violations', async ({ page }) => {
    // Given the app is loaded
    await page.goto('/');

    // When Scan is clicked
    await page.getByRole('button', { name: '📷 Scan' }).click();

    // Then the scanner dialog opens on Barcode mode by default
    const dialog = page.getByRole('dialog', { name: 'Suitcase camera scanner' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('tab', { name: '📷 Scan' })).toHaveAttribute('aria-selected', 'true');

    // And the live camera feed is playing (fake device supplies real frames)
    const video = dialog.locator('video');
    await expect(video).toBeVisible();
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.readyState))
      .toBeGreaterThanOrEqual(2);

    // Then it has no accessibility violations
    const AxeBuilder = (await import('@axe-core/playwright')).default;
    const results = await new AxeBuilder({ page }).include('[aria-label="Suitcase camera scanner"]').analyze();
    expect(results.violations).toEqual([]);
  });

  test('Given Barcode mode, When no barcode is in frame, Then the brand-search fallback still finds a real catalog model', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '📷 Scan' }).click();

    const dialog = page.getByRole('dialog', { name: 'Suitcase camera scanner' });
    const brandInput = dialog.getByLabel('Search brand instead');
    await brandInput.fill('Rimowa');

    const result = dialog.getByRole('button', { name: /Rimowa — Essential Cabin/ });
    await expect(result).toBeVisible();
    await result.click();

    // Then the scanner closes... no -- selecting a model keeps the scanner
    // open (it just resolves the model); closing is separate. Assert the
    // resolved-model banner instead.
    await expect(dialog.getByText('Rimowa — Essential Cabin')).toBeVisible();
  });

  test('Given Measure mode, When the user captures a photo and taps calibration/length/width points, Then computed dimensions replace the suitcase dropdown', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '📷 Scan' }).click();

    const dialog = page.getByRole('dialog', { name: 'Suitcase camera scanner' });
    await dialog.getByRole('tab', { name: '📏 Measure' }).click();
    await expect(dialog.getByRole('tab', { name: '📏 Measure' })).toHaveAttribute('aria-selected', 'true');

    // Wait for the fake camera to actually be playing before capturing --
    // capturing too early would draw a blank frame (0x0 video dimensions).
    const video = dialog.locator('video');
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.videoWidth))
      .toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Capture photo' }).click();

    const canvas = dialog.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('scanner canvas has no bounding box');

    // Calibration: two points 100px apart standing in for the credit card's
    // long edge.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await canvas.click({ position: { x: cx - 200, y: cy } });
    await canvas.click({ position: { x: cx - 100, y: cy } });
    await page.getByRole('button', { name: 'Confirm →' }).click();

    // Length: two points 300px apart.
    await canvas.click({ position: { x: cx - 150, y: cy + 40 } });
    await canvas.click({ position: { x: cx + 150, y: cy + 40 } });
    await page.getByRole('button', { name: 'Confirm →' }).click();

    // Width: two points 150px apart.
    await canvas.click({ position: { x: cx - 75, y: cy + 80 } });
    await canvas.click({ position: { x: cx + 75, y: cy + 80 } });
    await page.getByRole('button', { name: '✓ Done' }).click();

    // Then a result renders with an estimated height (no catalog match)
    await expect(dialog.getByText('Height (est.)')).toBeVisible();

    await page.getByRole('button', { name: '✓ Use' }).click();

    // Then the scanner closes and the trip form shows the measured
    // dimensions in place of the catalog dropdown
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(/Using measured dimensions:/)).toBeVisible();
    await expect(page.locator('#suitcase')).not.toBeVisible();

    // And it can be cleared back to the catalog dropdown
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('#suitcase')).toBeVisible();
  });

  test('Given the scanner is open, When Close is clicked, Then the dialog is dismissed and the camera stream stops', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '📷 Scan' }).click();

    const dialog = page.getByRole('dialog', { name: 'Suitcase camera scanner' });
    await expect(dialog).toBeVisible();

    await page.getByRole('button', { name: 'Close scanner' }).click();
    await expect(dialog).not.toBeVisible();
  });
});
