import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Explicit include/exclude so Vitest never tries to execute the Playwright
    // e2e specs — see the "Vitest vs. Playwright Test Separation" lesson in
    // .agents/AGENTS.md §6.
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
