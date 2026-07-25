import { defineConfig, devices } from '@playwright/test';

// Optional Chromium override, set by scripts/test-app.mjs when Playwright's
// pinned browser build cannot be downloaded (offline / network-restricted
// containers). Unset in normal CI, where Playwright manages its own browsers,
// so this changes nothing there.
const chromiumOverride = process.env.HARNESS_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.HARNESS_CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumOverride },
    },
  ],
  webServer: [
    // Dev server — used by the feature/a11y specs.
    {
      command: 'npm run dev -- -p 3005',
      url: 'http://localhost:3005',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Production bundle — used by production-bundle.spec.ts, the only spec that
    // loads the artifact actually deployed. Built directly (npx next build) rather
    // than via `npm run build`, whose clean step would delete playwright-report/
    // and test-results/ out from under the run.
    //
    // --prefix serves the build on 5186 under the exact Pages subpath, so the
    // test exercises the deploy path rather than the root the dev server uses.
    {
      command: 'npx next build && node ../../scripts/serve-dist.mjs --dist .next-prod --port 5185 --prefix /agentic-app-harness/smart-recipe-app',
      url: 'http://localhost:5185/__ready',
      env: { NEXT_BUILD_DIR: '.next-prod' },
      reuseExistingServer: false,
      timeout: 240 * 1000,
    },
  ],
});
