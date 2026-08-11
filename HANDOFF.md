# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-11. This file describes the state of the repo **right now** —
it is rewritten, not appended to, each time it's updated. Session-by-session
history belongs in git log and PR descriptions, not here._

## 1. Workspace & Architecture Overview
- **Repository:** `jf1shh/agentic-app-harness`
- **Live Portfolio Hub:** https://jf1shh.github.io/agentic-app-harness/
- **Six apps total** — the hub itself, plus five showcased apps, all live on GitHub Pages:
  - `MoodDiner`: https://jf1shh.github.io/agentic-app-harness/mood-diner/
  - `Travel Packing App`: https://jf1shh.github.io/agentic-app-harness/travel-packing-app/
  - `Smart Kitchen Recipe Manager`: https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/
  - `LexiVault Financial RAG`: https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/
  - `Elder Care Cost Planner`: https://jf1shh.github.io/agentic-app-harness/elder-care-planner/
- **What this repo is:** a spec-driven development (SDD) harness — specs, scripts,
  and CI gates that keep AI-assisted app development rigorous and drift-free. The
  quality bar (Zod contracts, BDD tests, accessibility, spec coverage) is enforced
  in CI, not just documented. Full rulebook: `.agents/AGENTS.md`.
- **Navigation layer (new this pass):** `IDENTITY.md` and `CONTEXT.md` at the repo root are a
  full five-layer [ICM](https://github.com/ktnCodes/icm-template) (Interpretable Context
  Methodology) overlay — a workspace map, a task-routing table, and (Layer 2/4) a
  `stages/{sense,propose,act,verify,learn}/` folder per stage of the Agentic Loop below, each
  with a `CONTEXT.md` contract and an `output/README.md` pointing at that stage's real artifact
  location rather than duplicating it. `_config/{conventions,glossary,voice}.md` (Layer 3) link
  back to `.agents/AGENTS.md`/`CLAUDE.md` instead of restating them. Maintained via three
  project-scoped Claude Code skills at `.claude/skills/{icm-scaffold,icm-sync,icm-context-scaffold}`
  — run `/icm-sync` after adding/removing a top-level folder so the map doesn't drift. Every other
  agent-facing doc (`AGENTS.md`, `.agents/AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `.cursor/rules/harness.mdc`, `.agents/rules/harness.md`, `CONTRIBUTING.md`, `README.md`) now
  points to `IDENTITY.md`/`CONTEXT.md` as the place to start.

## 2. The Agentic Loop (harness self-improvement)
The harness closes its own improvement loop **with no embedded LLM and no API
key** — the AI agent is a pluggable actuator, and the repo stays provider-neutral.
The loop core is zero-dependency Node ESM and runs anywhere Node does.

| Stage | Command | What it does |
|---|---|---|
| **Sense** | `node scripts/harness-status.mjs` | Scans every app for missing artifacts, contract/BDD gaps, spec drift, and guardrail violations → `harness-status.json`. |
| **Propose** | `node scripts/emit-tasks.mjs` | Turns each finding into a self-contained work order under `tasks/`. |
| **Act** | (any agent) | An agent claims a task, does the work, opens a PR — never self-merges. |
| **Verify** | `node scripts/harness-status.mjs --gate` | Blocking CI gate: fails on guardrail regressions + missing specs (drift only informs). Guardrails are self-tested (`harness-status.test.mjs`). |
| **Learn** | `node scripts/harness-learn.mjs` | Enforces a closed `Lesson ⇄ Guardrail ⇄ Self-test` loop so new guardrails must trace to a documented lesson. |

Each stage above now also has a physical folder — `stages/sense/`, `stages/propose/`,
`stages/act/`, `stages/verify/`, `stages/learn/` — with its own `CONTEXT.md` restating this table
as a contract (reads/runs/writes) and an `output/README.md` pointing at where that stage's real
output lives. See §1.

Currently: **7 blocking guardrails**, all traced to `.agents/AGENTS.md` §6 lessons
(`node scripts/harness-learn.mjs` verifies this). Three sensors run alongside them:
`senseMobileRelease` and `senseProductionBundleTest` (non-blocking), and
`senseUnitTests` (blocking — every logic module needs a unit test reaching it).
As of this writing, `node scripts/harness-status.mjs --gate` reports **0 findings**
across all 6 apps.

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn` as a thin
wrapper. See `.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent
contract.

## 3. Current State / Open Work

**This pass (2026-08-11): added the ICM navigation layer** described in §1 (PR #180, merged) —
`IDENTITY.md`, `CONTEXT.md`, `_config/`, `stages/`, and the three `.claude/skills/` that maintain
them — then propagated pointers to it into every other agent-facing doc in the repo (this file
included). Purely additive: no app code, spec, guardrail, or existing doc content changed.

**Found while babysitting PR #180's CI, not yet fixed — needs a follow-up:**
`test (portfolio-hub)` fails on `master` right now. `projects/portfolio-hub/src/data/
loopStats.generated.test.ts` recomputes `lessonCount` live from `.agents/AGENTS.md` §6 and compares
it against the committed `projects/portfolio-hub/src/data/loopStats.generated.ts` fixture
(`44` recomputed vs. `43` committed). Verified by checking out `origin/master` standalone (no PR
#180 changes applied) and re-running `node scripts/generate-loop-stats.mjs` from
`projects/portfolio-hub/` — it independently reproduces `44`, so this predates PR #180 and isn't
caused by the ICM changes. Most likely PR #179 (mood-diner paywall rewrite, the prior master merge)
added a new §6 lesson without regenerating this fixture. **Fix**: from
`projects/portfolio-hub/`, run `node scripts/generate-loop-stats.mjs`, then commit the regenerated
`src/data/loopStats.generated.ts`.

**No known outstanding harness findings**: `node scripts/harness-status.mjs --gate` reports 0
findings across all 6 apps as of this pass (the portfolio-hub item above is a per-app Vitest
fixture, not a harness guardrail finding — it wouldn't show up in that gate).

**Still outstanding, not touched this pass:**
- **GitHub repo description** (Settings → General) — unverified whether it still undersells the
  app count; no repo-settings API is exposed to this session, so this needs a human check.
- **Dependabot backlog** — a large number of open `dependabot/*` PRs (dependency bumps across all
  6 apps' peer sets) has been sitting untriaged across multiple passes; don't let it grow further
  unattended. Per `.agents/AGENTS.md` §6, treat any linter/compiler/icon-set major bump as an API
  change to verify, and never let a split peer pair (e.g. `eslint`/`@typescript-eslint/*`,
  `react`/`react-dom`) land only half-bumped.
- **`legal-financial-rag`'s vault lock** gates the UI with real passphrase verification but doesn't
  encrypt document content at rest in React state — a larger redesign that needs a spec update
  first, not a drive-by fix.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — this is the authoritative gate; run it before every
  push, not just on CI.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.
- Checked-in docs match what they claim: `node scripts/check-doc-claims.mjs --gate`.

## 5. Next Steps for the Next Agent
1. **Fix the portfolio-hub `loopStats` drift** described in §3 — one command
   (`node scripts/generate-loop-stats.mjs` from `projects/portfolio-hub/`) plus a commit.
2. Triage the Dependabot backlog — don't let it re-accumulate.
3. Verify the GitHub repo description reflects six apps and fix manually if not.
4. Consider whether `legal-financial-rag`'s vault lock should extend to
   actually encrypting document content at rest (currently: real passphrase
   verification gates the UI, but `SAMPLE_DOCUMENTS`/chunks are held as plain
   strings in React state, matching the app's "session-only, nothing persists"
   design — see its README). That's a larger redesign than fixing the
   passphrase check was, and would need a spec update first per
   `.agents/AGENTS.md` §1's "no vibe coding" rule.
5. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
6. If a top-level folder is added or removed, run `/icm-sync` (`.claude/skills/icm-sync/`) to keep
   `IDENTITY.md`'s folder map and `CONTEXT.md`'s routing table from drifting.
