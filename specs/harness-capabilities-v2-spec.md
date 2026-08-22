# Project Specification: Harness Capabilities v2

> Spec for new harness capabilities inspired by seven external projects.
> This is a spec, not implementation — every section must be agreed before code is written
> (`.agents/AGENTS.md` §1).

## 1. Product Overview
**Name:** Harness Capabilities v2
**Description:** A set of new agent skills, guardrails, and CLI diagnostics that extend the
harness's Sense→Propose→Act→Verify→Learn loop with dependency-health checking, scope-creep
detection, token-budget monitoring, and a self-diagnostic `doctor` command — inspired by patterns
in `awesome-llm-apps`, `mattpocock/skills`, `caveman`, `strix`, `emilkowalski/skills`,
`superpowers`, and `Agent-Reach`.
**Target Audience:** AI coding agents and the humans who review their PRs in this monorepo.

## 2. Core Features

### 2.1 Dependency Doctor (`[guardrail: unpinned-deps]`)
- **Inspiration:** `awesome-llm-apps` Dependency Doctor skill
- **What it does:** Scans `package.json` files for unpinned dependencies (`^`, `~`, `*`, `>=`,
  bare `latest`), duplicate constraints across the workspace, and packages known to be yanked
  or deprecated.
- **Guardrail candidate:** A line-level `test(line)` predicate catches `"version":` lines with
  unpinned ranges.
- **Sensor candidate:** Cross-app duplicate-constraint detection (absence check, not regressions).

### 2.2 Scope Creep Detector
- **Inspiration:** `awesome-llm-apps` Scope Creep Detector skill
- **What it does:** Compares a PR's diff against its stated intent (from PR body or linked issue)
  and flags files touched outside the expected blast radius. Distinguishes between "this file
  is in scope" and "this file was brushed incidentally."
- **Skill type:** Model-invoked agent skill — triggers on `/scope-creep-check` or automatically
  before opening a PR.
- **Not a guardrail:** Requires reading the PR body and comparing file paths against natural-language
  intent — irreducible to a line-level regex.

### 2.3 Harness Doctor
- **Inspiration:** `Agent-Reach`'s `agent-reach doctor` command
- **What it does:** `node scripts/harness-doctor.mjs` runs every gate that can complete in under
  a second, reports pass/fail per check with fix prescriptions (the exact CLI command to run),
  and exits 0 only when every diagnostic is green. A fast, local pre-push self-check — not a
  replacement for the full `test-app.mjs` suite, just a "did I break anything obvious" signal.
- **Not a guardrail; a CLI tool.**

### 2.4 Token Budget Tracker (sensor)
- **Inspiration:** `caveman`'s `caveman learn` usage analysis
- **What it does:** A non-blocking sensor that reads agent session logs (Claude Code's
  `~/.claude/projects/` conversation JSON, Codex session metadata) and reports per-session token
  budgets, identifying sessions where the always-loaded context grew past a threshold.
- **Sensor only — never gates a merge.** Observability, not enforcement.

### 2.5 Security Smoke Test (sensor)
- **Inspiration:** `strix`'s CI/CD pentesting integration
- **What it does:** A non-blocking sensor that runs `npm audit --audit-level=high` per app and
  surfaces advisories as informational findings. The existing `test-app.mjs` already does this
  as a warning; this sensor makes it a durable finding in `harness-status.json` so it appears
  in work orders.
- **Sensor only — never gates a merge.** Security advisories are often transitive and unrelated
  to the change under test.

### 2.6 Architecture Scanner (skill)
- **Inspiration:** `mattpocock/skills` `/improve-codebase-architecture`
- **What it does:** A model-invoked skill that surveys a codebase for "deep module" opportunities
  — files importing a wide surface from a thin facade, where the facade should be deepened.
- **Skill only — requires human judgment.**

### 2.7 UI Quality Linting (sensor)
- **Inspiration:** `emilkowalski/skills` animation review skill
- **What it does:** A non-blocking sensor that detects common UI anti-patterns: ease-in on enter
  animations (should be ease-out), solid borders where box-shadow is better, fixed pixel widths
  on text containers.
- **Guardrail candidates:** Several are line-detectable (easing curve on enter animations).

## 3. Architecture & Tech Stack
- **Runtime:** Node.js ESM, zero external dependencies (same as existing harness scripts).
- **Integration points:**
  - New guardrails: `scripts/harness-status.mjs` `GUARDRAILS` array.
  - New sensors: `scripts/harness-status.mjs` `senseApp()` function.
  - New skills: `.agents/skills/<skill-name>/SKILL.md`.
  - New CLI: `scripts/harness-doctor.mjs`.
  - New self-tests: `scripts/harness-status.test.mjs`, `scripts/harness-doctor.test.mjs`.
  - New CI step: none initially; sensors start non-blocking per `.agents/AGENTS.md` §8 policy.

