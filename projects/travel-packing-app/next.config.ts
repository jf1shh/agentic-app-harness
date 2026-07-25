import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // `next dev` and `next build` both use .next/. Playwright starts the dev and
  // production webServers concurrently, so they raced and the export could be
  // incomplete — smart-recipe-app's RSC payloads 404'd on CI while existing
  // locally. The production webServer sets NEXT_BUILD_DIR so the two never
  // share a directory.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  output: "export",
  basePath: isProd ? "/agentic-app-harness/travel-packing-app" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
