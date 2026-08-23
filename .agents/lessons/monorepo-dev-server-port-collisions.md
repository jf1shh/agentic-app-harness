# Monorepo Dev Server Port Collisions

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Monorepo Dev Server Port Collisions**: When running Next.js or other dev servers in a monorepo testing harness, explicitly define a unique port (e.g., `npm run dev -- -p 3005`) in `playwright.config.ts` to prevent silent port collisions with other background projects that could cause E2E tests to execute against the wrong application.