## 4. Data Models
No new data models. New findings carry the existing `Finding` shape already defined in
`scripts/harness-status.mjs`:

```typescript
interface Finding {
  id: string;           // "<app>-<ruleId>"
  ruleId: string;       // "guardrail:<id>" | "sensor:<id>" | ...
  type: string;         // "guardrail" | "missing-artifact" | "drift" | ...
  severity: string;     // "high" | "medium" | "low"
  gate: string;         // "guardrails" | "manual-review" | "informational"
  title: string;
  detail: string;
  evidence?: { file: string; line: number; snippet: string }[];
}
```

## 5. UI/UX Design System
N/A — harness scripts are CLI-only.

## 6. Testing & Compliance
- **Self-tests:** Every new guardrail needs a known-bad and known-good line in
  `scripts/harness-status.test.mjs`. Every new sensor needs a fixture-tree test.
- **Learn gate:** Every guardrail must trace to a `[guardrail: <id>]` tag on a lesson bullet in
  `.agents/AGENTS.md` §6, verifiable by `node scripts/harness-learn.mjs`.
- **Non-blocking promotion:** New sensors start with `isBlocking()` returning false. They are
  promoted once their backlog is closed — see `.agents/AGENTS.md` §8 for the policy.

## 7. Acceptance Criteria

### 7.1 Dependency Doctor guardrail
- [x] `node scripts/harness-status.mjs --gate` fails on a fixture `package.json` with `"^1.0.0"` and passes on one with `"1.0.0"`.
- [x] Self-test in `harness-status.test.mjs` covers both cases.
- [x] Lesson bullet added to `.agents/AGENTS.md` §6 tagged `[guardrail: unpinned-deps]`.

### 7.2 Agent skills
- [x] `dependency-doctor/SKILL.md` exists and follows the AGENT_SKILL_TEMPLATE.md format.
- [x] `scope-creep-detector/SKILL.md` exists and follows the template.
- [x] `harness-doctor/SKILL.md` exists and follows the template.
- [x] `architecture-scanner/SKILL.md` exists and follows the template (bonus, not in original spec).

### 7.3 Harness doctor CLI
- [x] `node scripts/harness-doctor.mjs` runs and reports pass/fail per check (exits 1 while the 7-existing-advisory security-smoke backlog exists, per design — 7/8 checks green on this repo).
- [x] `node scripts/harness-doctor.mjs` exits non-zero and prints fix prescriptions when checks fail (`--fix-hints` mode).
- [x] Self-test in `scripts/harness-doctor.test.mjs` covers pass, fail, `--fix-hints`, `--json`, `--quiet`, and timeout paths.

### 7.4 No regressions
- [x] `node scripts/harness-status.mjs --gate` exits 0 (no false positives from new guardrails).
- [x] `node scripts/harness-learn.mjs` exits 0 (new guardrails trace to lessons).
- [x] `node scripts/harness-status.test.mjs` passes (self-tests cover all 10 guardrails).

### 7.5 Bonus — beyond the original spec
- [x] Token Budget Tracker: `scripts/token-budget.mjs` + self-test + `senseTokenBudget()` sensor in harness-status.mjs + doctor check. Self-report via stdin (`--record`), non-blocking.
- [x] Security Smoke: `scripts/security-smoke.mjs` + self-test + doctor check. Runs `npm audit --json` per app.
- [x] UI Quality Linting: two line-detectable guardrails (`ease-in-on-enter`, `text-truncate-missing`) with lesson bullets and self-test coverage.

## 8. Open Questions / Resolved Architecture
- **Token Budget Tracker (2.4):** ✅ Resolved — self-report via `scripts/token-budget.mjs --record` (stdin JSON).
  The harness never reads agent session logs from disk. Implemented as both a standalone CLI and a
  `senseTokenBudget()` sensor integrated into harness-status.mjs.
- **UI Quality Linting (2.7):** ✅ Two line-detectable guardrails implemented —
  `ease-in-on-enter` (Tailwind `ease-in`, Framer Motion `ease: "easeIn"`, CSS `cubic-bezier(0.4, 0, 1, 1)`)
  and `text-truncate-missing` (`overflow-hidden` + `whitespace-nowrap` without `truncate`/`text-ellipsis`/`line-clamp-N`).
  Box-shadow vs. border remains a Playwright-only concern (computed style inspection).
- **Promotion timeline:** `unpinned-deps`, `ease-in-on-enter`, and `text-truncate-missing` are all
  non-blocking `manual-review` — promotable once their backlogs are cleared.
  Security smoke (npm audit) still has 7 existing advisories to triage.