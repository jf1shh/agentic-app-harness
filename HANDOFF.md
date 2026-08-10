# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-10. This file describes the state of the repo **right now** —
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

Currently: **7 blocking guardrails**, all traced to `.agents/AGENTS.md` §6 lessons
(`node scripts/harness-learn.mjs` verifies this). Three sensors run alongside them:
`senseMobileRelease` and `senseProductionBundleTest` (non-blocking), and
`senseUnitTests` (blocking — every logic module needs a unit test reaching it).
As of this writing, `node scripts/harness-status.mjs --gate` reports **0 findings**
across all 6 apps.

**CI runner note (resolved):** every workflow — `ci.yml`, `sdd-sentinel.yml`,
`deploy-pages.yml`, and all `android-release*.yml` — now runs on `ubuntu-latest`.
The previous handoff flagged `sdd-sentinel.yml` as still on `windows-latest`
disagreeing with the README's claim; that was fixed in PR #93 (`ci(sdd-sentinel):
move SDD Sentinel to ubuntu-latest, matching the standing claim`) and is confirmed
in the workflow file as of this pass — nothing left to reconcile there.

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn` as a thin
wrapper. See `.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent
contract.

## 3. Current State / Open Work

**This pass (2026-08-10): closed out the last of the `travel-packing-app` gap-audit
backlog** — the four remaining "big architectural item" phases from an earlier audit against the
source repo (github.com/jf1shh/Travel-Packing-Optimizer). Each phase was built as an independent
branch/PR, TDD red→green with a stated mutation-proof, full `node scripts/test-app.mjs
travel-packing-app` green before every push:

- **#163** — packed-volume-by-category donut chart (Knapsack Engine panel).
- **#164** — multi-destination trips (day-splitting across legs, per-leg weather/geocoding,
  continuous day numbering, per-leg checklist adapters, Share Trip carrying every leg).
- **#165** — laundry-cycle-aware packing math (wardrobe sizing plateaus at one weekly cycle once a
  trip outlasts it, opt-out checkbox).
- **#166** — drag-and-drop outfit editor (`@dnd-kit/core`), validated against the wardrobe engine's
  own existing outfit-legality rules so a manual override can never diverge from the automatic
  scheduler.

All four merged to `master`. GitHub auto-merge was enabled on this repo and landed the four PRs in
an unpredictable order relative to each other, so each one needed at least one
conflict-resolution merge (`git merge origin/master --no-edit`) against its still-open siblings
before it could land clean — one needed three rounds, as master kept advancing mid-resolution.
Full detail and the remaining known gaps (expanded archetypes, 3D luggage view, the
`SuitcaseLayout` packing-cube view split out of #166, a broader light-theme contrast audit) are in
`projects/travel-packing-app/handoff.md`, not duplicated here. (The "mobile port" gap this section
used to list here was stale: a Capacitor Android shell had already shipped in PR #84, before this
pass was written — Phase 20 closed the spec and E2E-proof gaps #84 left behind; see that file.)

**No known outstanding harness findings**: `node scripts/harness-status.mjs --gate` reports 0
findings across all 6 apps as of this pass.

**Resolved since the 2026-08-07 pass** (not touched by this session — already done by the time
this pass started): the two previously-flagged stale `claude/*` branches and
`feat/11.11-starting-guide` no longer exist on `origin`; issues #69 and #70 are both closed, and
the repo currently has zero open issues.

**Still outstanding, not touched this pass:**
- **GitHub repo description** (Settings → General) — unverified whether it still undersells the
  app count; no repo-settings API is exposed to this session, so this needs a human check.
- **Dependabot backlog** — a large number of open `dependabot/*` PRs (dependency bumps across all
  6 apps' peer sets) sat untriaged through this pass; don't let it grow further unattended. Per
  `.agents/AGENTS.md` §6, treat any linter/compiler/icon-set major bump as an API change to
  verify, and never let a split peer pair (e.g. `eslint`/`@typescript-eslint/*`,
  `react`/`react-dom`) land only half-bumped.
- **`legal-financial-rag`'s vault lock** (see the 2026-08-07 pass) gates the UI with real
  passphrase verification but doesn't encrypt document content at rest in React state — a larger
  redesign that needs a spec update first, not a drive-by fix.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — this is the authoritative gate; run it before every
  push, not just on CI.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.

## 5. Next Steps for the Next Agent
1. Triage the Dependabot backlog — don't let it re-accumulate.
2. Verify the GitHub repo description reflects six apps and fix manually if not.
3. If picking up `travel-packing-app` again, read its own `handoff.md` first — it lists what's
   left after Phase 20 (native Android shell spec/E2E closure): expanded archetypes, 3D luggage
   visualization, the `SuitcaseLayout` packing-cube view, and a light-theme contrast audit for the
   rest of the app.
4. Consider whether `legal-financial-rag`'s vault lock should extend to
   actually encrypting document content at rest (currently: real passphrase
   verification gates the UI, but `SAMPLE_DOCUMENTS`/chunks are held as plain
   strings in React state, matching the app's "session-only, nothing persists"
   design — see its README). That's a larger redesign than fixing the
   passphrase check was, and would need a spec update first per
   `.agents/AGENTS.md` §1's "no vibe coding" rule.
5. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
