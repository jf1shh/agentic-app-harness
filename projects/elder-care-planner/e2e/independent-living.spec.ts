import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cents, gotoPlanner, openSection } from './support';

/**
 * The Independent Living comparison (spec §6.5b.4).
 *
 * The point of this panel is not to price one community, it is to show three
 * shapes of commitment crossing each other over time. The specs below therefore
 * check the two things that make the chart honest rather than merely present:
 * that the refund band exists at all (without it the option with the *best*
 * refund terms draws the *lowest* line), and that the table agrees with the
 * curve to the cent, because the table is also the chart's accessible
 * equivalent.
 */

interface OptionSpec {
  label: string;
  entryDollars: string;
  monthlyDollars: string;
  ladder?: { months: string; percent: string }[];
}

async function addOption(page: Page, index: number, spec: OptionSpec) {
  // The comparison is collapsed on arrival (spec §5.1a). Idempotent, so every
  // caller gets it without having to remember.
  await openSection(page, 'il');
  await page.getByTestId('il-add-option').click();
  const card = page.getByTestId(`il-option-il${index + 1}`);
  await expect(card).toBeVisible();

  const name = card.getByLabel('What is this option called?');
  await name.fill(spec.label);
  // Assert the value stuck rather than trusting a fill that may have landed
  // pre-hydration — a swallowed fill should fail here (.agents/AGENTS.md §6).
  await expect(name).toHaveValue(spec.label);

  // A new option already starts at zero, and CurrencyInput renders zero as an
  // empty field with a "0" placeholder — so filling "0" can never read back as
  // "0". Skipping the fill keeps the stuck-value assertion meaningful for every
  // case where it can actually apply.
  const entry = card.getByLabel('Entry fee, paid once on moving in');
  if (spec.entryDollars === '0') {
    await expect(entry).toHaveValue('');
  } else {
    await entry.fill(spec.entryDollars);
    await expect(entry).toHaveValue(spec.entryDollars);
  }

  const monthly = card.getByLabel('Monthly service fee');
  await monthly.fill(spec.monthlyDollars);
  await expect(monthly).toHaveValue(spec.monthlyDollars);

  for (const [i, row] of (spec.ladder ?? []).entries()) {
    await card.getByTestId(`il-add-row-il${index + 1}`).click();
    const months = card.getByLabel('After how many months?').nth(i);
    await months.fill(row.months);
    await expect(months).toHaveValue(row.months);
    const percent = card.getByLabel('Percent refunded').nth(i);
    await percent.fill(row.percent);
    await expect(percent).toHaveValue(row.percent);
  }
}

/**
 * Give the plan enough savings that all three options are affordable.
 *
 * The default plan holds $150,000, which every realistic entry fee exceeds —
 * leaving all three curves flat on zero from month one, where they overlap,
 * carry no band, and prove nothing about the comparison. The unaffordable case
 * gets its own spec below, against the default savings.
 */
async function setSavings(page: Page, dollars: string) {
  const savings = page.getByLabel('Savings available for care');
  await savings.fill(dollars);
  await expect(savings).toHaveValue(dollars);
}

/** The three shapes from spec §6.5b: refundable entry, flat entry, rental only. */
async function addThreeOptions(page: Page) {
  await setSavings(page, '1200000');
  await addOption(page, 0, {
    label: 'Riverside, refundable',
    entryDollars: '400000',
    monthlyDollars: '3500',
    ladder: [
      { months: '12', percent: '80' },
      { months: '36', percent: '60' },
      { months: '60', percent: '30' },
    ],
  });
  await addOption(page, 1, {
    label: 'Oakfield, no refund',
    entryDollars: '200000',
    monthlyDollars: '4500',
  });
  await addOption(page, 2, {
    label: 'Millbrook, rental only',
    entryDollars: '0',
    monthlyDollars: '6000',
  });
}

