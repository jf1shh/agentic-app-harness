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
- **Navigation layer:** `IDENTITY.md` and `CONTEXT.md` at the repo root are a
  full five-layer [ICM](https://github.com/ktnCodes/icm-template) (Interpretable Context
  Methodology) overlay — a workspace map, a task-routing table, and (Layer 2/4) a
  `stages/{sense,propose,act,verify,learn}/` folder per stage of the Agentic Loop below, each
  with a `CONTEXT.md` contract and an `output/README.md` pointing at that stage's real artifact
  location rather than duplicating it. `_config/{conventions,glossary,voice}.md` (Layer 3) link
  back to `.agents/AGENTS.md`/`CLAUDE.md` instead of restating them. Maintained via three
  project-scoped Claude Code skills at `.claude/skills/{icm-scaffold,icm-sync,icm-context-scaffold}`
  — run `/icm-sync` after adding/removing a top-level folder so the map doesn't drift.

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
(`node scripts/harness-learn.mjs` verifies this). Sensors run alongside them:
`senseMobileRelease` and `senseProductionBundleTest` (non-blocking), and
`senseUnitTests` (blocking — every logic module needs a unit test reaching it).
`run-mutation.mjs` (Stryker, informational — see §3 below) measures *depth*, which
none of the above sensors can see: reach ≠ well-tested.

As of this pass: `node scripts/harness-status.mjs --gate` reports **0 findings**
across all 6 apps, `harness-learn.mjs` passes, `check-doc-claims.mjs --gate` passes.
`tasks/` is empty (no open work orders).

## 3. Current State / Open Work

**This pass (2026-08-11): ran a full mutation-testing sweep (`node scripts/run-mutation.mjs
--all`) for the first time with real results**, and fixed one small bug it exposed. No app code
or tests were changed yet — this pass was measurement + one infra fix, and the actual
test-writing is next session's work (see §5).

