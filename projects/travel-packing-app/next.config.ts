import type { NextConfig } from "next";
import { pagesBasePath } from "./deploy.config";

const isProd = process.env.NODE_ENV === "production";
const isCapacitor = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  // `next dev` and `next build` both use .next/. Playwright starts the dev and
  // production webServers concurrently, so they raced and the export could be
  // incomplete — smart-recipe-app's RSC payloads 404'd on CI while existing
  // locally. The production webServer sets NEXT_BUILD_DIR so the two never
  // share a directory.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  output: "export",
  // Capacitor serves this bundle from https://localhost/ inside the Android
  // WebView, not the GitHub Pages subpath — a Pages-scoped base would 404
  // every asset there. Next's `basePath` (unlike Vite's `base`) cannot be a
  // relative value, so this ships as two separate exports instead of one: the
  // Capacitor build forces an empty (root) base via CAPACITOR_BUILD, and the
  // Pages subpath itself lives in deploy.config.ts so it never appears as a
  // literal on this line. See [guardrail: capacitor-absolute-base].
  basePath: isCapacitor ? "" : (isProd ? pagesBasePath : ""),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
