import { test, expect } from '@playwright/test';
import { gotoPlanner, openSection } from './support';

/**
 * Printing a page whose sections are collapsed (spec §5.1a).
 *
 * Collapsing everything after the results is a screen decision, and it must not
 * reach the paper: the Family Meeting Summary, the split table and the facility
 * shortlist are all printable content that now lives inside a closed
 * `<details>`, which prints closed. A family that pressed print without
 * expanding anything would take a page of headings to the meeting, and nothing
 * on screen would warn them.
 *
 * The unit tests in `printExpansion.test.ts` cover which sections are restored;
 * these cover the wiring — that the app's own print button and the browser's
 * `beforeprint` both reach that code, and that the print stylesheet then shows
 * the content.
 */
test.describe('BDD Spec: The printed page does not depend on what was left open', () => {
  test('Given every section collapsed, When the print button is pressed, Then the printable sections are opened for the print', async ({
    page,
  }) => {
    // Given the planner as it arrives, with nothing expanded
    await gotoPlanner(page);
    await expect(page.getByTestId('section-summary').locator('.section-body')).toBeHidden();

    // `window.print()` blocks on a native dialog that Playwright cannot dismiss,
    // so it is replaced with a recorder. What is under test is the state of the
    // page at the instant printing begins — which is exactly what the stub
    // captures, and what a real print would rasterise.
    await page.evaluate(() => {
      const flags: Record<string, boolean> = {};
      (window as unknown as { __printState: Record<string, boolean> }).__printState = flags;
      window.print = () => {
        document.querySelectorAll<HTMLDetailsElement>('details[data-print-open]').forEach((d) => {
          const id = d.getAttribute('data-testid') ?? '';
          flags[id] = d.open;
        });
      };
    });

    // When the family presses the app's own print button
    await page.getByRole('button', { name: 'Print this summary' }).click();

    // Then every printable section was open at the moment the print began
    const state = await page.evaluate(
      () => (window as unknown as { __printState: Record<string, boolean> }).__printState,
    );
    expect(Object.keys(state).length).toBeGreaterThan(5);
    expect(Object.entries(state).filter(([, open]) => !open)).toEqual([]);
  });

  test('Given the print has finished, When the page is read again, Then the sections the reader had closed are closed again', async ({
    page,
  }) => {
    // Given one section deliberately opened by the reader and the rest closed
    await gotoPlanner(page);
    await openSection(page, 'facilities');
    await page.evaluate(() => {
      window.print = () => {};
    });

    // When a print runs to completion
    await page.getByRole('button', { name: 'Print this summary' }).click();

    // Then the page is exactly as it was — the one the reader opened is still
    // open, and printing has not silently expanded the rest of the page
    await expect(page.getByTestId('section-facilities').locator('.section-body')).toBeVisible();
    await expect(page.getByTestId('section-summary').locator('.section-body')).toBeHidden();
    await expect(page.getByTestId('section-ledger').locator('.section-body')).toBeHidden();
  });

  test('Given a print started from the browser rather than the app, When beforeprint fires, Then the sections open just the same', async ({
    page,
  }) => {
    // Ctrl+P and the browser menu never touch the app's button, so the same
    // guarantee has to hold on the event the browser fires. Playwright cannot
    // open the native print dialog, so the event itself is dispatched — the
    // listener under test is the app's.
    await gotoPlanner(page);
    await expect(page.getByTestId('section-summary').locator('.section-body')).toBeHidden();

    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));

    await expect(page.getByTestId('section-summary').locator('.section-body')).toBeVisible();

    // And afterprint puts it back
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.getByTestId('section-summary').locator('.section-body')).toBeHidden();
  });

  test('Given the print stylesheet, When the page is emulated as print, Then the summary is on the page and the screen chrome is not', async ({
    page,
  }) => {
    // Given the page opened for printing
    await gotoPlanner(page);
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });

    // Then the content that belongs on paper is there
    const summary = page.getByRole('region', { name: 'Summary for a family conversation' });
    await expect(summary).toContainText('Assumptions behind these figures');
    await expect(summary).toContainText('not financial, legal, tax or medical advice');
    await expect(page.getByTestId('section-split').locator('.section-body')).toBeVisible();
    await expect(page.getByTestId('section-facilities').locator('.section-body')).toBeVisible();

    // And the screen-only chrome is not — the jump bar, the refinement inputs
    // and the print button itself have no business on a printed page
    await expect(page.locator('.section-nav')).toBeHidden();
    await expect(page.getByTestId('section-refine')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Print this summary' })).toBeHidden();
  });
});
