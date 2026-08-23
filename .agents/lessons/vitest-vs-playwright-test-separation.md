# Vitest vs. Playwright Test Separation

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Vitest vs. Playwright Test Separation**: Always explicitly set `include: ['src/**/*.test.ts']` and `exclude: ['e2e/**']` in `vite.config.ts` so Vitest does not attempt to execute Playwright `e2e` specs.
