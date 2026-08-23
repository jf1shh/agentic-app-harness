# Harness CI Dependency Guarding

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Harness CI Dependency Guarding**: In monorepo CI scripts where a top-level `npm install` runs before subproject test scripts, subproject `test-app.ps1` scripts must check for specific test runner binaries (e.g., `if (-Not (Test-Path "node_modules/@playwright/test"))`) rather than generic `if (-Not (Test-Path "node_modules"))` to ensure devDependencies are installed even if `node_modules` already exists.
