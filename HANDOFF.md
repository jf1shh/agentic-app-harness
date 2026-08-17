# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-17. This file describes the state of the repo **right now** —
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
- **Navigation layer:** `IDENTITY.md` and `CONTEXT.md` at the repo root are a
  five-layer ICM overlay — a workspace map and a task-routing table. `stages/{sense,
  propose,act,verify,learn}/` holds a `CONTEXT.md` contract and `output/` pointer per
  stage of the Agentic Loop below. Maintained via the project-scoped
  `.claude/skills/{icm-scaffold,icm-sync,icm-context-scaffold}` skills.
- **Claude Code wiring:** `.claude/settings.json` registers a PostToolUse hook
  (`.claude/hooks/verify-scripts.mjs`) and denies reads of `.env*`, `.npmrc`,
  `credentials.json`, keystore/property and key files. Claude-Code-only and
  non-blocking, same opt-in posture as `.claude/skills/`.

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

As of this pass: **7 blocking guardrails**, all traced to `.agents/AGENTS.md` §6
lessons (`harness-learn.mjs` verifies this). `node scripts/harness-status.mjs --gate`
reports **0 findings across all 6 apps**. `harness-learn.mjs`,
`check-doc-claims.mjs --gate`, and `check-guardrail-integrity.mjs` all pass.

## 3. Current State — landscape review features (this session)

Five harness features adopted from a landscape review of nine external agent-harness
repos (loopgate_harness, OpenLore, fspec, Agent-Gate/MergeWarden, and others), all
implemented and merged:

### Blocking CI gates (PR #232)

1. **Agent containment** (`scripts/check-containment.mjs` + self-test). Detects when a
   PR touches harness infrastructure (scripts, AGENTS.md, CLAUDE.md, workflows, git
   hooks, spec templates). Blocks unless the PR body includes
   `[containment-override: path/to/file]` for each protected file touched.
2. **Diff-size guardrail** (`scripts/check-diff-size.mjs` + self-test). Warns at 400
   net changed lines, blocks at 800. Excludes generated/lock files. Override with
   `[large-diff-acknowledged]` in the PR body.

### Non-blocking sensors (PR #233)

3. **Instruction-file tamper sensor** (`scripts/check-instruction-tamper.mjs` +
   self-test). Detects rule weakening (removed MUST/NEVER/always/mandatory/blocking/
   required), gate bypass (`--no-verify`, `continue-on-error: true`, `if: false`), and
   scope expansion (`exclude:` additions) in instruction and workflow files. Exits 0
   always — informational, not blocking.
4. **Spec-before-code ordering sensor** (`scripts/check-spec-ordering.mjs` +
   self-test). Flags apps where logic modules changed without a matching spec or test
   file touch. Silence with `[spec-unchanged: reason]` in the PR body. Non-blocking.

### Advisory tool (PR #234)

5. **Context staleness marker** (`scripts/generate-context-digest.mjs` + self-test,
   42 tests). Writes `.context-digest.json` (gitignored) with per-app spec/schema
   hashes, module/test counts, guardrail/lesson counts, and HEAD commit. Run at
   session start; run with `--diff` before pushing to detect stale context. No CI step,
   no gate — advisory only.

All five follow the pure-core + self-test pattern. Each script's `*.test.mjs` is
verified by `sdd-sentinel.yml`.

## 4. Still Open / Deliberately Deferred

- **Three deferred major-version migrations**: react 18→19, zod 4, and the
  testing-library/jest-dom + jsdom majors. Each needs real code changes for breaking
  APIs, not a version bump. Scope each as its own deliberate PR.
- **`legal-financial-rag/auditExporter.ts`** omits each ledger entry's `details` field
  from the markdown table — possibly a real compliance gap, possibly intentional
  brevity. Needs a product call.
- **`portfolio-hub` cannot be mutation-tested**: its tests deliberately read real
  repo-root files (`scripts/harness-status.mjs`, `.agents/AGENTS.md`), but Stryker's
  per-app sandbox only mirrors the app's own directory. Structural; needs a Stryker
  config change, not a test rewrite.
- **Final app-wide mutation scores** for `elder-care-planner`, `travel-packing-app`,
  `mood-diner`, and `smart-recipe-app` were confirmed at file level but never re-swept
  at app level. Informational, non-blocking — re-run `--full` before quoting a number.
- **Two non-blocking sensors may be promoted to blocking** once their false-positive
  rates are understood: `check-instruction-tamper.mjs` and `check-spec-ordering.mjs`
  follow the same sensor→guardrail promotion arc as `senseUnitTests` (`.agents/AGENTS.md`
  §8).

## 5. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — the authoritative gate; run it before every push, not
  just on CI.
- Inner loop: `node scripts/test-app.mjs --changed [<AppName>]` to gate only what this
  diff touches. Never the authoritative gate — CI runs the full suite.
- Harness scripts' own self-tests: `node scripts/<name>.test.mjs` for any gate script in
  `scripts/`. The PostToolUse hook re-runs these automatically on edit.
- Context staleness: `node scripts/generate-context-digest.mjs` at session start,
  `node scripts/generate-context-digest.mjs --diff` before pushing.
- Mutation score: `node scripts/run-mutation.mjs <AppName>` (informational, never
  blocks; `--full` ignores the incremental cache).
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.
- Checked-in docs match what they claim: `node scripts/check-doc-claims.mjs --gate`.

## 6. Next Steps for the Next Agent
1. **Decide on `docs/SLIM_RULEBOOK_PROPOSAL.md`**. If approved, follow its rollout: do
   the §6 lesson split first (pure prose, low risk), keep `[guardrail: <id>]` tags in
   the file `harness-learn.mjs` parses, and re-run the four acceptance commands it
   names before landing. If it regresses, revert that one PR and stop.
2. **Scope the three deferred major-version migrations** (react 19, zod 4,
   testing-library/jest-dom + jsdom) as separate PRs — do not fold into a routine
   dependency pass. Watch for new Dependabot PRs and triage by actual CI result.
3. **Make the audit-ledger `details` product decision** (show it, or explicitly "not
   now") — do not silently guess.
4. **Monitor the two non-blocking sensors** (`check-instruction-tamper.mjs`,
   `check-spec-ordering.mjs`) over several PRs. If false-positive rate is acceptable,
   promote to blocking via the §8 protocol.
5. **Re-confirm app-wide mutation scores** with `--full` sweeps before quoting them
   publicly (informational only).
6. If a top-level folder is added or removed, run `/icm-sync` to keep `IDENTITY.md` and
   `CONTEXT.md` from drifting.
