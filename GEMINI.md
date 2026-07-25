# GEMINI.md

Instructions for Gemini CLI and Google Antigravity working in this repository.

The rules are the same for every agent. The portable entry point is [`AGENTS.md`](AGENTS.md); the full
authoritative rulebook is [`.agents/AGENTS.md`](.agents/AGENTS.md). Antigravity additionally reads
workspace rules from [`.agents/rules/`](.agents/rules/). Read them before changing any code.

@AGENTS.md

Binding essentials (the links above govern):

1. **Spec-driven** — read the matching spec in `specs/` first; it is the single source of truth for
   architecture, data models, and acceptance criteria. Flag conflicts rather than diverging.
2. **Contract-first (Zod)** — runtime `zod` schemas with `z.infer<typeof Schema>` types; validate
   untrusted input at the boundary.
3. **No vibe coding** — if a requirement is ambiguous, stop and ask.
4. **Monorepo** — apps live under `projects/<app-name>`; scope edits and commands accordingly.
5. **Testing is mandatory** — Vitest + Playwright + `@axe-core/playwright`, BDD `Given → When → Then`.
   Complete only when `./scripts/test-app.ps1 -AppName <AppName>` passes. Enforced in CI.
6. **Never self-merge** — open a PR; a human reviews and merges.
