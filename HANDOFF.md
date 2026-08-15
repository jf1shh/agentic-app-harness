# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-15. This file describes the state of the repo **right now** —
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
- **Claude Code wiring (this pass):** `.claude/settings.json` now registers a
  PostToolUse hook (`.claude/hooks/verify-scripts.mjs`) and denies reads of `.env*`,
  `.npmrc`, `credentials.json`, keystore/property and key files. Claude-Code-only and
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

The harness's internal structure uses four small patterns, each with executable
contracts in `harness-status.test.mjs`: **Pipeline** (`collectStatus()`),
**Chain of Responsibility** (supplemental sensors), **Strategy**
(`createBlockingStrategy()`), and **Adapter** (`createProjectAdapter()`).

## 3. Current State / Open Work — efficiency pass (this session)

The five Reddit/Claude-Code-derived efficiency optimizations below are implemented
in the working tree and verified green, but **not yet committed** — ship them via
the Changes panel (agents never self-merge).

1. **`--changed` inner-loop accelerator** (`scripts/test-app.mjs`). Maps files
   changed since `--base`..`--head` (defaults `origin/master`..`HEAD`, a merge-base
   diff) onto apps: a path under `projects/<app>/` affects that app, anything outside
   `projects/` widens to *every* app (a false skip is worse than a redundant run).
   Inner-loop only — CI (`ci.yml`) still runs the full suite with no `--changed`.
2. **Self-test + CI enforcement for it** (`scripts/test-app.test.mjs`,
   `.github/workflows/sdd-sentinel.yml`). `test-app.mjs` was the last per-app gate
   without a self-test; the new `test-app.test.mjs` pins the `affectedApps` mapping,
   and the sentinel now runs it as a "verify the verifier" step.
3. **Cheap, immediate feedback loop** (`.claude/hooks/verify-scripts.mjs` +
   `.claude/settings.json`). A PostToolUse hook that, after every Edit/Write/MultiEdit,
   re-runs the sibling `*.test.mjs` of any top-level `scripts/*.mjs` that changed and
   reports pass/fail in-turn. Non-blocking (always exits 0); CI is the gate. Handles
   relative and absolute paths, and MultiEdit's object-shaped `file_paths`.
4. **Session & model discipline** (`tasks/README.md`). Documents "one task per
   session," "delegate exploration, not implementation," and "split models per phase"
   as cost/attention habits — the gate is unchanged.
5. **Smaller always-on context** (`.agents/skills/sdd-harness-guide/SKILL.md` →
   pointer instead of a rulebook duplicate; `docs/SLIM_RULEBOOK_PROPOSAL.md`). The
   SKILL.md slim-down is done. The larger rulebook split (§6 lesson prose into
   `.agents/lessons/`) is **a proposal only, awaiting approval** — the rulebook is the
   single source of truth, so restructuring it is a spec change, not an edit on the fly.

### Verification run this pass

```
node scripts/test-app.test.mjs            → 11/11 pass
node scripts/harness-status.mjs --gate    → 0 findings
node scripts/harness-learn.mjs            → 7/7 guardrails trace to lessons
node scripts/check-doc-claims.mjs --gate  → pass
# all 12 pre-existing scripts/*.test.mjs self-tests → pass
```

### Still open / deliberately deferred (unchanged from prior passes)

- **Three deferred major-version migrations**: react 18→19, zod 4, and the
  testing-library/jest-dom + jsdom majors. Each needs real code changes for breaking
  APIs, not a version bump. Scope each as its own deliberate PR.
- **`legal-financial-rag/auditExporter.ts`** omits each ledger entry's `details` field
  from the markdown table — possibly a real compliance gap, possibly intentional
  brevity. Needs a product call. *(Note: two other items the previous HANDOFF listed
  here — the IBAN cap and the vault-encryption redesign — were merged since, #221 and
  #216 respectively.)*
- **`portfolio-hub` cannot be mutation-tested**: its tests deliberately read real
  repo-root files (`scripts/harness-status.mjs`, `.agents/AGENTS.md`), but Stryker's
  per-app sandbox only mirrors the app's own directory. Structural; needs a Stryker
  config change, not a test rewrite.
- **Final app-wide mutation scores** for `elder-care-planner`, `travel-packing-app`,
  `mood-diner`, and `smart-recipe-app` were confirmed at file level but never re-swept
  at app level. Informational, non-blocking — re-run `--full` before quoting a number.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — the authoritative gate; run it before every push, not
  just on CI.
- Inner loop: `node scripts/test-app.mjs --changed [<AppName>]` to gate only what this
  diff touches. Never the authoritative gate — CI runs the full suite.
- Harness scripts' own self-tests: `node scripts/<name>.test.mjs` for any gate script in
  `scripts/` (now including `test-app.test.mjs`). The PostToolUse hook re-runs these
  automatically on edit.
- Mutation score: `node scripts/run-mutation.mjs <AppName>` (informational, never
  blocks; `--full` ignores the incremental cache). For a fast targeted re-check:
  `cd projects/<app> && npx stryker run --mutate "src/path/to/file.ts"`.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.
- Checked-in docs match what they claim: `node scripts/check-doc-claims.mjs --gate`.

## 5. Next Steps for the Next Agent
1. **Ship this pass**: all five items in §3 are uncommitted. Stage only those files and
   open a PR — never self-merge.
2. **Decide on `docs/SLIM_RULEBOOK_PROPOSAL.md`**. If approved, follow its rollout: do
   the §6 lesson split first (pure prose, low risk), keep `[guardrail: <id>]` tags in
   the file `harness-learn.mjs` parses, and re-run the four acceptance commands it
   names before landing. If it regresses, revert that one PR and stop.
3. **Scope the three deferred major-version migrations** (react 19, zod 4,
   testing-library/jest-dom + jsdom) as separate PRs — do not fold into a routine
   dependency pass. Watch for new Dependabot PRs and triage by actual CI result.
4. **Make the audit-ledger `details` product decision** (show it, or explicitly "not
   now") — do not silently guess.
5. **Optionally parallelize the gate** for further wall-clock wins: the per-app steps in
   `test-app.mjs` and `run-mutation.mjs --all` still run sequentially. Propose it before
   implementing — no vibe coding.
6. **Re-confirm app-wide mutation scores** with `--full` sweeps before quoting them
   publicly (informational only).
7. **Two process notes carried forward**: (a) when writing a browser-API test, check what
   the test environment actually supports before assuming it needs a mock; (b) a
   before/after mutation-score claim is only real if mutation testing was re-run after
   the fix — not just `vitest run`.
8. If a top-level folder is added or removed, run `/icm-sync` to keep `IDENTITY.md` and
   `CONTEXT.md` from drifting.
