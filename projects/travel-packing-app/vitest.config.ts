import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
  },
});
