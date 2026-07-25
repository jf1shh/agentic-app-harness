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
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5178',
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
      command: 'npx vite --port 5178',
      url: 'http://localhost:5178',
      reuseExistingServer: false,
      timeout: 120000,
    },
    // Production bundle — used by production-bundle.spec.ts, the only thing in
    // this suite that loads the artifact we actually ship. Builds via
    // `vite build` rather than `npm run build` on purpose: the latter runs
    // `npm run clean`, which would delete playwright-report/ and test-results/
    // out from under the run.
    //
    // --prefix also starts a second server on 5180 serving the build under the
    // Pages subpath, so both origins this app ships to are covered.
    {
      command: 'npx vite build && node ../../scripts/serve-dist.mjs --dist dist --port 5179 --prefix /agentic-app-harness/mood-diner',
      url: 'http://localhost:5179/__ready',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
