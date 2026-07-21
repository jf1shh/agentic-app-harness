# AI Agent Handoff Document

## Workspace Overview
- **Repository**: Agentic App Harness (`c:\Harness` / `jf1shh/agentic-app-harness`)
- **Architecture**: Monorepo with applications located in `projects/`, specifications in `specs/`, scripts in `scripts/`, and agent rules in `.agents/AGENTS.md`.

## Recent Changes & Session Summary
- Updated `.agents/AGENTS.md` to establish **Section 7: Mandatory Session Wrap-up & Continuous Learning**:
  1. Mandatory updating of `.md` documentation after every session.
  2. Mandatory creation/maintenance of a dedicated `HANDOFF.md` for AI agent context transfer.
  3. Mandatory execution of the continuous learning loop (`/learn`) to persist lessons and best practices into `AGENTS.md`.

## Active Rules & Invariants
- Spec is the single source of truth (`specs/`).
- No "Vibe Coding" — clarify underspecified requirements.
- Scope commands & file operations to correct `projects/<app-name>` directory.
- All core logic must have unit tests (Vitest) and E2E tests (Playwright) with accessibility checks (`@axe-core/playwright`).
- Mandatory execution of `.\scripts\test-app.ps1 -AppName <AppName>` for app verification.

## Next Steps for Future AI Agents
1. When starting work on any app in `projects/`, check its spec in `specs/` and existing `HANDOFF.md`.
2. Wrap up every session by updating `.md` files, revising `HANDOFF.md`, and persisting any learned lessons via `/learn` into `.agents/AGENTS.md`.
