import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Explicit include/exclude so Vitest never falls back to its default glob
    // and tries to execute the Playwright e2e specs — see the "Vitest vs.
    // Playwright Test Separation" lesson in .agents/AGENTS.md §6. The exclude
    // alone was doing that job here; the include is what the lesson asks for,
    // and it is what stops a future e2e/ rename from silently re-opening it.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
