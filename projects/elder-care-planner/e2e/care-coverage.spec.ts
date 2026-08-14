import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection, waitForEncryptedSave, readStoredPlannerState } from './support';
import { decodePlanFromShare } from '../src/lib/share';

/**
 * The weekly care-coverage grid (spec §11.15).
 *
 * A typical-week pattern, never a calendar — no dates, no reminders, no
 * shift trading. Its whole purpose is to make `providesUnpaidHoursPerWeek`
 * checkable: these specs prove the grid's covered-hours arithmetic actually
 * reaches the split panel's suggestion, that accepting a suggestion never
 * happens silently, and that the grid itself — a family's day-to-day
 * logistics, not a cost figure — never leaves this device.
 */
test.describe('BDD Spec: The weekly coverage pattern makes unpaid hours checkable', () => {
  test('Given cells assigned in the grid, When the uncovered summary is read, Then it reflects exactly what is assigned', async ({
    page,
  }) => {
    // Given the split section, with two contributors by default
    await gotoPlanner(page);
    await openSection(page, 'split');

    // Then every block starts uncovered
    await expect(page.getByTestId('care-coverage-uncovered')).toHaveText(
      '168 hours a week have no one assigned.',
    );

    // When two blocks are assigned to the first family member
    await page
      .getByTestId('coverage-mon-morning')
      .selectOption({ label: 'Family member 1' });
    await page
      .getByTestId('coverage-mon-afternoon')
      .selectOption({ label: 'Family member 1' });

    // Then the uncovered total drops by exactly those two six-hour blocks
    await expect(page.getByTestId('care-coverage-uncovered')).toHaveText(
      '156 hours a week have no one assigned.',
    );
  });

  test('Given a cell is reassigned, When the grid is read, Then the old assignment is replaced rather than duplicated', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'split');

    await page.getByTestId('coverage-tue-evening').selectOption({ label: 'Family member 1' });
    await page.getByTestId('coverage-tue-evening').selectOption({ label: 'Family member 2' });

    // The visible control can only ever show one value, so the real risk is
    // an underlying array with two entries for the same cell — checked by
    // decrypting and parsing the stored state directly rather than trusting
    // the <select>.
    await waitForEncryptedSave(page);
    const state = await readStoredPlannerState(page);
    const matches = (state.careCoverage as { day: string; block: string }[]).filter(
      (s) => s.day === 'tue' && s.block === 'evening',
    );
    expect(matches).toHaveLength(1);
  });

  test('Given the grid suggests more hours than currently typed, When "Use N hrs/week" is clicked, Then the figure updates rather than being applied silently', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'split');

    // Given the first family member starts at their default of 0 unpaid hours
    await expect(page.getByLabel('Unpaid care hours per week').first()).toHaveValue('0');

    // When three blocks (18 hours) are assigned to them in the grid
    await page.getByTestId('coverage-wed-morning').selectOption({ label: 'Family member 1' });
    await page.getByTestId('coverage-wed-afternoon').selectOption({ label: 'Family member 1' });
    await page.getByTestId('coverage-wed-evening').selectOption({ label: 'Family member 1' });

    // Then a suggestion appears naming the figure, and the typed field has not
    // moved on its own
    const suggestion = page.getByTestId(/coverage-suggestion-/).first();
    await expect(suggestion).toContainText('18 hrs/week');
    await expect(page.getByLabel('Unpaid care hours per week').first()).toHaveValue('0');

    // When the family accepts the suggestion
    await suggestion.getByRole('button', { name: 'Use 18 hrs/week' }).click();

    // Then the typed field is updated, and the suggestion — now matching —
    // stops repeating what the field already says
    await expect(page.getByLabel('Unpaid care hours per week').first()).toHaveValue('18');
    await expect(page.getByTestId(/coverage-suggestion-/)).toHaveCount(0);
  });

  test('Given a coverage pattern is laid out, When the page is reloaded, Then it is still there', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'split');
    await page.getByTestId('coverage-thu-overnight').selectOption({ label: 'Family member 2' });

    await waitForEncryptedSave(page);

    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
    await openSection(page, 'split');

    await expect(page.getByTestId('coverage-thu-overnight')).not.toHaveValue('');
  });

  test('Given a plan is exported or shared, When the payload is inspected, Then the coverage grid itself is absent', async ({
    page,
  }) => {
    // Given a coverage pattern laid out
    await gotoPlanner(page);
    await openSection(page, 'split');
    await page.getByTestId('coverage-fri-evening').selectOption({ label: 'Family member 1' });

    await waitForEncryptedSave(page);

    // When the shared family link is generated (spec §11.6) from the current plan
    await page.getByLabel('Passphrase').fill('correct horse battery staple');
    await page.getByTestId('sharelink-generate').click();
    const link = await page.getByTestId('sharelink-url').inputValue();

    // Then decoding it with the app's own decoder shows no coverage data —
    // Plan never carried a field for it in the first place, the same
    // structural guarantee §11.2 and §11.14 already have for their own
    // PlannerState-only data
    const fragment = link.slice(link.indexOf('#') + 1);
    const result = await decodePlanFromShare(fragment, 'correct horse battery staple');
    expect(result.ok).toBe(true);
    const planJson = result.ok ? JSON.stringify(result.payload.plan) : '';
    expect(planJson).not.toContain('careCoverage');
    expect(planJson).not.toContain('overnight');
  });

  test('Given the coverage grid is in use, When it is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'split');
    await page.getByTestId('coverage-sat-afternoon').selectOption({ label: 'Family member 1' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
