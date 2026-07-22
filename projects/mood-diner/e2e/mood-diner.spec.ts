import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('BDD Spec: MoodDiner Recommendation & Reservation Engine', () => {
  test('Given user lands on MoodDiner homepage, When viewing initial state, Then render filters, 7 authentic spots, and weather engine', async ({ page }) => {
    // Given user lands on MoodDiner homepage
    await page.goto('/');

    // Then render brand header & filters
    await expect(page.locator('h1')).toContainText('MoodDiner');
    await expect(page.locator('#occasion-filter-anniversary')).toBeVisible();
    await expect(page.locator('#occasion-filter-birthday')).toBeVisible();

    // And render initial authentic restaurant spots
    const cards = page.locator('.restaurant-grid .glass-panel');
    await expect(cards).toHaveCount(7);

    // When filtering by Anniversary occasion
    await page.click('#occasion-filter-anniversary');
    
    // Then display filtered cards
    const filteredCards = page.locator('.restaurant-grid .glass-panel');
    await expect(filteredCards.first()).toBeVisible();

    // Reset filter
    await page.click('#occasion-filter-all');
  });

  test('Given active weather engine, When switching to Freezing Winter preset, Then update weather recommendations and header status', async ({ page }) => {
    // Given user on homepage
    await page.goto('/');

    // When opening weather modal & selecting Freezing Winter preset
    await page.click('#weather-toggle-btn');
    await expect(page.locator('h3:has-text("AI Weather Recommendation Engine")')).toBeVisible();
    await page.click('#weather-preset-winter');

    // Then update weather state in header
    await expect(page.locator('#weather-toggle-btn')).toContainText('Winter');
  });

  test('Given a selected restaurant card, When opening details modal and submitting booking form, Then confirm reservation', async ({ page }) => {
    // Given user clicks Book Table on restaurant card
    await page.goto('/');
    const firstBookBtn = page.locator('[id^="btn-book-"]').first();
    await firstBookBtn.click();

    // Then open details modal with Reserve Table active
    await expect(page.locator('#tab-book')).toBeVisible();
    await expect(page.locator('#submit-reservation-btn')).toBeVisible();

    // When inspecting Menu and Busy Times tabs
    await page.click('#tab-menu');
    await expect(page.locator('.modal-content h2')).toBeVisible();

    await page.click('#tab-busy');
    await expect(page.locator('h4:has-text("Hourly Popularity & Busy Heatmap")')).toBeVisible();

    // When returning to Reserve Table tab & submitting booking form
    await page.click('#tab-book');
    await page.click('#submit-reservation-btn');

    // Then display reservation confirmation dialog
    await expect(page.locator('h3:has-text("Reservation Confirmed!")')).toBeVisible();
  });

  test('Given MoodDiner UI layout, When scanned by axe accessibility engine, Then pass zero WCAG 2.0 AA violations', async ({ page }) => {
    // Given user visits MoodDiner app
    await page.goto('/');
    
    // When executing automated WCAG 2.0 AA accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then verify zero violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
