# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-04. This file describes the state of the repo **right now** —
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

**CI runner note:** `ci.yml`, `deploy-pages.yml`, and all `android-release*.yml`
workflows run on `ubuntu-latest`. `sdd-sentinel.yml` (the PR gate: harness verify/learn,
`check-enum-blast-radius.mjs`, `validate-specs.ps1 -Strict`) currently still runs on
**`windows-latest`** — `README.md` claims it's on `ubuntu-latest` too, which is
inaccurate as of this writing. Worth reconciling: either move it to `ubuntu-latest`
(the harness core is cross-platform Node, so this should be a one-line change) or
correct the README's claim — pick one, don't leave them disagreeing.

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn` as a thin
wrapper. See `.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent
contract.

## 3. Current State / Open Work
- **Most recent merged work:** portfolio-hub gained an "Applied ML/RAG Architecture"
  disclosure on project cards (real pipeline steps cited to source, for
  legal-financial-rag and smart-recipe-app), a Case Studies section (four real
  incidents, each citing a real guardrail id or script — verified against
  `scripts/harness-status.mjs` and the filesystem, not just asserted), and a "Loop
  Dashboard" stats panel generated from `.agents/AGENTS.md` and
  `scripts/harness-status.mjs` (never hand-typed; a Vitest test recomputes and fails
  on drift). See `specs/portfolio-hub-spec.md` §2 and PR #89.
- **Dependency backlog: triaged 2026-08-04.** Started at ~20 open Dependabot PRs.
  11 clean single-package bumps merged (verified CI-green per app first). 2 were
  superseded by a grouped `next`+`postcss` bump and closed rather than merged
  (would have downgraded `next`). 4 are genuinely broken and left open with a
  comment explaining why, matching real `.agents/AGENTS.md` §6 anti-patterns rather
  than being merged blind: a `typescript` major bump breaking `smart-recipe-app`'s
  own type-check, an `eslint` major breaking the same app's lint, an
  `eslint-plugin-security` major breaking `mood-diner`'s lint, and an
  `eslint-plugin-react-refresh` bump that breaks `npm install` for the entire
  workspace (shared root lockfile). 2 pairs need to land together, not separately
  — `@typescript-eslint/parser`/`eslint-plugin` in portfolio-hub (#59/#20), and
  `react`/`react-dom` in mood-diner (#73/#74) — merging one half alone (as
  happened here) passes that PR's own isolated CI but breaks `master` once
  combined with everything else, because a lockfile-hoisting interaction across
  the whole npm workspace isn't visible from a single PR's diff. See PR #91 for
  the mood-diner incident and its fix, and the note below for what a real fix
  looks like.
  - **Lesson worth promoting to `.agents/AGENTS.md` §6, not yet written up:** a
    Dependabot PR's own CI can be green in isolation and still break `master`
    once merged alongside other PRs from the same backlog, because npm workspace
    hoisting resolves across ALL workspaces at once — a PR's CI only sees the
    tree as of its own base commit, not the tree that results from stacking
    several merges. The mitigation isn't "trust the PR's green check," it's
    re-running the full per-app gate against `master`'s actual current tip after
    each merge in a batch, not just before it.
  - A real React 19 bump for mood-diner (completing #73/#74 properly) needs its
    own dedicated PR that also bumps `@testing-library/react` (still on `^14.2.1`,
    which only peers on `react-dom@^18`) to `^16.x` — and even then, a full
    `npm install` at the repo root hits a cross-workspace ERESOLVE conflict with
    `legal-financial-rag`'s deliberate React 18 pin, needing a deliberate decision
    before it's mergeable.
- **Open issues:** #69 (elder-care-planner §11.7 living-cost pre-fill, blocked on
  egress allowlist) and #70 (`PLAYWRIGHT_SKIP_PROD` silently defeats
  `senseProductionBundleTest`) — both real, both unresolved.
- **Stale branches:** `claude/github-actions-monorepo-sg51qd` (33 commits, unmerged,
  no open PR) and `claude/monorepo-agentic-harness-review-3jkqxe` (1 commit, unmerged,
  no open PR) look abandoned — either open a PR for whatever's salvageable or delete
  them; an unreviewed 33-commit branch sitting indefinitely is not a good look on a
  repo people are evaluating.
- **GitHub repo description** (Settings → General) still says "four live web &
  mobile apps" — there are six now. One-line fix, not done via API in this pass
  because no available tool exposes repo-settings/topics updates; do it manually.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — this is the authoritative gate; run it before every
  push, not just on CI.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.

## 5. Next Steps for the Next Agent
1. Reconcile the `sdd-sentinel.yml` / README CI-runner discrepancy noted in §2.
2. Triage the Dependabot backlog in §3 — don't let it re-accumulate; the whole
   point of the "peer set" lesson is that letting bumps sit unreviewed is how the
   split-peer-set bug happens in the first place.
3. Clean up or resolve the two stale branches in §3.
4. Close out issues #69 and #70, or at minimum comment with current status.
5. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
