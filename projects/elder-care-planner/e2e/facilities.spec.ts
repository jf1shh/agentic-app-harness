import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection, readStoredPlannerState } from './support';

/**
 * The facility shortlist (spec §11.2).
 *
 * What these specs are guarding is not the arithmetic — `fit.test.ts` covers
 * that — but the three claims the panel makes on screen that would be easy to
 * break without any test noticing:
 *
 *  1. That a dimension nobody assessed is excluded *and named as excluded*,
 *     rather than quietly averaged as a zero.
 *  2. That adopting a community's quoted rate actually re-prices the plan —
 *     the join that makes this more than a notes app.
 *  3. That a photo cannot take the plan payload down with it, which is only
 *     provable by attaching one and then reloading (spec §11.2.4).
 */

/** The dimension labels the panel renders, which are what `getByLabel` needs. */
const DIMENSION_LABELS = {
  community: 'Community',
  food: 'Food',
  activities: 'Activities',
  apartment: 'Apartment',
  staff: 'Staff',
  location: 'Location',
  upkeep: 'Upkeep',
  gut: 'Overall feeling',
} as const;

type Dimension = keyof typeof DIMENSION_LABELS;

interface Tour {
  label: string;
  monthlyDollars?: string;
  scores: Partial<Record<Dimension, string>>;
}

