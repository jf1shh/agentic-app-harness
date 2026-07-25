import { defineConfig, devices } from '@playwright/test';

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
      use: { ...devices['Desktop Chrome'] },
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
    // Production bundle — used by production-bundle.spec.ts, which is the only
    // thing in this suite that loads the artifact we actually ship. Builds via
    // `vite build` rather than `npm run build` on purpose: the latter runs
    // `npm run clean`, which would delete playwright-report/ and test-results/
    // out from under the run.
    {
      command: 'npx vite build && node e2e/serve-dist.mjs 5179',
      url: 'http://localhost:5179/__ready',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
