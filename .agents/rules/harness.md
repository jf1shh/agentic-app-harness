# Workspace rules — Agentic App Harness

> Google Antigravity reads workspace rules from `.agents/rules/`. These rules apply to every agent and
> every change in this workspace.

The full authoritative rulebook is [`../AGENTS.md`](../AGENTS.md) — i.e. `.agents/AGENTS.md`, the
canonical file the harness itself parses. The portable, tool-neutral entry point is the repo-root
[`AGENTS.md`](../../AGENTS.md). Read them before changing any code.

@../AGENTS.md

**Orientation first**: [`IDENTITY.md`](../../IDENTITY.md)/[`CONTEXT.md`](../../CONTEXT.md) at the repo
root are this repo's [ICM](https://github.com/ktnCodes/icm-template) navigation layer — a workspace
map and task-routing table on top of the rules below. Read them first.

Binding essentials (the linked file governs):

1. **Spec is the single source of truth** — read the matching spec in `specs/` before writing code.
   It dictates architecture, data models, and acceptance criteria. Flag conflicts; never silently diverge.
2. **Contract-first (Zod)** — data models are runtime `zod` schemas with `z.infer<typeof Schema>` types;
   validate untrusted input (storage, imports) at the boundary.
3. **No vibe coding** — if a requirement is ambiguous or underspecified, stop and ask before implementing.
4. **Monorepo scoping** — apps live under `projects/<app-name>`; scope every command and edit accordingly.
5. **Testing is mandatory** — Vitest units + Playwright E2E + `@axe-core/playwright` a11y in BDD
   `Given → When → Then` form. Complete only when `./scripts/test-app.ps1 -AppName <AppName>` passes.
   The same gates run in CI, so non-compliant changes fail the build.
6. **Never self-merge** — open a PR; a human reviews and merges.