**Environment gotcha, worth remembering:** the container this ran in had **no root
`node_modules` at all** — `npm install` had never been run. Because of that, `npx stryker`
silently resolved to an unrelated, wrong npm package literally named `stryker` (not
`@stryker-mutator/core`'s bin) and failed with `Cannot find module 'rx'` on every app. This
looked like a mutation-testing bug and wasn't — it was a missing `npm install`. If mutation
testing (or anything else) fails identically at the very first step in a fresh container, check
for `node_modules` at the repo root before debugging the tool itself.

**Mutation scores** (`node scripts/run-mutation.mjs --all`, incremental, ~45 min total; the
`legal-financial-rag` figure below is the *original* sweep number — see "Fixed this pass" further
down for where it stands now):

| App | Score (original sweep) | Notes |
|---|---|---|
| elder-care-planner | 52.9% → **app score not yet re-swept** | `explain/build.ts` alone: 35.5%→45.3% across two batches, see below; other files untouched. |
| legal-financial-rag | 50.6% → **62.7% (app re-swept, confirmed)** | sanitizer.ts, piiRedactor.ts, schemas.ts all done. |
| travel-packing-app | 42.6% | Not yet touched. |
| mood-diner | 33.6% | Not yet touched. |
| smart-recipe-app | 29.3% | Not yet touched. |
| portfolio-hub | **n/a — cannot run** | See below. |

`portfolio-hub` cannot be mutation-tested as-is: `caseStudiesData.test.ts` and
`loopStats.generated.test.ts` deliberately read the real root-level `scripts/harness-status.mjs`
and `.agents/AGENTS.md` (via a `REPO_ROOT` climb) to keep the hub's displayed stats honest, but
Stryker's per-app sandbox (`.stryker-tmp`) only mirrors that app's own directory, so the dry run
fails with `ENOENT` on `projects/portfolio-hub/scripts/harness-status.mjs` (the repo-root file,
misresolved inside the sandbox). This is a real structural limitation, not a bug in the app's
tests — no action taken; flagging so nobody re-diagnoses it from scratch.

**Caveat on the numbers above:** a meaningful chunk of every score is noise from pure-data
modules Stryker mutates because they're `src/**/*.ts` but that were never meant to be
logic-tested — `mood-diner/data/restaurantsData.ts`, `legal-financial-rag/lib/datasets/
authenticSampleDocs.ts`, `travel-packing-app/utils/suitcaseDatabase.ts`,
`smart-recipe-app/lib/data.ts`. Mutating a hardcoded string literal in a dataset and reporting
"no test caught it" is not a real gap. Ignore those files when picking where to add tests.

**Real, high-value targets identified (survived mutants on files with actual logic + existing
tests — meaning the tests run but their assertions are too weak to catch a broken
implementation)**, ranked by how much it matters here:

1. ~~**`elder-care-planner/src/lib/explain/build.ts`** — 37% file score, 484 survived
   mutants~~ — **two batches done this pass**: 35.49%→45.33% (484→432 survived, NoCoverage
   34→7). This file's own tests deliberately check arithmetic balance rather than prose
   wording, so most remaining survivors are `StringLiteral` mutations of caveat/assumption
   text (229 of them) — expected, not a real gap (mirrors the "ignore pure-data files" caveat
   above but for narrative strings instead of datasets). Batch 1 killed the 5 branches that
   were **`NoCoverage`** — never executed by any of the 13 fixtures, not just weakly asserted:
   an annual-cadence ancillary item, a care-level increase already in effect by month one (the
   source's own comment calls this required "or the parts stop adding up"), an illiquid asset's
   exclusion note, `residentialAlwaysCheaper` in the break-even comparison, and the
   income-proportional split's fallback-to-equal-shares note. Batch 2 killed 10 more —
   `costSourceLines`' confidence/provenance text (national-fallback caveat,
   verified/needs_verification lines, entry notes), both `cheaperOption` branches in the
   break-even note, the monthly-gap "no income" note and an elimination-period case, and the
   facility-fit weighted-at-zero + no-scores-at-all cases. `PlannerState` can't express several
   of these (no UI path yet to an annual ancillary item, a scheduled care-level increase, or an
   illiquid asset), so those tests build `CareScenario`/`Plan` objects directly, same as
   `ilExplanations()` already does for the buy-in path. **Still open**: ~79
   `ConditionalExpression` and ~38 `EqualityOperator` survivors remain (down from ~95/~49) —
   diminishing returns from here, mostly narrower permutations of branches already partly
   covered. Re-run `cd projects/elder-care-planner && npx stryker run --mutate
   "src/lib/explain/build.ts"` (~2 min) for a fresh mutant list before picking the next batch,
   or consider this file done-enough and move to a fresh one.
2. ~~**`legal-financial-rag/src/lib/security/sanitizer.ts`** (45%) and **`piiRedactor.ts`**
   (66%)~~ — **done this pass.** sanitizer.ts 44.83%→81.03% (28→11 survived), piiRedactor.ts
   66.25%→82.50% (27→14 survived). The single biggest gap was that piiRedactor's EIN/Tax-ID
   detection branch had **zero** test coverage at all — nothing in the suite ever exercised it.
   New tests are in `sanitizer.test.ts`/`piiRedactor.test.ts`; verified by re-running mutation
   testing after adding them (not just by reading the diff). **Found in passing, not fixed**:
   the bank/IBAN regex caps the matched value at 18 characters, so a real full-length IBAN
   (15-34 chars per ISO 13616) is silently never detected or redacted at all — a genuine gap,
   but widening the cap is a product decision (how long is too long before it starts
   over-matching), not a drive-by fix, so it's flagged in a test comment and left for a human
   call.
3. ~~**`legal-financial-rag/src/lib/schemas.ts`** — 4.7% score, 61 survived~~ — **done this
   pass, fully: 4.69%→100.00%, 0 survived.** There was no test for this file at all —
   `unit.test.ts` only exercised 2 of 5 `SecurityPrivilegeLevelSchema` members and asserted one
   valid `DocumentChunkSchema` object didn't throw. New `schemas.test.ts` covers every enum's
   full member list (accept + reject-one-outside-it), boundary tests for `topK`/`hybridWeight`/
   `confidence`, defaults (`isMasked`, `isSample`, the audit chain's genesis-hash sentinel), a
   missing-field rejection, a wrong-type rejection, and nested-schema enforcement. This alone
   moved the whole app's score from 50.6% to a confirmed 62.7% (full app re-swept, not just this
   file).
4. **`travel-packing-app/src/utils/airlineBaggage.ts`** — 29%, 618 survived mutants, the
   largest raw count in the entire sweep. Real rules-based domain logic (per-airline
   weight/dimension limits) — should be very testable, not just "give it more tests."
5. **`smart-recipe-app/src/lib/recommend.ts`** — 49%/53%, 74 survived — the app's core
   recommendation engine.
6. **`elder-care-planner/src/lib/engine/plan.ts`** (32%) and **`plannerState.ts`** (36%) —
   core planning engine and state logic.
7. **`travel-packing-app/src/utils/generator.ts`** (39%) and **`wardrobeEngine.ts`** (34%) —
   core itinerary/outfit generation.

Full per-file tables (all 6 apps) are in this session's transcript if needed again; they were
not saved to a file in the repo (regenerate with `node scripts/run-mutation.mjs --all`, ~45 min,
or `node scripts/run-mutation.mjs <AppName>` for one app at a time, a few minutes each).

**Infra fix made this pass (committed + pushed to
`claude/harness-repo-recruiter-summary-i7sll2`):** running mutation testing left
`projects/<app>/reports/stryker-incremental.json` untracked in every app — the existing
`.gitignore` only excluded `**/reports/mutation/` (one level down), not the incremental-cache
file Stryker writes directly under `reports/`. Fixed by broadening the rule to `**/reports/`
(nothing under any app's `reports/` was ever tracked or meant to be).

**No known outstanding harness findings**: `node scripts/harness-status.mjs --gate` reports 0
findings across all 6 apps as of this pass.

**Also fixed this pass:** `portfolio-hub`'s `loopStats.generated.test.ts` was failing
(`lessonCount` recomputed to `44` against a committed fixture of `43`, first found while
babysitting an earlier PR and left open since). Ran `node scripts/generate-loop-stats.mjs` from
`projects/portfolio-hub/`, committed the regenerated `src/data/loopStats.generated.ts`, confirmed
green (`60/60` unit tests). Done.

**Still outstanding from before this pass, not touched:**
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
- Mutation score for one app: `node scripts/run-mutation.mjs <AppName>` (informational, never
  blocks; incremental by default, add `--full` to ignore the cache).
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.
- Checked-in docs match what they claim: `node scripts/check-doc-claims.mjs --gate`.

## 5. Next Steps for the Next Agent
1. **Keep working down the surviving-mutant list in §3**, in priority order. `sanitizer.ts`,
   `piiRedactor.ts`, and `schemas.ts` are all done in `legal-financial-rag` (app score
   50.6%→62.7%, confirmed by a full re-sweep). `explain/build.ts` in `elder-care-planner` had
   two batches (35.5%→45.3%) and is at the point of diminishing returns — the next agent should
   judge whether a third batch is worth it or whether to move on. Next up, in roughly
   descending value:
   - `travel-packing-app/src/utils/airlineBaggage.ts` (29%, 618 survived — biggest raw count in
     the whole repo-wide sweep, real per-airline rules logic, not yet touched).
   - `legal-financial-rag/src/lib/rag/queryProcessor.ts` (18.6%, 32 survived — worst ratio left
     in that app now that schemas.ts is fixed) and `export/auditExporter.ts` (12.8%, 27
     survived — a tamper-evident audit export, worth checking given the app's whole security
     premise).
   - `smart-recipe-app/src/lib/recommend.ts`, `elder-care-planner/engine/plan.ts` +
     `plannerState.ts`, `travel-packing-app/generator.ts` + `wardrobeEngine.ts`.
   - Full app-wide re-sweeps for `elder-care-planner`, `mood-diner`, `smart-recipe-app`, and
     `travel-packing-app` are still the *original* sweep numbers from earlier in this document —
     only `legal-financial-rag`'s has been confirmed post-fix.
   For each: rerun `node scripts/run-mutation.mjs <AppName> --full` (or reuse a fresh JSON report)
   to pull the exact surviving mutants (see the `node -e` snippet used this pass — reads
   `reports/mutation/mutation.json`, filters to the target file, prints status/mutator/location),
   write the assertion that pins down that exact behavior, then re-run mutation testing after —
   not just the unit suite — to confirm the score actually moved, and state the before/after
   numbers in the PR body. Watch for the sanitizer.ts/piiRedactor.ts pattern repeating: an entire
   branch with literally zero test coverage is more likely than uniformly-weak assertions.
2. Triage the Dependabot backlog — don't let it re-accumulate.
3. Consider whether `legal-financial-rag`'s vault lock should extend to actually encrypting
   document content at rest — needs a spec update first per `.agents/AGENTS.md` §1's "no vibe
   coding" rule, not a drive-by fix.
4. Consider whether the bank/IBAN regex's 18-character cap in `piiRedactor.ts` (found this pass,
   not fixed — see §3 item 2) should widen to cover real IBAN lengths (15-34 chars) without
   over-matching unrelated long alphanumeric runs. Needs a deliberate decision on the new bound,
   not a quick edit.
5. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
6. If a top-level folder is added or removed, run `/icm-sync` (`.claude/skills/icm-sync/`) to keep
   `IDENTITY.md`'s folder map and `CONTEXT.md`'s routing table from drifting.
7. Separately (lower priority, not urgent): the two self-test-less scripts noted earlier this
   session — `scripts/harness-learn.mjs` (the LEARN blocking gate itself) and
   `scripts/emit-tasks.mjs` (the PROPOSE step) — have no `*.test.mjs` counterpart, unlike every
   sibling script in `scripts/`. Cheap, fixture-based, pure-Node tests to add whenever there's a
   quiet moment.
