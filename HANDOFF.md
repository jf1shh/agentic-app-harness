# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-12. This file describes the state of the repo **right now** —
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
`run-mutation.mjs` (Stryker, informational) measures *depth*, which none of the above
sensors can see: reach ≠ well-tested. As of this pass, **every script in `scripts/` has a
matching `*.test.mjs` self-test** — `harness-learn.mjs` and `emit-tasks.mjs` were the last
two without one; see §3.

As of this pass: `node scripts/harness-status.mjs --gate` reports **0 findings**
across all 6 apps, `harness-learn.mjs` passes, `check-doc-claims.mjs --gate` passes,
`check-guardrail-integrity.mjs` reports nothing to check. `tasks/` is empty (no open work
orders).

## 3. Current State / Open Work

### Dependabot backlog: triaged and closed out (this pass)

All 25 open `dependabot/*` PRs were checked against their actual CI results (not just
categorized by dependency name — three PRs flagged a-priori as highest-risk turned out fully
green, and several "safe-looking" single-app-scoped bumps broke a *sibling* app instead of
their own, via npm workspace hoisting — exactly the `.agents/AGENTS.md` §6 "Workspace Hoisting"
lesson, now with fresh evidence).

- **11 merged** (all-green CI): #130, #131, #135, #136, #137, #138, #143, #144, #148, #149, #150.
- **14 closed**, each with a comment citing the exact failing CI job(s) and why:
  - *Workspace-wide catastrophic* (a major bump splits a peer set across the whole monorepo):
    #134 and #141 (react 18→19, two different directories, same failure), #145 (zod 4), #146 /
    #151 / #142 (testing-library/jest-dom + jsdom majors).
  - *Cross-app breakage from a single-app-scoped bump* (hoisting cracks a sibling app that never
    touched the file): #127, #128, #129, #132, #133, #147, #139, #140.
