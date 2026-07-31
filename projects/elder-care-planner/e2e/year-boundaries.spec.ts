import { test, expect, type Page } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * BDD Spec §11.8 — year boundaries and the depletion marker on the IL chart.
 *
 * Before this, the comparison chart carried exactly two x-axis labels, "Month 1"
 * and "Month N", and no marker for the event a family actually reads the chart
 * to find. "We run out somewhere around year six" was not answerable from it.
 *
 * Two things these specs are careful about.
 *
 *  - The data resolution stays MONTHLY (§6.5b.3 records annual sampling as
 *    rejected). So the assertions check that year *labels* appeared, not that
 *    the series was re-sampled.
 *  - The depletion marker must sit at the month the curve actually reaches
 *    zero, not at the nearest year label. A marker rounded to a boundary would
 *    contradict the curve directly beneath it, which is worse than no marker.
 *
 * Attributes rather than visibility, per the §6 "a flat line has no bounding
 * box" lesson: these are SVG shapes that can legitimately have zero extent.
 */

interface OptionSpec {
  label: string;
  entryDollars: string;
  monthlyDollars: string;
}

async function addOption(page: Page, index: number, spec: OptionSpec) {
  await openSection(page, 'il');
  await page.getByTestId('il-add-option').click();
  const card = page.getByTestId(`il-option-il${index + 1}`);
  await expect(card).toBeVisible();

  const name = card.getByLabel('What is this option called?');
  await name.fill(spec.label);
  await expect(name).toHaveValue(spec.label);

  if (spec.entryDollars !== '0') {
    const entry = card.getByLabel('Entry fee');
    await entry.fill(spec.entryDollars);
    await expect(entry).toHaveValue(spec.entryDollars);
  }
  const monthly = card.getByLabel('Monthly service fee');
  await monthly.fill(spec.monthlyDollars);
  await expect(monthly).toHaveValue(spec.monthlyDollars);
}

/**
 * One option, priced so the money genuinely runs out inside the projection.
 * A fixture whose curve never depletes would leave the marker absent and the
 * spec would pass by not looking (.agents/AGENTS.md §9.3).
 */
async function addDepletingOption(page: Page) {
  await addOption(page, 0, {
    label: 'Cedar Ridge, expensive',
    entryDollars: '0',
    monthlyDollars: '14000',
  });
}

test.describe('BDD Spec: The comparison chart says which year the money runs out', () => {
  test('Given a projection spanning whole years, When the chart is drawn, Then each completed year carries its own label', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addDepletingOption(page);

    await expect(page.getByTestId('il-overlay-chart')).toBeVisible();
    // Year 1 and year 2 exist in any projection of two years or more.
    await expect(page.getByTestId('il-year-1')).toHaveCount(1);
    await expect(page.getByTestId('il-year-2')).toHaveCount(1);
  });

  test('Given savings that run out inside the projection, When the chart is drawn, Then a depletion marker is placed at the month it happens', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addDepletingOption(page);

    const marker = page.getByTestId('il-depletion-il1');
    await expect(marker).toHaveCount(1);

    const month = Number(await marker.getAttribute('data-month'));
    const year = Number(await marker.getAttribute('data-year'));

    expect(Number.isFinite(month)).toBe(true);
    expect(month).toBeGreaterThan(0);

    // The truthfulness rule: the year must be the one CONTAINING that month,
    // not a rounded-off boundary. Snapping month 74 to year 6 or year 8 would
    // put the marker somewhere the curve never crossed.
    expect(year).toBe(Math.ceil(month / 12));
  });

  test('Given the depletion is marked on the chart, When the readout beneath it is read, Then it names the same year in words', async ({
    page,
  }) => {
    // The marker and the sentence must agree. Two renderings of the same fact
    // that disagree is worse than one of them being absent.
    await gotoPlanner(page);
    await addDepletingOption(page);

    const marker = page.getByTestId('il-depletion-il1');
    const year = await marker.getAttribute('data-year');
    const month = await marker.getAttribute('data-month');

    const readout = page.getByTestId('il-readout-il1');
    await expect(readout).toBeVisible();
    await expect(readout).toContainText(`year ${year}`);
    await expect(readout).toContainText(`month ${month}`);
  });

  test('Given an option whose savings never run out, When its readout is read, Then it says so rather than staying silent', async ({
    page,
  }) => {
    // A silent option is indistinguishable from an unanswered one.
    await gotoPlanner(page);
    await addOption(page, 0, {
      label: 'Cedar Ridge, modest',
      entryDollars: '0',
      monthlyDollars: '1',
    });

    await expect(page.getByTestId('il-readout-il1')).toContainText(/last the full \d+ months/i);
    await expect(page.getByTestId('il-depletion-il1')).toHaveCount(0);
  });

  test('Given a screen reader, When the chart’s description is read, Then it states the depletion year too', async ({
    page,
  }) => {
    // A marker only sighted readers can find is not the feature that was asked
    // for. The chart is role="img", so its accessible name has to carry it.
    await gotoPlanner(page);
    await addDepletingOption(page);

    const chart = page.getByTestId('il-overlay-chart');
    const label = (await chart.getAttribute('aria-label')) ?? '';
    expect(label).toMatch(/run out in year \d+/i);
  });
});
