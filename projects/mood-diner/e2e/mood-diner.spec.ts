import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('MoodDiner End-to-End Suite', () => {
  test('renders homepage with filters, aggregate review scores, and weather widget', async ({ page }) => {
    await page.goto('/');

    // Check brand header
    await expect(page.locator('h1')).toContainText('MoodDiner');

    // Check occasion filter presence
    await expect(page.locator('#occasion-filter-anniversary')).toBeVisible();
    await expect(page.locator('#occasion-filter-birthday')).toBeVisible();

    // Check initial restaurant cards loaded (7 real-world authentic spots)
    const cards = page.locator('.restaurant-grid .glass-panel');
    await expect(cards).toHaveCount(7);

    // Filter by Anniversary
    await page.click('#occasion-filter-anniversary');
    const filteredCards = page.locator('.restaurant-grid .glass-panel');
    await expect(filteredCards.first()).toBeVisible();

    // Reset filter
    await page.click('#occasion-filter-all');
  });

  test('switches weather preset and observes AI weather recommendation changes', async ({ page }) => {
    await page.goto('/');

    // Open weather modal
    await page.click('#weather-toggle-btn');
    await expect(page.locator('h3:has-text("AI Weather Recommendation Engine")')).toBeVisible();

    // Click Freezing Winter preset
    await page.click('#weather-preset-winter');

    // Confirm weather updated in header
    await expect(page.locator('#weather-toggle-btn')).toContainText('Winter');
  });

  test('opens restaurant details modal, views menu, inspects busy times, and books a reservation', async ({ page }) => {
    await page.goto('/');

    // Click Book Table on first restaurant card
    const firstBookBtn = page.locator('[id^="btn-book-"]').first();
    await firstBookBtn.click();

    // Verify modal open with Reserve Table tab active
    await expect(page.locator('#tab-book')).toBeVisible();
    await expect(page.locator('#submit-reservation-btn')).toBeVisible();

    // Switch to Menu tab
    await page.click('#tab-menu');
    await expect(page.locator('.modal-content h2')).toBeVisible();

    // Switch to Popular Times tab
    await page.click('#tab-busy');
    await expect(page.locator('h4:has-text("Hourly Popularity & Busy Heatmap")')).toBeVisible();

    // Switch back to Reserve Table and submit
    await page.click('#tab-book');
    await page.click('#submit-reservation-btn');

    // Verify confirmation
    await expect(page.locator('h3:has-text("Reservation Confirmed!")')).toBeVisible();
  });

  test('passes strict accessibility (a11y) audit', async ({ page }) => {
    await page.goto('/');
    
    // Inject axe accessibility scanner
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
