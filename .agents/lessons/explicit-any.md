# Strict TypeScript in Harness

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Strict TypeScript in Harness** `[guardrail: explicit-any]`: When executing the `test-app.ps1` harness, always define explicit interfaces for data models rather than using `any`, as the harness strictly enforces ESLint `@typescript-eslint/no-typescript-eslint/no-explicit-any` rules.
