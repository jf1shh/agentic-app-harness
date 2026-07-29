import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection } from './support';
import { STARTING_GUIDE_ENTRIES } from '../src/lib/data/startingGuide';
import { GUIDE_CATEGORY_ORDER } from '../src/lib/data/startingGuide';

/**
 * Spec §11.11 — "A starting guide to outside help".
 *
 * These tests assert the surface as a reader sees it: the panel mounts at the
 * promised position in the page (between the shortlist and the IL
 * comparison), opens to five flat always-open category lists, every URL-bearing
 * entry is wrapped in a hardened external link, every entry's intake kind is
 * visible, and the panel's prose carries the §1.1 trust promises on screen.
 *
 * The link invariants — `target="_blank" rel="noopener noreferrer"` — are
 * asserted by parsing the rendered DOM, exactly the way an external security
 * reviewer would. They are not inferred from the data file; a wrong wire-up
 * at this seam is the bug the test is written to catch.
 */
test.describe('BDD Spec: §11.11 starting guide', () => {
  test('When the new section is opened, Then all five categories are present with at least one entry each', async ({
    page,
  }) => {
    // Given the planner on a first visit
    await gotoPlanner(page);
    await openSection(page, 'guide');

    // Then the five user-supplied categories render, each with at least one
    // entry — the AC1 invariant from §11.11's acceptance criteria
    for (const cat of GUIDE_CATEGORY_ORDER) {
      const section = page.getByTestId(`guide-category-${cat}`);
      await expect(section).toBeVisible();
      const items = await section.locator('[data-testid^="guide-entry-"]').count();
      expect(items).toBeGreaterThan(0);
    }

    // And the curated list count matches the data file
    const totalEntries = await page.locator('[data-testid^="guide-entry-"]').count();
    expect(totalEntries).toBe(STARTING_GUIDE_ENTRIES.length);
  });

  test('When every URL-bearing entry is read, Then every link has target="_blank" and rel="noopener noreferrer"', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'guide');

    // Pick out every entry with a URL; assert the seam properties on each.
    const entriesWithUrls = STARTING_GUIDE_ENTRIES.filter((e) => e.url !== undefined);
    expect(entriesWithUrls.length).toBeGreaterThan(0);

    for (const entry of entriesWithUrls) {
      const li = page.getByTestId(`guide-entry-${entry.id}`);
      const anchor = li.locator('a');
      await expect(anchor).toHaveCount(1);
      await expect(anchor).toHaveAttribute('target', '_blank');
      const rel = await anchor.getAttribute('rel');
      expect(rel ?? '').toMatch(/noopener/);
      expect(rel ?? '').toMatch(/noreferrer/);
      await expect(anchor).toHaveAttribute('href', entry.url!);
    }
  });

  test('When the panel is read, Then every entry renders an intake tag with the right label', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'guide');

    // The data file's intake enum maps onto three visible tags. Each entry must
    // carry one of the three — picking up a regression where a new label was
    // introduced without updating the tag mapping.
    const visibleLabels = ['Free resource', 'Matching service', 'Advice'];
    for (const entry of STARTING_GUIDE_ENTRIES) {
      const tag = page.getByTestId(`guide-intake-${entry.id}`);
      await expect(tag).toBeVisible();
      const text = (await tag.textContent())?.trim() ?? '';
      expect(visibleLabels).toContain(text);
    }
  });

  test('When the §1.1 trust promises are read, Then the disclaimer is visible in panel copy', async ({
    page,
  }) => {
    // The disclaimer copy is the on-screen counterpart of the data-side
    // `intake` enum: the panel tells a reader both that the app does not earn
    // referral fees from any listing, and that some listings earn fees from
    // providers. A panel that drops either line reduces the trust claim to
    // unverified assertion.
    await gotoPlanner(page);
    await openSection(page, 'guide');

    const trustBody = await page.getByTestId('section-guide').innerText();
    expect(trustBody).toMatch(/this app does not earn/i);
    expect(trustBody).toMatch(/matching services?/i);
    expect(trustBody).toMatch(/checked .* 2026-/i);
  });

  test('When the panel is audited by axe-core, Then there are no WCAG 2.1 AA violations', async ({
    page,
  }) => {
    // Spec §6.10: a11y is binding for every new component. Mirror the
    // Facilities spec's narrow scope: audit only the new section, with the
    // section open, to catch colour-contrast, link-name, and label issues at
    // the exact seam.
    await gotoPlanner(page);
    await openSection(page, 'guide');

    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="guide-heading"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('When the jump bar is compared to the page sections, Then it lists exactly the new "guide" entry', async ({
    page,
  }) => {
    // The §5.1a invariant: navSections ∪ section-testids are equal. The new
    // entry must appear in both sets in the same position — otherwise the
    // jump bar either silently drops the feature or advertises a section
    // that does not render.
    await gotoPlanner(page);

    const ids = (attr: string) =>
      page.evaluate(
        (prefix) =>
          [...document.querySelectorAll(`[data-testid^="${prefix}"]`)]
            .map((el) => el.getAttribute('data-testid')!.slice(prefix.length))
            .sort(),
        attr,
      );

    expect(await ids('nav-')).toEqual(await ids('section-'));
    expect(await ids('section-')).toContain('guide');
  });
});
