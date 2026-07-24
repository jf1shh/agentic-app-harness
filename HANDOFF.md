# Agentic App Harness - AI Agent Handoff Document

## 1. Workspace & Architecture Overview
- **Repository:** Agentic App Harness (`jf1shh/agentic-app-harness`)
- **Live GitHub Pages Showcase:** `https://jf1shh.github.io/agentic-app-harness/`
- **Live Applications Deployed:**
  - `MoodDiner`: `https://jf1shh.github.io/agentic-app-harness/mood-diner/`
  - `Travel Packing App`: `https://jf1shh.github.io/agentic-app-harness/travel-packing-app/`
  - `Smart Recipe Manager`: `https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/`
  - `LexiVault Financial RAG`: `https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/`
- **What this repo is:** a spec-driven development (SDD) harness — specs, scripts,
  and CI gates that keep AI-assisted app development rigorous and drift-free. The
  quality bar (Zod contracts, BDD tests, accessibility, spec coverage) is enforced
  in CI, not just documented.

## 2. The Agentic Loop (harness self-improvement)
The harness now closes its own improvement loop **with no embedded LLM and no API
key** — the AI agent is a pluggable actuator, and the repo stays provider-neutral.
The loop is zero-dependency Node ESM, so it runs on the Windows CI and any dev
machine without `pwsh`.

| Stage | Command | What it does |
|---|---|---|
| **Sense** | `node scripts/harness-status.mjs` | Scans every app for missing artifacts, contract/BDD gaps, spec drift, and guardrail violations → `harness-status.json`. |
| **Propose** | `node scripts/emit-tasks.mjs` | Turns each finding into a self-contained work order under `tasks/`. |
| **Act** | (any agent) | An agent claims a task, does the work, opens a PR — never self-merges. |
| **Verify** | `node scripts/harness-status.mjs --gate` | Blocking CI gate: fails on guardrail regressions + missing specs (drift only informs). Guardrails are self-tested (`harness-status.test.mjs`). |
| **Learn** | `node scripts/harness-learn.mjs` | Enforces a closed `Lesson ⇄ Guardrail ⇄ Self-test` loop so new guardrails must trace to a documented lesson. |

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn`
commands. The loop runs in CI via `.github/workflows/sdd-sentinel.yml`. See
`.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent contract.

## 3. Current State / Open Work
- **Open PR:** #28 (`claude/harness-self-improvement-0yo9fa` → `master`) — adds the
  agentic loop and dogfoods it on `smart-recipe-app`. CI (Harness Testing Suite +
  SDD Sentinel) runs the full gate on the PR.
- **Smart Recipe App:** the loop flagged real spec drift; acting on it added a
  genuine recipe-recommendation engine (`src/lib/recommend.ts`) and reconciled the
  spec to the app's true static-export + `localStorage` architecture. Sense now
  reports **0 findings**. See `projects/smart-recipe-app/AGENT_HANDOFF.md` for
  app-level detail and known gaps.
- **LexiVault Financial RAG:** 100% client-side private RAG (zero-exfiltration CSP,
  PBKDF2 key derivation, auto-lock, ReDoS/prompt-injection shield, tamper-evident
  hash chaining). Passing the full harness suite.

## 4. How to Verify
- Whole-repo sense + gates: `.\scripts\harness.ps1 status`, then `verify` and `learn`.
- A single app: `.\scripts\test-app.ps1 -AppName <AppName>` (security, lint,
  type-check, Vitest, Playwright + a11y).
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.

## 5. Next Steps for the Next Agent
- Drive PR #28 to green and merge (watch is active on the PR).
- When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
  guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
- Consider making the Verify gate `--strict` (drift-blocking) once all specs are
  reconciled, and adding guardrails for any new recurring regression.
