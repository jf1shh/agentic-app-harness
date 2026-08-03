import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative, not the Pages subpath: this bundle ships to two origins. GitHub
  // Pages serves it from /agentic-app-harness/legal-financial-rag/, while
  // Capacitor serves it from https://localhost/ inside the Android WebView. A
  // hardcoded '/agentic-app-harness/legal-financial-rag/' base 404s every
  // asset in the WebView and boots to a blank screen. './' resolves correctly
  // under both. Safe here because the app has no client-side router — it is
  // only ever served at a directory root. See [guardrail: capacitor-absolute-base].
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
