import type { Page } from '@playwright/test';

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

/** Parse a rendered "$1,234.56" cell back into integer cents. */
export function cents(text: string): number {
  return Math.round(Number(text.replace(/[^0-9.]/g, '')) * 100);
}
