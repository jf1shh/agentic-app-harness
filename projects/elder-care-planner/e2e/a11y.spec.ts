import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openAllSections } from './support';

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
    await gotoPlanner(page);

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
    await gotoPlanner(page);
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
    await gotoPlanner(page);
    await page.getByRole('button', { name: 'Larger text' }).click();

    // When the document width is measured
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    // Then the body does not scroll horizontally
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Given every section expanded, When it is audited, Then there are still no violations', async ({
    page,
  }) => {
    // The audit above sees the page as it arrives — which, now that everything
    // after the results is collapsed (spec §5.1a), is a page whose controls are
    // mostly not in the accessibility tree at all. Auditing the collapsed state
    // alone would quietly stop covering the tables, selects and forms this
    // suite was written to cover, so the expanded state is audited too.
    await gotoPlanner(page);
    await openAllSections(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Given a narrow phone viewport, When every section is expanded at 200% zoom, Then it still never scrolls sideways', async ({
    page,
  }) => {
    // Same reasoning: the collapsed page is trivially narrow, so the overflow
    // check has to run against the content it was written to protect.
    await page.setViewportSize({ width: 360, height: 720 });
    await gotoPlanner(page);
    await page.getByRole('button', { name: 'Larger text' }).click();
    await openAllSections(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Given a collapsed section, When it is reached by keyboard, Then Enter opens it and its contents become reachable', async ({
    page,
  }) => {
    // A disclosure that only responds to a mouse would put the whole page
    // behind a pointer for a keyboard user.
    await gotoPlanner(page);
    // Scoped by class, not by tag: this section contains a nested `<details>`
    // of its own (the fee-range reference), so `locator('summary')` matches two.
    const summary = page.getByTestId('section-refine').locator('summary.section-summary');
    await summary.focus();
    await expect(summary).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page.getByTestId('section-refine').locator('.section-body')).toBeVisible();
    await expect(page.getByLabel('Care-level surcharge, monthly')).toBeVisible();
  });

  test('Given the jump bar, When a section entry is activated, Then that section opens and is scrolled to', async ({
    page,
  }) => {
    // The jump bar replaces the scroll, so an entry that scrolled to a section
    // without opening it would land the reader on a control with nothing under
    // it (spec §5.1a).
    await gotoPlanner(page);
    await expect(page.getByTestId('section-ledger').locator('.section-body')).toBeHidden();

    await page.getByTestId('nav-ledger').click();

    await expect(page.getByTestId('section-ledger').locator('.section-body')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What has actually been paid' })).toBeInViewport();
  });

  test('Given a keyboard-only user, When tabbing from the top, Then the first controls are reachable and visible', async ({
    page,
  }) => {
    // Given the planner
    await gotoPlanner(page);

    // When the user tabs into the page
    await page.keyboard.press('Tab');

    // Then focus lands on a real, visible control
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });
});
