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
    baseURL: 'http://localhost:3000',
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
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    // Production bundle — used by production-bundle.spec.ts, the only spec that
    // loads the artifact actually deployed. Built directly (npx next build) rather
    // than via `npm run build`, whose clean step would delete playwright-report/
    // and test-results/ out from under the run.
    //
    // --prefix serves the build on 5183 under the exact Pages subpath, so the
    // test exercises the deploy path rather than the root the dev server uses.
    {
      command: 'npx next build && node ../../scripts/serve-dist.mjs --dist .next-prod --port 5183 --prefix /agentic-app-harness/travel-packing-app',
      url: 'http://localhost:5183/__ready',
      env: { NEXT_BUILD_DIR: '.next-prod' },
      reuseExistingServer: false,
      timeout: 240 * 1000,
    },
    // Capacitor-target bundle — used by capacitor-bundle.spec.ts, the E2E-level
    // proof that [guardrail: capacitor-absolute-base] actually holds for this
    // app's built output, not just for the shape of next.config.ts. Served with
    // no --prefix, so it is mounted only at a bare origin root — the same shape
    // https://localhost/ presents inside the Android WebView, never the GitHub
    // Pages subpath. CAPACITOR_BUILD=1 selects the empty basePath (see
    // next.config.ts); NEXT_BUILD_DIR keeps this export out of both .next and
    // .next-prod so the three webServer entries can never race on one directory.
    {
      command: 'npx next build && node ../../scripts/serve-dist.mjs --dist .next-capacitor --port 5185',
      url: 'http://localhost:5185/__ready',
      env: { NEXT_BUILD_DIR: '.next-capacitor', CAPACITOR_BUILD: '1' },
      reuseExistingServer: false,
      timeout: 240 * 1000,
    },
  ],
});
