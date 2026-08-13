// Recaptures the 5 Play Console screenshots into store-listing/screenshots/.
//
// Must be run somewhere with real internet access to images.unsplash.com — the two
// restaurant-photo screenshots (1-home.png, 2-weather-engine.png) will show blank
// card backgrounds otherwise. See store-listing/README.md's "Screenshots" section.
//
// Usage (from projects/mood-diner/):
//   npm run dev &            # or: npx vite --port 5178
//   node store-listing/capture-screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE_URL = process.env.MOODDINER_URL ?? 'http://localhost:5178';
const OUT_DIR = new URL('./screenshots/', import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const viewport = { width: 1080, height: 1920 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });

// 1. Home — filters + restaurant grid with real Unsplash photos loaded
await page.goto(BASE_URL);
await page.locator('.restaurant-grid .glass-panel').first().waitFor();
await page.waitForTimeout(1500); // let restaurant images finish loading
await page.screenshot({ path: new URL('1-home.png', OUT_DIR) });

// 2. Weather engine — Freezing Winter preset applied
await page.click('#weather-toggle-btn');
await page.locator('h3:has-text("AI Weather Recommendation Engine")').waitFor();
await page.click('#weather-preset-winter');
await page.waitForTimeout(500);
await page.screenshot({ path: new URL('2-weather-engine.png', OUT_DIR) });
await page.keyboard.press('Escape');

// 3. Live-extracted menu for a restaurant
await page.locator('[id^="btn-menu-"]').first().click();
await page.locator('#tab-menu[aria-selected="true"]').waitFor();
await page.screenshot({ path: new URL('3-menu.png', OUT_DIR) });

// 4. Booking flow — review step
await page.click('#tab-book');
await page.locator('#booking-step-datetime').waitFor();
await page.click('#booking-next-btn');
await page.locator('#booking-step-party').waitFor();
await page.click('#booking-next-btn');
await page.locator('#booking-step-seating').waitFor();
await page.click('#booking-next-btn');
await page.locator('#booking-step-review').waitFor();
await page.screenshot({ path: new URL('4-booking.png', OUT_DIR) });

// 5. Reservation confirmed
await page.click('#submit-reservation-btn');
await page.locator('h3:has-text("Reservation Confirmed!")').waitFor();
await page.screenshot({ path: new URL('5-confirmed.png', OUT_DIR) });

await browser.close();
console.log(`Wrote 5 screenshots to ${OUT_DIR.pathname}`);