test.describe('BDD Spec: Three independent living contracts on one chart', () => {
  test('Given no options entered, When the panel is read, Then it explains what to enter rather than drawing an empty chart', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'il');
    await expect(page.getByTestId('il-empty')).toBeVisible();
    await expect(page.getByTestId('il-overlay-chart')).toHaveCount(0);
  });

  test('Given three contracts entered, When the chart is drawn, Then one line per option appears on one shared axis', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addThreeOptions(page);

    await expect(page.getByTestId('il-overlay-chart')).toBeVisible();
    await expect(page.getByTestId('il-line-il1')).toBeVisible();
    await expect(page.getByTestId('il-line-il2')).toBeVisible();
    await expect(page.getByTestId('il-line-il3')).toBeVisible();
  });

  test('Given an option with a refund schedule, When the chart is drawn, Then its refund band is present and the option with no refund has none', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addThreeOptions(page);

    // The refundable contract carries a band; without it, the option with the
    // best refund terms would draw the lowest line and read as the worst deal.
    await expect(page.getByTestId('il-band-il1')).toBeVisible();
    // A contract that refunds nothing has nothing to shade.
    await expect(page.getByTestId('il-band-il2')).toHaveCount(0);
    await expect(page.getByTestId('il-band-il3')).toHaveCount(0);
  });

  test('Given the chart is on screen, When the table beneath it is read, Then every figure is present for every option and year', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addThreeOptions(page);

    // The table is the chart's accessible equivalent, so it must carry a
    // savings-left and refund figure per option per projection year.
    const rows = page.locator('table:below(:text("Savings remaining, month by month")) tbody tr');
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();

    // Year 1 for the refundable option: 80% of a $400,000 entry = $320,000.
    const cell = firstRow.locator('td').first();
    const text = (await cell.innerText()).split('/');
    expect(text).toHaveLength(2);
    expect(cents(text[1])).toBe(32_000_000);
  });

  test('Given an entry fee above the plan’s savings, When the panel is read, Then the shortfall is named and the option stays on the chart', async ({
    page,
  }) => {
    await gotoPlanner(page);
    // The default plan holds $150,000 of savings; a $400,000 entry is short.
    await addOption(page, 0, {
      label: 'Riverside, refundable',
      entryDollars: '400000',
      monthlyDollars: '3500',
    });

    // §6.5b.4 as amended: shown, de-emphasised, with the gap named — not
    // hidden, because the gap is only actionable next to the comparison.
    const shortfall = page.getByTestId('il-shortfall-il1');
    await expect(shortfall).toBeVisible();
    // Pull the currency figure out rather than stripping the whole sentence —
    // `cents()` would keep every full stop and parse to NaN.
    const figure = (await shortfall.innerText()).match(/\$[\d,]+(?:\.\d{2})?/);
    expect(figure, 'no currency figure in the shortfall callout').not.toBeNull();
    expect(cents(figure![0])).toBe(25_000_000);

    // The line is present and de-emphasised, which is what the amendment asks
    // for. `toBeVisible` is deliberately not used: an entry fee this far above
    // savings wipes the assets in month one, so the curve is flat on zero and
    // its bounding box has no height — correct output, but a shape Playwright
    // reports as hidden.
    const line = page.getByTestId('il-line-il1');
    await expect(line).toHaveCount(1);
    await expect(line).toHaveAttribute('stroke-dasharray', '3 3');
    await expect(line).toHaveAttribute('stroke-opacity', '0.55');
    // De-emphasised, not erased: no refund band on an option that cannot be
    // entered in the first place.
    await expect(page.getByTestId('il-band-il1')).toHaveCount(0);
  });

  test('Given the comparison is shared with a sibling, When its copy is read, Then it never addresses the reader in the second person', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addThreeOptions(page);

    // Spec §5.4 — the panel may be read by someone who did not build the plan.
    const panel = page.locator('section[aria-labelledby="il-heading"]');
    const copy = (await panel.innerText()).toLowerCase();
    for (const word of [' you ', ' your ', ' you.', ' your.', "you'", 'you’']) {
      expect(copy, `second-person copy found: "${word}"`).not.toContain(word);
    }
  });

  test('Given the comparison is in use, When the page is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await addThreeOptions(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
