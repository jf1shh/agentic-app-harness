# GitHub Copilot — repository instructions

This repository is governed by a single, cross-tool rulebook. **Follow it exactly.**

- Portable summary + entry point: [`AGENTS.md`](../AGENTS.md)
- Full authoritative rules: [`.agents/AGENTS.md`](../.agents/AGENTS.md)

The essentials (the links above govern):

1. **Spec-driven.** Read the matching spec in `specs/` before writing code. The spec is the single
   source of truth for architecture, data models, and acceptance criteria. Flag any conflict — never
   silently diverge.
2. **Contract-first (Zod).** Data models are runtime `zod` schemas with `z.infer<typeof Schema>` types;
   validate untrusted input at the boundary.
3. **No vibe coding.** If a requirement is ambiguous, stop and ask instead of guessing.
4. **Monorepo.** Apps live under `projects/<app-name>`; scope edits and commands accordingly.
5. **Testing is mandatory.** Vitest units + Playwright E2E + `@axe-core/playwright` a11y, all in BDD
   `Given → When → Then` form. A change is complete only when `./scripts/test-app.ps1 -AppName <AppName>`
   passes. These gates run in CI, so non-compliant changes fail the build.
6. **Never self-merge.** Open a PR; a human reviews and merges.
