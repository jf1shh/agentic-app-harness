import { defineConfig, devices } from '@playwright/test';

// Optional Chromium override, set by scripts/test-app.mjs when Playwright's
// pinned browser build cannot be downloaded (offline / network-restricted
// containers). Unset in normal CI, where Playwright manages its own browsers.
const chromiumOverride = process.env.HARNESS_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.HARNESS_CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3011',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumOverride },
    },
  ],
  webServer: [
    // Dev server — feature, a11y and offline specs. An explicit port avoids the
    // silent monorepo port collision described in .agents/AGENTS.md §6.
    {
      command: 'npm run dev -- -p 3011',
      url: 'http://localhost:3011',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Production bundle — the only spec that loads the artifact actually
    // deployed. Built with `npx next build` rather than `npm run build`, whose
    // clean step would delete playwright-report/ and test-results/ mid-run.
    // --prefix serves it on 5190 under the exact Pages subpath.
    {
      command: 'npx next build && node ../../scripts/serve-dist.mjs --dist .next-prod --port 5189 --prefix /agentic-app-harness/elder-care-planner',
      url: 'http://localhost:5189/__ready',
      env: { NEXT_BUILD_DIR: '.next-prod' },
      reuseExistingServer: false,
      timeout: 240 * 1000,
    },
  ],
});
