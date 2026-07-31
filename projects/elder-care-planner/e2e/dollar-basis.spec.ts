import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * BDD Spec §11.9 — every chart states which dollars it is drawn in.
 *
 * The defect this closes is not that inflation is missing. It is that the
 * runway simulation compounds the care escalator and the income COLA, the IL
 * overlay reads its series verbatim from that same engine, and the break-even
 * comparison has no time dimension at all — and until now nothing on screen
 * distinguished the two bases. A reader carrying the runway's basis across to
 * the break-even panel would misread it, and vice versa.
 *
 * Note the shape of these assertions: they check that each chart names its own
 * basis AND that it does not claim the other one. A test that only asserted
 * "some label is present" would pass on a page that labelled every chart
 * identically, which is the exact bug.
 */

test.describe('BDD Spec: Every chart says which dollars it is drawn in', () => {
  test('Given the runway chart is on screen, When its basis label is read, Then it names future dollars rather than today’s', async ({
    page,
  }) => {
    await gotoPlanner(page);

    const basis = page.getByTestId('runway-dollar-basis');
    await expect(basis).toBeVisible();
    const text = (await basis.textContent()) ?? '';

    expect(text).toMatch(/future dollars/i);
    // The runway is inflation-loaded, so claiming today's dollars would be false.
    expect(text).not.toMatch(/in today’s dollars|in today's dollars/i);
  });

  test('Given the break-even chart is on screen, When its basis label is read, Then it names today’s dollars and says no inflation is applied', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'breakeven');

    const basis = page.getByTestId('break-even-dollar-basis');
    await expect(basis).toBeVisible();
    const text = (await basis.textContent()) ?? '';

    expect(text).toMatch(/today’s dollars|today's dollars/i);
    expect(text).toMatch(/no inflation/i);
    expect(text).not.toMatch(/future dollars/i);
  });

  test('Given both charts are on screen at once, When their basis labels are compared, Then they do not say the same thing', async ({
    page,
  }) => {
    // The whole point. If a future change makes both labels identical, the
    // panels become indistinguishable again and this spec is the only thing
    // that notices.
    await gotoPlanner(page);
    await openSection(page, 'breakeven');

    const runwayText = (await page.getByTestId('runway-dollar-basis').textContent()) ?? '';
    const breakEvenText = (await page.getByTestId('break-even-dollar-basis').textContent()) ?? '';

    expect(runwayText.trim()).not.toBe('');
    expect(breakEvenText.trim()).not.toBe('');
    expect(runwayText).not.toBe(breakEvenText);
  });

  test('Given the break-even derivation is opened, When its assumptions are read, Then they state the same basis the chart label states', async ({
    page,
  }) => {
    // §11.9's second half: the derivation panel names the basis too, from the
    // same source, so the chart and its explanation cannot disagree.
    await gotoPlanner(page);
    await openSection(page, 'breakeven');

    await page.getByTestId('why-break-even').click();
    const drawer = page.getByTestId('explain-drawer');
    await expect(drawer).toBeVisible();

    await expect(drawer).toContainText(/today’s dollars|today's dollars/i);
    await expect(drawer).toContainText(/no inflation applied/i);
  });
});
