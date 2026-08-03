import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.harness.travelpacking',
  appName: 'travel-packing-app',
  // Built by `npm run build:capacitor` (NEXT_BUILD_DIR=.next-capacitor,
  // CAPACITOR_BUILD=1) — a separate export from the GitHub Pages build, with
  // an empty basePath instead of the Pages subpath. See next.config.ts.
  webDir: '.next-capacitor',
};

export default config;
