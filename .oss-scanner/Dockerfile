# OSS Scanner build for agentic-app-harness (https://github.com/anthropics/oss-scanner).
# Built with the repository as the build context. Network is available only during this build, so every
# npm dependency is installed here. The apps are client-side web apps; the image installs the workspace,
# type-checks and builds each app, and runs the unit tests (Vitest) plus the harness script self-tests.
# Playwright E2E is not run here (it needs browser downloads and a dev server).
FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git python3 \
    && rm -rf /var/lib/apt/lists/*

# scanner contract: the checkout lives inside the image, at /src
COPY . /src
WORKDIR /src

# One npm workspace (root package.json, projects/*) with a single lockfile. --ignore-scripts skips the
# root "prepare" hook, which only installs local git hooks.
RUN npm ci --ignore-scripts --no-audit --no-fund

# Build each app as CI does; a failing app does not abort the image.
RUN for app in projects/*/; do \
      echo "=== build $app"; \
      (cd "$app" && npm run build) || echo "WARNING: build failed for $app"; \
    done

# Cheap tests, so the image is known to work; failures do not abort the build.
RUN node --test scripts/*.test.mjs || echo "WARNING: harness script self-tests reported failures"
RUN for app in projects/*/; do \
      echo "=== vitest $app"; \
      (cd "$app" && npx vitest run) || echo "WARNING: vitest reported failures in $app"; \
    done
