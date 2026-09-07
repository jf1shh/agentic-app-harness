import { test, expect } from '@playwright/test';
import { gotoPlanner } from './support';

test('Given an unreadable saved plan, When defaults render and the page closes, Then preserve the recovery copy', async ({ page }) => {
  const damaged = 'encv1.recovery-copy.unreadable';
  await page.addInitScript((value) => localStorage.setItem('elder-care-planner:state:v1', value), damaged);
  await gotoPlanner(page);
  await expect(page.getByTestId('restore-failed')).toBeVisible();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await page.evaluate(() => localStorage.getItem('elder-care-planner:state:v1'))).toBe(damaged);
});
