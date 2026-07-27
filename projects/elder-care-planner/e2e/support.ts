import { expect, type Page } from '@playwright/test';

/**
 * Open the planner and wait until it is genuinely ready to be typed into.
 *
 * Two things have to have happened before the first interaction, and neither is
 * a network event, so `waitForLoadState` cannot see either:
 *
 *  1. React has hydrated. A `fill()` before that sets the DOM value, fires an
 *     input event nobody is listening for, and is reverted by the first client
 *     render — silently (.agents/AGENTS.md §6).
 *  2. The saved plan has been restored from localStorage. A `fill()` in the
 *     window before that is overwritten when the restore lands, which looks
 *     identical to the app ignoring the input.
 *
 * The page sets `data-planready` from the effect that finishes the restore, so
 * waiting on it covers both: the effect cannot have run before hydration.
 */
export async function gotoPlanner(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
}

/**
 * Expand one of the collapsible sections (spec §5.1a).
 *
 * Every section after the results card is closed on arrival, so a spec that
 * wants to touch a control inside one has to open it first. Clicking the
 * `summary` would *toggle* rather than open — a section left open by an earlier
 * step in the same test would be closed by it, and the failure would surface
 * three actions later on a control that had been on screen a moment before.
 * Setting `open` is idempotent, which is what a test helper needs to be.
 */
export async function openSection(page: Page, id: string) {
  const details = page.getByTestId(`section-${id}`);
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  // The section body is inert until the browser has applied `open`; asserting
  // it here fails at the helper rather than at whatever the caller did next.
  await expect(details.locator('.section-body')).toBeVisible();
}

/** Open every collapsible section, for audits that must see the whole page. */
export async function openAllSections(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLDetailsElement>('details[data-print-open]')
      .forEach((d) => (d.open = true));
  });
}

/** Parse a rendered "$1,234.56" cell back into integer cents. */
export function cents(text: string): number {
  return Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100);
}
