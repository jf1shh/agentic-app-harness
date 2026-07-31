import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoPlanner, openSection } from './support';

/**
 * BDD Spec §11.13 — "Where to start looking".
 *
 * The assertion that matters is the funding disclosure. The most prominent
 * directories in this field are paid a commission by the communities they
 * recommend, and presenting their checklists as neutral guidance is the §6
 * laundering failure applied to advice instead of to a figure. So the test
 * checks the label and the conflict note are on screen NEXT TO the resource,
 * not merely present somewhere in the data.
 */

test.describe('BDD Spec: The starting guide says who to call and who is paying them', () => {
  test('Given the section is opened, When its groups are read, Then every stage of the search is present', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    for (const group of ['in_home', 'touring', 'legal_financial', 'moving', 'other']) {
      await expect(page.getByTestId(`guide-group-${group}`)).toBeVisible();
    }
  });

  test('Given a referral service paid by the communities it recommends, When it is displayed, Then its label and the conflict note are both on screen', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    await expect(page.getByTestId('guide-funding-a_place_for_mom')).toHaveText(
      'Paid referral service',
    );
    await expect(page.getByTestId('guide-funding-note-a_place_for_mom')).toContainText(
      /paid a commission/i,
    );
  });

  test('Given a government resource, When it is displayed, Then it is labelled as such and carries no conflict note', async ({
    page,
  }) => {
    // The contrast is the point: if everything were labelled the same way the
    // label would carry no information.
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    await expect(page.getByTestId('guide-funding-medicare_care_compare')).toHaveText('Government');
    await expect(page.getByTestId('guide-funding-note-medicare_care_compare')).toHaveCount(0);
  });

  test('Given the touring guidance, When it is read, Then it tells the reader to visit in person and speak to care staff', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    await expect(page.getByTestId('touring-visit_in_person')).toContainText(/in person/i);
    await expect(page.getByTestId('touring-talk_to_staff')).toContainText(/sales/i);
  });

  test('Given the app declines to name a best option, When the whole section is read, Then nothing is called best or recommended', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    const text = (await page.getByTestId('section-starting-guide').textContent()) ?? '';
    expect(text).not.toMatch(/\bbest\b|\btop-rated\b|\bwe recommend\b/i);
  });

  test('Given every outbound request is blocked, When the section is opened, Then it still renders in full', async ({
    page,
  }) => {
    // §1.2: the links are anchors a reader may follow, not fetches the app
    // makes. Nothing here should need the network.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
        return route.continue();
      }
      return route.abort();
    });

    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    await expect(page.getByTestId('guide-group-touring')).toBeVisible();
    await expect(page.getByTestId('guide-resource-medicare_care_compare')).toBeVisible();
  });

  test('Given the section is on screen, When it is audited, Then axe-core reports no violations', async ({
    page,
  }) => {
    await gotoPlanner(page);
    await openSection(page, 'starting-guide');

    const results = await new AxeBuilder({ page })
      .include('[data-testid="section-starting-guide"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
