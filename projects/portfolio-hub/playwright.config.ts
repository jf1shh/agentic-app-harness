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
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3009',
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
      command: 'npm run dev',
      url: 'http://localhost:3009',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Production bundle — used by production-bundle.spec.ts, the only spec that
    // loads the artifact actually deployed. Built directly (npx vite build) rather
    // than via `npm run build`, whose clean step would delete playwright-report/
    // and test-results/ out from under the run.
    //
    // --prefix serves the build on 5182 under the exact Pages subpath, so the
    // test exercises the deploy path rather than the root the dev server uses.
    {
      command: 'npx vite build && node ../../scripts/serve-dist.mjs --dist dist --port 5181 --prefix /agentic-app-harness',
      url: 'http://localhost:5181/__ready',
      reuseExistingServer: false,
      timeout: 120 * 1000,
    },
  ],
});
