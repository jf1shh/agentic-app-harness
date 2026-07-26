import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The contribution ledger (spec §6.6).
 *
 * Research finding §2.4 is blunt: the fight is rarely about whether a parent
 * needs help, it is about who pays. A split settles that in theory; a written
 * record of what was actually paid settles it in practice. These specs cover
 * the flow a family actually performs — log a payment, see the reconciliation
 * move — and check the reconciliation arithmetic as *rendered*, because a
 * balance that is right in cents but displays inconsistently is the failure
 * that restarts the argument.
 */

/**
 * Wait for React to attach its event listeners.
 *
 * A `fill()` that lands before hydration sets the DOM value, fires an input
 * event into a page with no listener yet, and is then reverted by the first
 * client render — silently, and looking exactly like a broken control. The page
 * sets `data-textsize` from a client effect, so its presence is proof that
 * effects have run and the form is genuinely interactive.
 */
async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.textsize !== undefined);
}

async function logPayment(
  page: Page,
  opts: { who?: string; date: string; dollars: string; category?: string; note?: string },
) {
  if (opts.who) await page.getByLabel('Who paid?').selectOption({ label: opts.who });
  await page.getByLabel('When?').fill(opts.date);
  // Assert the value stuck rather than clicking a button that will not enable:
  // a swallowed fill should fail here, where the cause is legible.
  await expect(page.getByLabel('When?')).toHaveValue(opts.date);
  await page.getByLabel('How much?').fill(opts.dollars);
  if (opts.category) await page.getByLabel('What for?').selectOption({ label: opts.category });
  if (opts.note) await page.getByLabel('Note').fill(opts.note);
  await expect(page.getByTestId('add-ledger-entry')).toBeEnabled();
  await page.getByTestId('add-ledger-entry').click();
}

/** Parse a rendered "$1,234.56" cell back into cents. */
function cents(text: string): number {
  return Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100);
}

test.describe('BDD Spec: The ledger records what was actually paid', () => {
  test('Given a family sharing the cost, When a payment is logged, Then it appears with a running total', async ({
    page,
  }) => {
    // Given the planner with two family members sharing
    await ready(page);

    // When a payment is logged
    await logPayment(page, { date: '2026-03-04', dollars: '1200', category: 'Medication' });

    // Then it is on the ledger, and the total reflects it
    await expect(page.getByTestId('ledger-row')).toHaveCount(1);
    await expect(page.getByTestId('ledger-total')).toHaveText('$1,200.00');
  });

  test('Given several payments across two people, When the reconciliation is read, Then each is measured against their agreed share', async ({
    page,
  }) => {
    // Given three months of care and an equal split
    await ready(page);
    await page.getByLabel('Months of care paid for so far').fill('3');

    // When two people log what they have paid
    await logPayment(page, { who: 'Family member 1', date: '2026-01-04', dollars: '1200' });
    await logPayment(page, { who: 'Family member 2', date: '2026-02-19', dollars: '2400' });

    // Then the reconciliation shows expected, paid, and the difference between them
    const share = cents(
      (await page.locator('tr', { hasText: 'Family member 1' }).last().locator('td').first().textContent()) ?? '0',
    );
    expect(share).toBeGreaterThan(0);

    await expect(page.getByTestId('paid-c1')).toHaveText('$1,200.00');
    await expect(page.getByTestId('paid-c2')).toHaveText('$2,400.00');
    await expect(page.getByTestId('balance-c1')).toContainText('behind');
  });

  test('Given a logged payment, When the reconciliation is read, Then expected equals the share times the months, as displayed', async ({
    page,
  }) => {
    // Given four months elapsed
    await ready(page);
    await page.getByLabel('Months of care paid for so far').fill('4');
    await logPayment(page, { date: '2026-01-04', dollars: '500' });

    // When the row for the first family member is read off the page
    const row = page.locator('tr').filter({ has: page.getByTestId('paid-c1') });
    const cellTexts = await row.locator('td').allTextContents();
    const [shareText, expectedText, paidText] = cellTexts;

    // Then the arithmetic the table asserts actually holds in the rendered strings
    expect(cents(expectedText)).toBe(cents(shareText) * 4);
    expect(cents(paidText)).toBe(50_000);
  });

  test('Given a payment logged in error, When it is removed, Then the totals fall back', async ({
    page,
  }) => {
    // Given two logged payments
    await ready(page);
    await logPayment(page, { date: '2026-01-04', dollars: '1000' });
    await logPayment(page, { date: '2026-02-04', dollars: '250' });
    await expect(page.getByTestId('ledger-total')).toHaveText('$1,250.00');

    // When one is removed
    await page.getByRole('button', { name: /Remove the \$250 payment/ }).click();

    // Then the ledger and its total shrink accordingly
    await expect(page.getByTestId('ledger-row')).toHaveCount(1);
    await expect(page.getByTestId('ledger-total')).toHaveText('$1,000.00');
  });

  test('Given entries ticked as medical expenses, When the total is shown, Then it refuses to call them deductible', async ({
    page,
  }) => {
    // Given a medication payment, which pre-ticks the medical-expense box
    await ready(page);
    await logPayment(page, { date: '2026-01-04', dollars: '800', category: 'Medication' });

    // When the category totals are read
    const callout = page.getByTestId('deductible-candidate');

    // Then the figure is offered as a starting point, not as a tax position
    await expect(callout).toContainText('$800');
    await expect(callout).toContainText('not a determination');
    await expect(callout).toContainText('tax professional');
  });

  test('Given the ledger, When its question mark is pressed, Then the reconciliation derivation opens and balances', async ({
    page,
  }) => {
    // Given payments from two people
    await ready(page);
    await page.getByLabel('Months of care paid for so far').fill('2');
    await logPayment(page, { who: 'Family member 1', date: '2026-01-04', dollars: '1200' });
    await logPayment(page, { who: 'Family member 2', date: '2026-02-19', dollars: '300' });

    // When the ledger derivation is opened
    await page.getByTestId('why-ledger').click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toContainText('balance = what they paid − what was expected');

    // Then the parts add to the total, as rendered
    const amounts = await drawer.locator('table.derivation tbody td.num').allTextContents();
    const parts = amounts.filter((t) => t.trim().startsWith('+')).map(cents);
    const total = amounts.filter((t) => t.trim().startsWith('=')).map(cents)[0];
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    expect(total).toBe(150_000);
  });

  test('Given the ledger is in use, When the page is audited, Then there are no accessibility violations', async ({
    page,
  }) => {
    // Given a ledger with an entry in it
    await ready(page);
    await logPayment(page, { date: '2026-01-04', dollars: '640', note: 'Pharmacy' });

    // When axe audits the page
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Then the new tables, form and remove buttons are all reachable and labelled
    expect(results.violations).toEqual([]);
  });

  test('Given an incomplete entry, When the form is read, Then it cannot be added until who, when and how much are known', async ({
    page,
  }) => {
    // Given only an amount
    await ready(page);
    await page.getByLabel('How much?').fill('400');

    // Then the entry cannot be logged without a date
    await expect(page.getByTestId('add-ledger-entry')).toBeDisabled();

    // When the date is supplied
    await page.getByLabel('When?').fill('2026-04-01');

    // Then it can
    await expect(page.getByTestId('add-ledger-entry')).toBeEnabled();
  });
});
