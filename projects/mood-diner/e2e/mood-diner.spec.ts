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

  test('Given a selected restaurant card, When opening details modal and stepping through the booking flow, Then confirm reservation', async ({ page }) => {
    // Given user clicks Book Table on restaurant card
    await page.goto('/');
    const firstBookBtn = page.locator('[id^="btn-book-"]').first();
    await firstBookBtn.click();

    // Then open details modal with Reserve Table active, starting on step 1 of 4
    await expect(page.locator('#tab-book')).toBeVisible();
    await expect(page.locator('#booking-step-datetime')).toBeVisible();
    await expect(page.locator('#submit-reservation-btn')).toHaveCount(0);

    // When inspecting Menu and Busy Times tabs
    await page.click('#tab-menu');
    await expect(page.locator('.modal-content h2')).toBeVisible();

    await page.click('#tab-busy');
    await expect(page.locator('h4:has-text("Hourly Popularity & Busy Heatmap")')).toBeVisible();

    // When returning to Reserve Table tab and stepping through date/time, party/occasion,
    // and seating/notes to the review step
    await page.click('#tab-book');
    await expect(page.locator('#booking-step-datetime')).toBeVisible();
    await page.click('#booking-next-btn');
    await expect(page.locator('#booking-step-party')).toBeVisible();
    await page.click('#booking-next-btn');
    await expect(page.locator('#booking-step-seating')).toBeVisible();
    await page.click('#booking-next-btn');
    await expect(page.locator('#booking-step-review')).toBeVisible();
    await page.click('#submit-reservation-btn');

    // Then display reservation confirmation dialog
    await expect(page.locator('h3:has-text("Reservation Confirmed!")')).toBeVisible();
  });

  test('Given a value entered on an earlier booking step, When the user advances and returns to it, Then the value is still there', async ({ page }) => {
    // Given a party size chosen on step 2 of the booking flow
    await page.goto('/');
    await page.locator('[id^="btn-book-"]').first().click();
    await page.click('#booking-next-btn');
    await expect(page.locator('#booking-step-party')).toBeVisible();
    await page.selectOption('#booking-party-select', '6');

    // When advancing to step 3 and then returning to step 2
    await page.click('#booking-next-btn');
    await expect(page.locator('#booking-step-seating')).toBeVisible();
    await page.click('#booking-back-btn');

    // Then the previously chosen party size is still selected
    await expect(page.locator('#booking-step-party')).toBeVisible();
    await expect(page.locator('#booking-party-select')).toHaveValue('6');
  });

  test('Given the restaurant detail modal is open, When arrow keys are pressed on the tab list, Then focus moves between tabs and the panel activates', async ({ page }) => {
    // Given the modal opens on the Menu tab
    await page.goto('/');
    await page.locator('[id^="btn-menu-"]').first().click();
    await expect(page.locator('#tab-menu')).toHaveAttribute('aria-selected', 'true');
    await page.locator('#tab-menu').focus();

    // When the right arrow key is pressed
    await page.keyboard.press('ArrowRight');

    // Then focus and selection move to the Popular Times tab, and its panel renders
    await expect(page.locator('#tab-busy')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tab-busy')).toBeFocused();
    await expect(page.locator('#panel-busy')).toBeVisible();
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
