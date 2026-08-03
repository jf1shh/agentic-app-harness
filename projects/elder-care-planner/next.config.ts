import type { NextConfig } from "next";
import { pagesBasePath } from "./deploy.config";

const isProd = process.env.NODE_ENV === "production";
const isCapacitor = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  // `next dev` and `next build` both default to .next/. Playwright starts the
  // dev and production webServers concurrently, so sharing a directory races
  // and can yield an incomplete export. The production webServer sets
  // NEXT_BUILD_DIR so the two never collide.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  output: "export",
  // Now ships a Capacitor container too (android/), so the web-only rationale
  // that used to justify a bare absolute Pages base no longer applies: that
  // base would 404 every asset inside the Android WebView, which serves from
  // https://localhost/, not the Pages subpath. Next's `basePath` (unlike
  // Vite's `base`) cannot be a relative value, so this ships as two separate
  // exports instead of one: the Capacitor build forces an empty (root) base
  // via CAPACITOR_BUILD, and the Pages subpath itself lives in
  // deploy.config.ts so it never appears as a literal on this line. See
  // [guardrail: capacitor-absolute-base].
  basePath: isCapacitor ? "" : (isProd ? pagesBasePath : ""),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
