import { defineConfig, devices } from '@playwright/test';

// Optional Chromium override, set by scripts/test-app.mjs when Playwright's
// pinned browser build cannot be downloaded (offline / network-restricted
// containers). Unset in normal CI, where Playwright manages its own browsers.
const chromiumOverride = process.env.HARNESS_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.HARNESS_CHROMIUM_PATH } }
  : {};

// PLAYWRIGHT_SKIP_PROD=1 (or true/yes) opts out of the production-bundle
// webServer below, registering only the dev server. Use in tight-budget
// sandbox runs where `next build` cannot complete in time. Default is OFF —
// CI keeps full dual-origin coverage so `senseProductionBundleTest`
// (scripts/harness-status.mjs) and the AGENTS.md §96 "test the artifact you
// ship, at every origin it ships to" rule stay green. Operators opting in
// should also pass `npx playwright test --grep-invert "production bundle"`
// (or the equivalent for their spec title) so e2e/production-bundle.spec.ts
// does not fail against a missing :5189 webServer.
const truthy = new Set(['1', 'true', 'yes']);
const skipProd = truthy.has(
  String(process.env.PLAYWRIGHT_SKIP_PROD ?? '').toLowerCase(),
);
if (skipProd) {
  // Surface this on webServer startup so a human (or the next operator
  // reading CI logs) sees that the bypass was intentional, not accidental.
  console.warn(
    '[harness] PLAYWRIGHT_SKIP_PROD is set; the production-bundle webServer '
    + 'on port 5189 is NOT registered. e2e/production-bundle.spec.ts will fail '
    + 'unless you add `--grep-invert "production bundle"` to its invocation.',
  );
}

// Dev server — feature, a11y and offline specs. An explicit port avoids the
// silent monorepo port collision described in .agents/AGENTS.md §6.
const devServer = {
  command: 'npm run dev -- -p 3011',
  url: 'http://localhost:3011',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
};

// Production bundle — the only spec that loads the artifact actually
// deployed. Built with `npx next build` rather than `npm run build`, whose
// clean step would delete playwright-report/ and test-results/ mid-run.
// --prefix serves it on 5190 under the exact Pages subpath. The command
// literal is left unbroken (inside this dev-only block AND the default
// dual-origin block) so `senseProductionBundleTest` can grep the static
// source for `next build` / `serve-dist` and keep the guardrail happy.
const productionBundle = {
  command:
    'npx next build && node ../../scripts/serve-dist.mjs --dist .next-prod --port 5189 --prefix /agentic-app-harness/elder-care-planner',
  url: 'http://localhost:5189/__ready',
  env: { NEXT_BUILD_DIR: '.next-prod' },
  reuseExistingServer: false,
  timeout: 240 * 1000,
};

const webServers = skipProd ? [devServer] : [devServer, productionBundle];

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
  webServer: webServers,
});
