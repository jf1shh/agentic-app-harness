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

**This pass (2026-08-10): closed out `travel-packing-app`'s full "port it all" gap-audit
backlog against the source repo** (github.com/jf1shh/Travel-Packing-Optimizer) — eleven phases in
total across this and prior passes (#163–#166, then Phases 15–21), each an independent branch/PR,
TDD red→green with a stated mutation-proof, full `node scripts/test-app.mjs travel-packing-app`
green before every push. GitHub auto-merge was enabled throughout, landing PRs in an unpredictable
order relative to each other, so nearly every one needed at least one conflict-resolution merge
(`git merge origin/master --no-edit`) against still-open siblings before it could land clean.

The last three phases, merged this pass: **Phase 17** (3D luggage volume visualization, Three.js),
**Phase 18** (broader light-theme WCAG AA contrast audit), and **Phase 21** (camera-based suitcase
scanner). Phase 21 is worth flagging specifically: it was found by re-diffing this app against the
source repo *after* the prior "gap-audit backlog" was declared closed — the source's 1,084-line
`SuitcaseScanner.jsx` (live barcode scan + credit-card-calibrated tap-to-measure) had never been
ported, only its pure lookup/math. The lesson: "closed the backlog" claims from an audit are only as
complete as the audit was, and a stated completion is worth re-verifying against the actual source
before trusting it, not just against the prior pass's own summary of itself. Full detail on every
phase, including the architecture decisions Phase 21 forced (a `customSuitcase` state extension in
`page.tsx` for suitcase dimensions with no catalog match), is in
`projects/travel-packing-app/handoff.md`, not duplicated here.

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
3. If picking up `travel-packing-app` again, read its own `handoff.md` first. As of this pass its
   own "known follow-ups" list is empty — but see the note above about re-verifying that kind of
   claim against the actual source repo rather than trusting it at face value.
4. Consider whether `legal-financial-rag`'s vault lock should extend to
   actually encrypting document content at rest (currently: real passphrase
   verification gates the UI, but `SAMPLE_DOCUMENTS`/chunks are held as plain
   strings in React state, matching the app's "session-only, nothing persists"
   design — see its README). That's a larger redesign than fixing the
   passphrase check was, and would need a spec update first per
   `.agents/AGENTS.md` §1's "no vibe coding" rule.
5. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