- **Coordinated follow-up, done in this same pass**: `eslint-config-next` bumped to `16.3.0` in
  `smart-recipe-app` and `travel-packing-app` together (elder-care-planner was already on
  16.3.0 via #144) — the individual per-app Dependabot PRs for this exact bump (#129, #133) had
  each broken a *different* sibling app, so it was done by hand across both remaining apps in
  one commit instead. Full `node scripts/test-app.mjs <App>` gate run for both: unit/lint/
  type-check green for both; E2E 5/5 green for smart-recipe-app, 55/57 for travel-packing-app
  (the one failure, `destination-autocomplete.spec.ts`, reproduces green in isolation with
  `--workers=1` — sandbox worker-contention flake, not a regression; `eslint-config-next` is a
  lint-only devDependency with zero runtime footprint, so it cannot be the cause).
- **#135 (`typescript-eslint` 7→8, grouped across `legal-financial-rag`/`mood-diner`/
  `portfolio-hub`) was CI-green on its own PR branch but broke `master` immediately on
  merge**: all three apps' `Lint & static analysis` step started failing with `TypeError:
  Cannot read properties of undefined (reading 'allowShortCircuit')` — the exact dual-package-
  instance failure `.agents/AGENTS.md` §6's "Workspace Hoisting" lesson already documents,
  now reproduced by a *grouped* Dependabot PR instead of a single-app one. These three apps are
  still on `eslint ^8.57.0`; `@typescript-eslint/eslint-plugin` 8.x's rule loader doesn't pair
  with ESLint 8's under this workspace's hoisted tree. **Fixed in this pass** by reverting
  `@typescript-eslint/eslint-plugin`/`parser` back to `^7.18.0` in all three apps (not a
  partial fix — moving the whole peer set back together, per the lesson). Full
  `test-app.mjs --skip-e2e` gate green for all three afterward. This was caught by directly
  checking master's own CI after the merges landed, not by trusting each PR's own green
  check — the PR-level check and the post-merge state can disagree once several lockfile-
  touching merges land back to back.
- **Still open, deliberately deferred** (real breaking-API migrations, not routine bumps): react
  18→19, zod 4, and the testing-library/jest-dom + jsdom majors. See §5.

This has been a multi-pass mutation-testing sweep across every app in the repo — the first
time `node scripts/run-mutation.mjs --all` was run with real results (the container had no
`node_modules` installed initially; see the gotcha below). Every fix followed the same
discipline: real gap found via mutation testing → test added → full `node scripts/test-app.mjs
<App>` gate run → mutation testing re-run to *prove* the score moved, not just that tests pass.

**Environment gotcha, worth remembering:** a fresh container with no root `node_modules`
makes `npx stryker` silently resolve to an unrelated, wrong npm package literally named
`stryker` (not `@stryker-mutator/core`'s bin), failing with `Cannot find module 'rx'` on
every app. This looks like a mutation-testing bug and isn't — it's a missing `npm install`.
Check for `node_modules` at the repo root before debugging the tool itself.

**A recurring, load-bearing lesson from this pass: filter a file's mutant list by line
number before trusting its raw survived-mutant count as a value signal.** Several files with
huge survived counts (`airlineBaggage.ts`: 618, `generator.ts`: 579, `plannerState.ts`: 197)
turned out to be 90%+ noise from static data tables (airline dimensions, outfit-archetype
palettes, US state lists) that mutation testing cannot meaningfully validate. The `node -e`
snippet below (reads `reports/mutation/mutation.json`, filters by file and line range, prints
status/mutator/location) is how every real gap in this document was found — run it before
writing a single test against a new target:
```js
node -e "
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('projects/<app>/reports/mutation/mutation.json', 'utf8'));
const data = report.files['src/path/to/file.ts'];
const lines = data.source.split(/\n/);
for (const m of data.mutants) {
  if (m.status !== 'Survived' && m.status !== 'NoCoverage') continue;
  console.log(m.status.padEnd(11), m.mutatorName.padEnd(20), 'L'+m.location.start.line, '|', lines[m.location.start.line-1].trim().slice(0,90));
}
"
```

### Mutation scores — before this pass's sweep vs. now

| App | Original | Now | Notes |
|---|---|---|---|
| legal-financial-rag | 50.6% | **67.5%** (full app re-swept, confirmed) + `chunker.ts`'s own fix (51.97%→68.5%) landed *after* that re-sweep, so the true current app score is higher than 67.5% but hasn't been re-confirmed at the app level yet. | sanitizer.ts, piiRedactor.ts, schemas.ts, queryProcessor.ts, auditExporter.ts, chunker.ts all done. The deepest pass of the six. |
| elder-care-planner | 52.9% | App-wide not re-swept; two files confirmed: `explain/build.ts` 35.5%→45.3%, `engine/plan.ts` 37%→**76.7%**, `plannerState.ts` 35.6%→45.3%. | `plan.ts` had **no dedicated test file at all** before this pass. |
| travel-packing-app | 42.6% | App-wide not re-swept; `wardrobeEngine.ts` 34.1%→**63.3%**, `generator.ts` 38.8%→39.7% (mostly data noise), `airlineBaggage.ts`'s real gaps closed (3 of 6; other 3 are dead code). | `wardrobeEngine.ts` had multiple gaps matching `.agents/AGENTS.md`'s own "Multi-Constraint Schedule Fallbacks" lesson directly. |
| mood-diner | 33.6% | App-wide not re-swept; its 5 real logic files combined 36.4%→**57.5%** (`NoCoverage` 79→4). | Was the last fully-untouched app; every one of its 5 files had a distinct kind of never-exercised branch. |
| smart-recipe-app | 29.3% | App-wide not re-swept; `recommend.ts` 48.5%→**62.7%** (all 13 `NoCoverage` mutants closed). | |
| portfolio-hub | n/a — cannot run | Still cannot run. | See below — structural, not fixed. |

**Why app-wide numbers above say "not re-swept": each is a genuine confirmed file-level
improvement, verified by re-running `node scripts/run-mutation.mjs <App> --mutate "<file>"`
after adding tests — that's the real proof. Re-running the FULL app sweep afterward (`node
scripts/run-mutation.mjs <App> --full`, no `--mutate` filter) would just re-confirm the same
numbers at a coarser grain, at real wall-clock cost (each full sweep is 5-20+ minutes) for no
new information. Do this before quoting a final app-wide number publicly, but it is not
blocking further work.**

`portfolio-hub` still cannot be mutation-tested: `caseStudiesData.test.ts` and
`loopStats.generated.test.ts` deliberately read the real root-level `scripts/harness-status.mjs`
and `.agents/AGENTS.md` (via a `REPO_ROOT` climb) to keep the hub's displayed stats honest, but
Stryker's per-app sandbox (`.stryker-tmp`) only mirrors that app's own directory, so the dry run
fails with `ENOENT` on the misresolved repo-root file. Structural limitation, not a bug in the
app's tests — no action taken.

**Pure-data files to keep ignoring** when picking a next target (mutating a hardcoded string
literal in these is never a real gap): `mood-diner/data/restaurantsData.ts`,
`legal-financial-rag/lib/datasets/authenticSampleDocs.ts`,
`travel-packing-app/utils/suitcaseDatabase.ts`, `travel-packing-app/utils/generator.ts`'s
`PALETTES`/`COLOR_MATCHES`, `elder-care-planner/plannerState.ts`'s `US_STATES`,
`smart-recipe-app/lib/data.ts`.

### A real bug found, not just a coverage gap: `legal-financial-rag/rag/chunker.ts`

Mutation testing led to a genuine correctness bug: `chunkDocument()` updated
`currentPage`/`currentSectionTitle` from a paragraph's own markers **before** deciding whether
to flush the buffer built from *earlier* paragraphs, so every non-final chunk in a multi-page
or multi-section document was stamped with the page/section belonging to the paragraph that
triggered the split — not to its own content. A chunk whose content was entirely page-1,
Section 4.02 text got tagged "page 2, Section 6.08". In a legal/financial RAG tool whose whole
point is citing the right page and section, this mislabeled every citation except the last
chunk of every split document. Fixed by reordering: flush the pending buffer using the
*current* (correct-for-its-own-content) page/section before reading the new paragraph's
markers. An existing assertion in `unit.test.ts` had encoded the bug (asserted
`chunks[0].sectionTitle` contained "Section 4.02", which was only true because of the bug) —
corrected to check `chunks[1]`, where that content actually lives. `chunker.ts`:
51.97%→68.50% (60→39 survived).

### Harness self-improvement: `harness-learn.mjs` and `emit-tasks.mjs` now self-tested

These were the last two scripts in `scripts/` without a `*.test.mjs` — notable because
`harness-learn.mjs`'s entire job is enforcing that every *other* guardrail carries a
self-test. Neither was structured to be testable (both ran their real logic, including file
I/O and `execFileSync`, unconditionally at module scope). Refactored both to the pattern
`harness-status.mjs`/`check-doc-claims.mjs` already use: pure functions exported, CLI-only
side effects guarded behind `process.argv[1] === fileURLToPath(import.meta.url)`. CLI output
verified byte-identical before/after. `harness-learn.test.mjs` (16 cases) and
`emit-tasks.test.mjs` (19 cases) added, both zero-dependency.

### Infra fix: `.gitignore`

Running mutation testing left `projects/<app>/reports/stryker-incremental.json` untracked in
every app — the original rule only excluded `**/reports/mutation/` (one level down). Fixed by
broadening to `**/reports/`.

### Also fixed: `portfolio-hub`'s stale `loopStats` fixture

`lessonCount` recomputed to `44` against a committed fixture of `43` (found while babysitting
an earlier PR, left open since). Ran `node scripts/generate-loop-stats.mjs`, committed the
regenerated fixture. Confirmed green.

### Deliberately left open — each needs a human decision, not a drive-by fix

- **`legal-financial-rag/piiRedactor.ts`'s bank/IBAN regex caps the matched value at 18
  characters**, so a real full-length IBAN (15-34 chars per ISO 13616) is silently never
  detected or redacted at all. Widening the cap is a product decision (how long is too long
  before it starts over-matching unrelated text) — flagged in a test comment, not patched.
- **`legal-financial-rag/auditExporter.ts`'s markdown ledger table omits each entry's
  `details` field entirely** (only Timestamp/UserRole/Action/Hash are shown), even though
  `details` is a required field on `AuditLogEntry` meant to describe what happened. Possibly a
  real gap in a compliance report; possibly intentional brevity. Needs a product call.
- **`legal-financial-rag`'s vault lock** gates the UI with real passphrase verification but
  doesn't encrypt document content at rest in React state — a larger redesign needing a spec
  update first per `.agents/AGENTS.md` §1's "no vibe coding" rule.
- **Three deferred major-version migrations** (see the Dependabot section above) — react
  18→19, zod 4, and the testing-library/jest-dom + jsdom majors. Each needs real code changes
  for breaking APIs, not just a version bump; each PR's `dependabot/*` branch is still open on
  GitHub for reference but was closed as a merge candidate. Scope each as its own deliberate
  piece of work rather than folding into a routine dependency pass.
- **`portfolio-hub`'s Stryker-sandbox incompatibility** (above) — would need Stryker config
  changes (e.g. a custom sandbox that mirrors the repo root, not just the app directory) outside
  the scope of a normal test-writing pass.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — this is the authoritative gate; run it before every
  push, not just on CI. **Always run this, not just `npx vitest run`** — this pass caught two
  real TypeScript errors (a missing required schema field, an implicit `this` type) that only
  the gate's type-check step surfaced; plain `vitest run` passed both times.
- Mutation score for one app: `node scripts/run-mutation.mjs <AppName>` (informational, never
  blocks; incremental by default, add `--full` to ignore the cache). For a fast, targeted
  re-check of just the file(s) you're working on: `cd projects/<app> && npx stryker run
  --mutate "src/path/to/file.ts"` — seconds to a couple of minutes instead of the full app.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.
- Checked-in docs match what they claim: `node scripts/check-doc-claims.mjs --gate`.
- Harness scripts' own self-tests: `node scripts/<name>.test.mjs` for any script in `scripts/`
  (all of them now have one).

## 5. Next Steps for the Next Agent

1. **Before picking a target, filter its mutant list by line number** (see §3's `node -e`
   snippet) — do not trust a raw survived-mutant count.
2. **Confirm final app-wide mutation scores** for `elder-care-planner`, `travel-packing-app`,
   `mood-diner`, and `smart-recipe-app` with a full `node scripts/run-mutation.mjs <App>
   --full` sweep each (5-20+ min per app) — every fix this pass was verified at the file level;
   nobody has re-confirmed the coarser app-level number since. Not urgent, but do it before
   quoting a number publicly.
3. **Remaining mutation-testing targets, roughly in order of remaining real (non-data-noise)
   gap size** — all of these are now past the point of dramatic wins; expect smaller,
   narrower-permutation gaps from here:
   - `elder-care-planner/plannerState.ts` — still 180 survived, but the real-logic slice (once
     `US_STATES` is filtered out) is much smaller; re-run the line-number filter to see what's
     actually left after this pass's `makeFacility`/`withFacilityAdopted` fixes.
   - `elder-care-planner/explain/build.ts` — ~79 `ConditionalExpression`/~38
     `EqualityOperator` survivors remain after two batches, mostly narrower permutations of
     branches already partly covered (confidence-tier text, `cheaperOption` branches). Point of
     diminishing returns; a third batch is optional.
   - `legal-financial-rag`'s remaining files: `vectorEngine.ts`, `encryption.ts`,
     `hashChain.ts`, `memoryZeroizer.ts`, `vaultAuth.ts` — none have been touched this pass and
     are all real logic (no data-table trap expected, but check anyway).
   - `travel-packing-app/generator.ts`'s real (non-`PALETTES`) logic is now close to fully
     covered; not worth another pass.
4. Scope and execute the three deferred major-version migrations (react 18→19, zod 4,
   testing-library/jest-dom + jsdom) as separate, deliberate pieces of work — see §3. Watch for
   new Dependabot PRs re-accumulating and triage by actual CI result, not by dependency name.
5. Make the two deliberately-deferred product decisions in §3 (IBAN cap width, whether the
   audit ledger table should show `details`) or explicitly decide "not now" and say so.
6. Consider whether `legal-financial-rag`'s vault lock should extend to actually encrypting
   document content at rest — needs a spec update first per `.agents/AGENTS.md` §1's "no vibe
   coding" rule, not a drive-by fix.
7. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
8. If a top-level folder is added or removed, run `/icm-sync` (`.claude/skills/icm-sync/`) to
   keep `IDENTITY.md`'s folder map and `CONTEXT.md`'s routing table from drifting.
9. Two process notes worth carrying forward from this pass:
   - **When writing a browser-API test (Blob, `URL.createObjectURL`, DOM events, etc.), check
     what the test environment actually supports before assuming it needs a mock** — jsdom
     handled `Blob`/`URL.createObjectURL` natively with no setup at all.
   - **A "before/after mutation score" claim is only real if you re-ran mutation testing after
     the fix** — several fixes in this pass initially looked complete under `vitest run` alone,
     but the actual proof (and, twice, a real bug in the *test* itself — a wrong fixture, a
     rounding-boundary-fragile assertion) only surfaced on the mutation re-run.