/** A 1×1 PNG — enough for the browser to decode, downscale and store. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function addTour(page: Page, index: number, tour: Tour) {
  // The shortlist is collapsed on arrival (spec §5.1a). Idempotent, so calling
  // it once per tour costs nothing and keeps every caller from having to know.
  await openSection(page, 'facilities');
  await page.getByTestId('add-facility').click();
  const card = page.getByTestId(`facility-f${index + 1}`);
  await expect(card).toBeVisible();

  const name = card.getByLabel('What is this place called?');
  await name.fill(tour.label);
  // Assert the value stuck rather than trusting a fill that may have landed
  // before hydration — a swallowed fill fails here rather than three actions
  // later (.agents/AGENTS.md §6).
  await expect(name).toHaveValue(tour.label);

  if (tour.monthlyDollars !== undefined) {
    const monthly = card.getByLabel('Monthly rate');
    await monthly.fill(tour.monthlyDollars);
    await expect(monthly).toHaveValue(tour.monthlyDollars);
  }

  for (const [dimension, score] of Object.entries(tour.scores)) {
    // Located by role rather than by label: each dimension has both a score
    // select and a free-text note, and "Food at Oakmont" is a substring of
    // "Note about food at Oakmont", so `getByLabel` alone matches both.
    const select = card.getByRole('combobox', {
      name: `${DIMENSION_LABELS[dimension as Dimension]} at ${tour.label}`,
    });
    await select.selectOption(score);
    await expect(select).toHaveValue(score);
  }
}

test.describe('Given a family that has toured several communities', () => {
  test('When each visit is written up, Then every community keeps its own scores and notes', async ({
    page,
  }) => {
    // Given two tours a week apart
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '5', staff: '2' } });
    await addTour(page, 1, { label: 'Brookside', scores: { food: '3', staff: '5' } });

    // Then the comparison holds both, in the order they were entered
    const table = page.getByTestId('facility-comparison');
    await expect(table).toBeVisible();
    const headers = await table.locator('thead th').allInnerTexts();
    expect(headers).toEqual(['Dimension', 'Weight', 'Oakmont', 'Brookside']);

    // And nothing on the page names one of them as the best — ranking eight
    // subjective scores would claim an authority this arithmetic has not got
    await expect(page.getByText(/best (choice|community|option)/i)).toHaveCount(0);
  });

  test('When a dimension was never assessed, Then it is left out of the score and said to be left out', async ({
    page,
  }) => {
    // Given a tour where only food and staff were assessed
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4', staff: '4' } });

    // When the weighted score is read
    // Both scored 4 at the default weight of 1, so the mean is 4.0 — and it is
    // 4.0 precisely because the six unassessed dimensions are excluded rather
    // than counted as zero, which would give 8 ÷ 8 = 1.0.
    await expect(page.getByTestId('composite-f1')).toHaveText('4.0 out of 5');

    // Then the exclusions are named on screen rather than left to be inferred
    const excluded = page.getByTestId('excluded-f1');
    await expect(excluded).toContainText('activities');
    await expect(excluded).toContainText('upkeep');
  });

  test('When a dimension is weighted as not mattering, Then its score stops counting and the panel says which', async ({
    page,
  }) => {
    // Given a community that scored well on location and poorly on staff
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { location: '5', staff: '1' } });
    await expect(page.getByTestId('composite-f1')).toHaveText('3.0 out of 5');

    // When the family says the drive does not matter
    const weight = page.getByLabel('How much does location matter?');
    await weight.selectOption('0');
    await expect(weight).toHaveValue('0');

    // Then only the staff score is left, and the change is explained rather
    // than the number simply moving
    await expect(page.getByTestId('composite-f1')).toHaveText('1.0 out of 5');
    await expect(page.getByTestId('unweighted-f1')).toContainText('location');
  });

  test('When one dimension is made decisive, Then the weighted scores move accordingly', async ({
    page,
  }) => {
    // Given two communities that are mirror images of each other
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '5', staff: '1' } });
    await addTour(page, 1, { label: 'Brookside', scores: { food: '1', staff: '5' } });
    await expect(page.getByTestId('composite-f1')).toHaveText('3.0 out of 5');
    await expect(page.getByTestId('composite-f2')).toHaveText('3.0 out of 5');

    // When staff is made the decision
    await page.getByLabel('How much does staff matter?').selectOption('3');

    // Then the one with better staff scores higher: Oakmont (5×1 + 1×3) ÷ 4 = 2.0,
    // Brookside (1×1 + 5×3) ÷ 4 = 4.0
    await expect(page.getByTestId('composite-f1')).toHaveText('2.0 out of 5');
    await expect(page.getByTestId('composite-f2')).toHaveText('4.0 out of 5');

    // And the table agrees with the cards — it is the same engine figure
    await expect(page.getByTestId('table-composite-f1')).toHaveText('2.0 out of 5');
    await expect(page.getByTestId('table-composite-f2')).toHaveText('4.0 out of 5');
  });
});

test.describe('Given a community whose price the family brought back from the tour', () => {
  test('When the plan is priced at that community, Then the all-in figure and the projection both change', async ({
    page,
  }) => {
    // Given a quoted rate well above the state median the plan starts from
    await gotoPlanner(page);
    await addTour(page, 0, {
      label: 'Oakmont',
      monthlyDollars: '9500',
      scores: { food: '4' },
    });

    // And the consequence is stated before anything is committed to
    const consequence = page.getByTestId('consequence-f1');
    await expect(consequence).toContainText('a month above');

    // When the plan is priced at this community
    await page.getByTestId('adopt-f1').click();

    // Then the headline figures follow the quote rather than the median
    await expect(page.getByTestId('all-in')).toContainText('$9,500');

    // And the quote now drives the rest of the page: the refinement field holds
    // it, so every downstream engine is working from it
    await expect(page.getByLabel('Quoted monthly price, if there is one')).toHaveValue('9500');
  });

  test('When no price was recorded, Then the panel says so rather than pricing the plan at zero', async ({
    page,
  }) => {
    // Given a tour where nobody got a rate sheet
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4' } });

    // Then the panel asks for the figure instead of inventing one
    await expect(page.getByTestId('consequence-f1')).toContainText(
      'No monthly price has been recorded',
    );
  });
});

test.describe('Given the weighted score is on screen', () => {
  test('When its derivation is opened, Then the products sum to the stated total and that total over the weight is the score', async ({
    page,
  }) => {
    // Given a scored community
    await gotoPlanner(page);
    await addTour(page, 0, {
      label: 'Oakmont',
      scores: { food: '5', staff: '2', gut: '3' },
    });
    await page.getByLabel('How much does food matter?').selectOption('2');
    await page.getByLabel('How much does staff matter?').selectOption('3');

    // When the "?" beside the score is activated
    await page.getByTestId('why-facility-fit').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // When the figures are read off the rendered panel — the check a sceptical
    // reader performs, on the page rather than in the engine
    const rowValue = (label: string) =>
      drawer.locator(`tr:has(th:text-is("${label}")) td.num`).innerText();
    const points = Number((await rowValue('Points in total')).replace(' points', ''));
    const weight = Number(await rowValue('Weight in total'));
    const shown = Number((await rowValue('Weighted score')).replace(/ out of \d+$/, ''));

    // Then the parts add to the stated total: food 5×2 = 10, staff 2×3 = 6,
    // overall feeling 3×1 = 3 → 19 points over 2+3+1 = 6 weight
    const partTexts = await drawer.locator('td.num').allInnerTexts();
    const parts = partTexts
      .filter((t) => t.endsWith('points'))
      .map((t) => Number(t.replace(' points', '')));
    // The last "points" row is the total itself.
    const summed = parts.slice(0, -1).reduce((a, b) => a + b, 0);

    expect(summed).toBe(points);
    expect(points).toBe(19);
    expect(weight).toBe(6);
    expect(points / weight).toBeCloseTo(shown, 1);

    // And the panel closes on Escape, returning focus to the control that
    // opened it
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  test('When the copy is read, Then it never addresses the reader in the second person', async ({
    page,
  }) => {
    // Given the shortlist, which may well be read by the sibling who did not
    // go on the tour (spec §5.4)
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4' } });

    const copy = await page
      .getByRole('region', { name: 'The places actually visited' })
      .innerText();

    expect(copy).not.toMatch(/\byou(r|rs)?\b/i);
  });
});

test.describe('Given photographs taken on a tour', () => {
  test('When one is attached, Then it survives a reload without the plan payload growing by its size', async ({
    page,
  }) => {
    // Given a community with a photo and a ledger's worth of typing behind it
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4' } });

    // Writes are debounced (spec §4.1), so the baseline has to be taken after
    // the tour has actually landed in storage rather than after it was typed.
    // waitForEncryptedSave alone is not enough — it returns on *any* encrypted
    // save, and under load that can be the page-load save, before the tour has
    // landed, which would make `before` miss the tour and the delta below
    // include it. Wait for the save that provably carries the tour instead.
    const stored = () =>
      page.evaluate(() => localStorage.getItem('elder-care-planner:state:v1') ?? '');
    await expect
      .poll(async () => {
        try {
          const state = await readStoredPlannerState(page);
          return Array.isArray(state.facilities) ? state.facilities.length : 0;
        } catch {
          return 0; // no envelope written yet — keep polling
        }
      })
      .toBe(1);
    const beforeRaw = await stored();
    const before = beforeRaw.length;

    await page
      .getByTestId('photos-f1')
      .locator('input[type="file"]')
      .setInputFiles({ name: 'dining-room.png', mimeType: 'image/png', buffer: TINY_PNG });

    const photo = page.getByTestId('photos-f1').locator('img');
    await expect(photo).toHaveCount(1);
    // The envelope's random IV changes on every save regardless of content,
    // so waiting for it to differ from the pre-attach snapshot (rather than
    // for any particular substring) proves the save carrying the new photo
    // id has actually landed.
    await page.waitForFunction(
      (prev) => window.localStorage.getItem('elder-care-planner:state:v1') !== prev,
      beforeRaw,
    );

    // Then the stored plan grew by an id, not by an image. A base64 photo in
    // localStorage is what takes the whole plan down with a quota error, so
    // this margin is the assertion, not a nicety (spec §11.2.4).
    const after = (await stored()).length;
    expect(after - before).toBeLessThan(200);

    // And the photo is still there on the next visit, because the bytes are in
    // IndexedDB rather than in the plan
    await page.reload();
    await page.waitForFunction(() => document.documentElement.dataset.planready === 'true');
    await expect(page.getByTestId('photos-f1').locator('img')).toHaveCount(1);
  });

  test('When everything on the device is erased, Then the photographs go with it', async ({
    page,
  }) => {
    // Given a plan with a photo attached
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4' } });
    await page
      .getByTestId('photos-f1')
      .locator('input[type="file"]')
      .setInputFiles({ name: 'dining-room.png', mimeType: 'image/png', buffer: TINY_PNG });
    await expect(page.getByTestId('photos-f1').locator('img')).toHaveCount(1);

    // When the family erases everything before handing back a shared computer
    await page.getByTestId('erase').click();
    await page.getByTestId('confirm-erase').click();

    // Then the images are gone from the store too, not merely unreferenced —
    // "forget everything on this device" has to mean everything
    const remaining = () =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
          const request = indexedDB.open('elder-care-planner:photos', 1);
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('photos')) {
              resolve(0);
              return;
            }
            const count = db.transaction('photos', 'readonly').objectStore('photos').count();
            count.onsuccess = () => resolve(count.result);
            count.onerror = () => resolve(-1);
          };
          request.onerror = () => resolve(-1);
        }),
      );
    // The clear is asynchronous, so this polls rather than racing it.
    await expect.poll(remaining).toBe(0);
  });
});

test.describe('Given the shortlist is on screen', () => {
  test('When it is audited, Then there are no accessibility violations', async ({ page }) => {
    // Given a populated shortlist, with the comparison table drawn
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '5', staff: '2' } });
    await addTour(page, 1, { label: 'Brookside', scores: { food: '3', staff: '5' } });

    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="facilities-heading"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('When a score is read without colour, Then the number itself is present', async ({
    page,
  }) => {
    // Given a scored community — colour and bar length must never be the only
    // encoding of a value (spec §5.5)
    await gotoPlanner(page);
    await addTour(page, 0, { label: 'Oakmont', scores: { food: '4' } });
    await addTour(page, 1, { label: 'Brookside', scores: { food: '2' } });

    const foodRow = page
      .getByTestId('facility-comparison')
      .locator('tr', { has: page.locator('th:text-is("Food")') });

    await expect(foodRow.locator('.score-text').first()).toHaveText(/4/);
    await expect(foodRow.locator('.score-text').nth(1)).toHaveText(/2/);
  });
});
