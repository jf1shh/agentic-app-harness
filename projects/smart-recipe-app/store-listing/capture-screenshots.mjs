// Recaptures the 5 Play Console screenshots into store-listing/screenshots/.
//
// Captures the Capacitor build (the exact bundle the Android app ships) at a phone
// viewport (360×640 CSS px at 3× = 1080×1920), so the shots show the real mobile
// layout and no `next dev` overlay. 5-search.png calls TheMealDB live, so it needs
// real internet access; the other four use only the app's default seed data.
//
// Usage (from projects/smart-recipe-app/):
//   npm run build:capacitor
//   node ../../scripts/serve-dist.mjs --dist .next-capacitor --port 5190 &
//   node store-listing/capture-screenshots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.SMART_RECIPE_URL ?? 'http://localhost:5190';
const OUT_DIR = fileURLToPath(new URL('./screenshots/', import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

async function shoot(path, name) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // let hydration read the seed data from localStorage
  await page.screenshot({ path: `${OUT_DIR}${name}` });
}

// 1-4: default seed data (stocked pantry, two saved recipes, tonight's dinner planned)
await shoot('/', '1-dashboard.png');
await shoot('/inventory', '2-inventory.png');
await shoot('/recipes', '3-recipes.png');
await shoot('/planner', '4-planner.png');

// 5: a live TheMealDB search, results with their real thumbnails
await page.goto(`${BASE_URL}/recipes/search`);
await page.waitForLoadState('networkidle');
await page.getByLabel('Search recipes').fill('pasta');
await page.getByRole('button', { name: /search/i }).click();
await page.getByRole('button', { name: 'Save Recipe' }).first().waitFor();
await page.waitForLoadState('networkidle'); // thumbnails
await page.screenshot({ path: `${OUT_DIR}5-search.png` });

await browser.close();
