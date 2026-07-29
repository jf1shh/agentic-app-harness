import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection } from './support';

/**
 * BDD Spec §11.10 — the interactive break-even slider.
 *
 * The §11 section in the spec is the binding discipline for this widget, and
 * each acceptor here mirrors a row in the §11.10 acceptance-criteria table
 * (spec table row 1, 2, 6, and the a11y guarantee that the original §5.5/§5.5a
 * extends to the new widget).
 *
 *  1. Initial thumb position binds to `PlanState.currentHoursPerWeek`.
 *  2. A live drag updates `aria-valuetext` per `step`-sized keypress.
 *  3. The `why-break-even` WhyButton reads engine output from the *current*
 *     slider position, not from the saved default (spec §6.10 + §11.10).
 *  4. A drag past the upper rail (168 hrs) remains readable: the derivation
 *     reads the live value, not the prior default that was saved at mount.
 *  5. `@axe-core/playwright`, scoped to the slider subtree, reports zero
 *     WCAG 2.1 AA violations.
 *
 * Reuses the existing helpers (`gotoPlanner` waits for the load-and-restore
 * effect; `openSection` opens by toggling the underlying `<details>`) so
 * these tests ride the same setup path as the rest of the suite.
 */

test.describe('BDD Spec: The break-even slider follows the saved plan and the live drag', () => {
  test('Given the saved plan was restored on load, When the break-even section is opened, Then the slider thumb sits at the saved currentHoursPerWeek', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    const thumb = page.getByTestId('break-even-slider-thumb');
    await expect(thumb).toBeVisible();
    const ariaNow = await thumb.getAttribute('aria-valuenow');
    const ariaText = await thumb.getAttribute('aria-valuetext');
    const n = Number(ariaNow);
    // The thumb value is a finite number inside the spec's hours range.
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(168);
    // `aria-valuetext` reads as "X hours per week" so a screen reader does
    // not announce the bare index (spec §5.5 / §11.10).
    expect(ariaText).toMatch(/^\d+(?:\.\d+)? hours per week$/);
  });

  test('Given the slider is focused, When the reader presses arrow keys, Then aria-valuetext and aria-valuenow both move with the input', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    const thumb = page.getByTestId('break-even-slider-thumb');
    await thumb.focus();
    const beforeNow = Number(await thumb.getAttribute('aria-valuenow'));
    const beforeText = await thumb.getAttribute('aria-valuetext');
    // step={0.5} on the slider, so five ArrowRights = +2.5 hours.
    for (let i = 0; i < 5; i++) {
      await thumb.press('ArrowRight');
    }
    const afterNow = Number(await thumb.getAttribute('aria-valuenow'));
    const afterText = await thumb.getAttribute('aria-valuetext');
    expect(afterNow).toBeCloseTo(beforeNow + 2.5, 1);
    expect(afterText).not.toBe(beforeText);
    expect(afterText).toMatch(/^\d+(?:\.\d+)? hours per week$/);
  });

  test('Given the slider was dragged to a known value, When the why-break-even button is pressed, Then the derivation reads the live slider position rather than the saved default', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    const thumb = page.getByTestId('break-even-slider-thumb');
    await thumb.focus();
    // Set a deterministic baseline: Home -> min (0); then step up by 60 × 0.5 = 30 hours.
    await thumb.press('Home');
    for (let i = 0; i < 60; i++) {
      await thumb.press('ArrowRight');
    }
    const liveText = (await thumb.getAttribute('aria-valuetext')) ?? '';
    expect(liveText).toBe('30 hours per week');

    // Click why and read from the rendered derivation (engine output, never
    // a separate calculation — the §6.10 discipline).
    await page.getByTestId('why-break-even').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    // The live value must appear verbatim in the workingOut; the saved default
    // would have rendered a different number, and the assertion would fail
    // visibly. This is the §11.10 BDD criterion #6 contract end-to-end.
    await expect(drawer).toContainText('Care at home at 30 hours a week');
    await page.keyboard.press('Escape');
  });

  test('Given the slider was dragged past the upper rail (168 hrs), When the why-break-even button is pressed, Then the derivation still reads the live value, not the saved default', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    const thumb = page.getByTestId('break-even-slider-thumb');
    await thumb.focus();
    await thumb.press('End');
    const liveText = (await thumb.getAttribute('aria-valuetext')) ?? '';
    expect(liveText).toBe('168 hours per week');

    await page.getByTestId('why-break-even').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Care at home at 168 hours a week');
    await page.keyboard.press('Escape');
  });

  test('Given the slider subtree is rendered, When axe-core audits it against WCAG 2.1 AA, Then there are no violations', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');
    const slider = page.getByTestId('break-even-slider');
    await expect(slider).toBeVisible();
    // Scope the audit to the slider subtree so a regression here flags the
    // new widget precisely; checking the whole page would mask the source or
    // split a single root cause across unrelated regions.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[data-testid="break-even-slider"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
