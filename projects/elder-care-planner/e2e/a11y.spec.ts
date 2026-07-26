import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility is not a checkbox for this audience. The users are frequently
 * older adults themselves, or their children reading a phone screen in a
 * hospital corridor. The large-text mode and 200% zoom cases are tested because
 * that is how this app will actually be used.
 */
test.describe('BDD Spec: The planner is usable by everyone', () => {
  test('Given the planner as first loaded, When it is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    // Given the planner
    await page.goto('/');

    // When axe audits the page against WCAG 2 A and AA
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then nothing is flagged
    expect(results.violations).toEqual([]);
  });

  test('Given larger text is switched on, When it is audited, Then there are still no violations', async ({
    page,
  }) => {
    // Given a reader who needs bigger type
    await page.goto('/');
    await page.getByRole('button', { name: 'Larger text' }).click();

    // When axe audits the page again
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then the larger type has not broken contrast or layout semantics
    expect(results.violations).toEqual([]);
  });

  test('Given a narrow phone viewport at 200% zoom, When the page renders, Then it never scrolls sideways', async ({
    page,
  }) => {
    // Given a small screen with text scaled up
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Larger text' }).click();

    // When the document width is measured
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    // Then the body does not scroll horizontally
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Given a keyboard-only user, When tabbing from the top, Then the first controls are reachable and visible', async ({
    page,
  }) => {
    // Given the planner
    await page.goto('/');

    // When the user tabs into the page
    await page.keyboard.press('Tab');

    // Then focus lands on a real, visible control
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
