import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // `next dev` and `next build` both default to .next/. Playwright starts the
  // dev and production webServers concurrently, so sharing a directory races
  // and can yield an incomplete export. The production webServer sets
  // NEXT_BUILD_DIR so the two never collide.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  output: "export",
  // Web-only app (no Capacitor container), so an absolute Pages subpath is the
  // correct base here — see the `capacitor-absolute-base` guardrail, which is
  // scoped to apps that ship a native container.
  basePath: isProd ? "/agentic-app-harness/elder-care-planner" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
