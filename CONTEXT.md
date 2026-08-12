# ICM — Routing

## What do you want to do?

| Task | Go to | Load first |
|------|-------|------------|
| Get oriented as a new contributor | `README.md`, `CONTRIBUTING.md` | `IDENTITY.md` (this layer), then `HANDOFF.md` for current state |
| Build a new app, or a feature, end-to-end in order | `docs/APP_DEVELOPMENT_CYCLE.md` | Same prerequisites as any change: `AGENTS.md` → `.agents/AGENTS.md` |
| Add/change a feature in an app | `projects/<app-name>/` | `specs/<app-name>-spec.md`, `.agents/AGENTS.md` |
| Understand the rules for any change | `AGENTS.md` | `.agents/AGENTS.md` (the authoritative rulebook) |
| Run the full per-app gate | `scripts/test-app.mjs` | `.agents/AGENTS.md` §5 |
| Understand one stage of the harness loop in depth | `stages/{sense,propose,act,verify,learn}/CONTEXT.md` | `.agents/AGENTS.md` §8 |
| Run the harness loop | `scripts/harness-status.mjs`, `emit-tasks.mjs`, `harness-learn.mjs` | `stages/*/CONTEXT.md` |
| Add or fix a guardrail | `scripts/harness-status.mjs` (`GUARDRAILS`) + `scripts/harness-status.test.mjs` | `.agents/AGENTS.md` §8 "Protocol: adding a learned lesson" |
| Claim an open work order | `tasks/*.md` | `tasks/README.md` |
| Look up a repo convention or term | `_config/conventions.md`, `_config/glossary.md` | — |
| Scaffold a brand-new app | `scripts/scaffold-app.ps1` | `specs/templates/`, `.agents/AGENTS.md` §4 |
| Touch CI / workflows | `.github/workflows/` | `AGENTS.md` "CI" section |
| Open a PR | — | `.agents/AGENTS.md` §9 (report what you ran, widen-a-type blast radius, prove-a-test-can-fail) |
| Maintain this ICM layer as the repo evolves | `/icm-sync`, `/icm-context-scaffold` | `.claude/skills/icm-sync/SKILL.md`, `.claude/skills/icm-context-scaffold/SKILL.md` |

---

## Session Start

1. Read `IDENTITY.md` for the workspace map.
2. Find your task in the table above.
3. **Before writing code**, read `AGENTS.md` → `.agents/AGENTS.md` in full — the rules there are
   enforced in CI, not just documented, and this routing table is not a substitute for them.
4. If a request contradicts a spec in `specs/`, stop and flag it — do not silently diverge
   (`.agents/AGENTS.md` §1).
