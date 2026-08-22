# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Claude Code reads this file first at the repo root. The rules for this repo are the same for every
agent and live in [`AGENTS.md`](AGENTS.md), which in turn imports the full, authoritative rulebook at
[`.agents/AGENTS.md`](.agents/AGENTS.md) — read both before changing any code. `@AGENTS.md` below pulls
that rulebook into context automatically; the rest of this file is a Claude-focused map of commands and
architecture that the rulebook itself doesn't spell out.

@AGENTS.md

## What this repo is

A monorepo of six independent apps, each built and maintained by AI coding agents under the rules in
`.agents/AGENTS.md`, plus a **harness** (`scripts/`) that senses spec/test drift, turns findings into
agent work orders, and gates merges in CI — deterministically, with no embedded LLM. Every app is held
to the same enforced bar: a spec in `specs/` before code, Zod schemas for every data model, BDD-style
Vitest + Playwright + axe tests, and a green `node scripts/test-app.mjs <AppName>` before any push.

**Before exploring the tree yourself**, `IDENTITY.md` and `CONTEXT.md` at the repo root are an
[ICM](https://github.com/ktnCodes/icm-template) orientation layer — a workspace map and a
task-routing table sitting on top of this file's own command/architecture map, not replacing it.
`stages/<stage>/CONTEXT.md` mirrors the loop below one folder per stage
(sense/propose/act/verify/learn); `.claude/skills/{icm-scaffold,icm-sync,icm-context-scaffold}`
maintain that layer as the repo evolves.

## Commands

Root install (npm workspaces — one lockfile for all six apps' shared deps):

```
npm install
```

This also installs a `pre-push` git hook (`node scripts/install-git-hooks.mjs`, wired as the root
`prepare` script) that runs the fast, local, no-network gates — `harness-status.mjs --gate`,
`harness-learn.mjs`, `check-loop-stats.mjs`, `check-peer-consistency.mjs`, `check-doc-claims.mjs
--gate` — before code leaves your machine; see `.githooks/pre-push` for what it deliberately does and
doesn't run. Bypass with `git push --no-verify`; CI runs the full gate regardless.

Per-app commands (run from `projects/<app-name>/`, e.g. `projects/elder-care-planner/`):

```
npm run dev        # dev server (Next.js apps: next dev; Vite apps: vite — see playwright.config.ts
                    # for the exact port each app pins to avoid the monorepo port-collision trap)
npm run build       # npm run clean + framework build (tsc/next build/vite build)
npm run lint        # eslint, --max-warnings 0 on the Vite apps
npm run test        # vitest run — all unit tests
npm run test:watch  # vitest, watch mode (Next.js apps only; Vite apps: npx vitest)
npm run test:e2e    # playwright test — all E2E + a11y specs
npm run clean       # remove .next/dist/build/playwright-report/test-results/tsconfig.tsbuildinfo
```

Single test / single spec (works the same in every app — Vitest and Playwright both accept a path):

```
npx vitest run src/lib/engine/breakeven.test.ts
npx vitest run -t "Given a plan with no savings"   # by test name
npx playwright test e2e/share.spec.ts
npx playwright test e2e/a11y.spec.ts --project=chromium
```

App-specific extras: `smart-recipe-app` has `npm run embed` (rebuilds the recipe corpus embeddings);
`legal-financial-rag` has `npm run eval` (promptfoo retrieval-precision eval — also enforced in CI by
`scripts/rag-eval-gate.mjs`, LLM-free, against a golden query set).

**The authoritative gate** — run this before every push, from the repo root, not per-app scripts in
isolation (it wraps clean → security audit → lint → type-check → Vitest → Playwright + axe a11y, and
installs deps/browsers on demand):

```
node scripts/test-app.mjs <AppName>              # e.g. elder-care-planner, mood-diner, portfolio-hub
node scripts/test-app.mjs <AppName> --skip-e2e    # unit/lint/type-check only, faster local loop
node scripts/test-app.mjs <AppName> --skip-audit
```

`.\scripts\test-app.ps1 -AppName <AppName>` is a thin PowerShell wrapper around the same script — the
Node version is authoritative because it runs on Linux CI runners without `pwsh`.

The harness's own Sense → Propose → Verify → Learn loop (see `.agents/AGENTS.md` §8):

```
node scripts/harness-status.mjs           # sense: scan every app, write harness-status.json
node scripts/harness-status.mjs --gate    # verify: blocking gate (guardrails + missing specs)
node scripts/harness-status.mjs --strict  # also report drift / manual-review findings
node scripts/emit-tasks.mjs               # propose: turn findings into tasks/<id>.md work orders
node scripts/emit-tasks.mjs --prune       # retire work orders whose findings are resolved
node scripts/harness-learn.mjs            # learn: enforce Lesson ⇄ Guardrail ⇄ Self-test traceability
node scripts/harness-status.test.mjs      # self-test the guardrails themselves
node scripts/harness-history.mjs --record # learn: snapshot this commit's per-rule finding counts
node scripts/harness-history.mjs          # learn: report promotion candidates / never-fired guardrails
node scripts/harness-history.test.mjs     # self-test the history analysis (streaks, candidates)
node scripts/check-enum-blast-radius.mjs  # diff-shaped: widened enum/union has an unvisited consumer
node scripts/check-doc-claims.mjs --gate  # verify: checked-in docs (this file included) match what they claim
node scripts/check-guardrail-integrity.mjs --base origin/master --head HEAD
                                           # diff-shaped: "who guards the guards" — blocks a deleted
                                           # guardrail or shrunk gate self-test, silent on additions
node scripts/check-loop-stats.mjs         # verify: committed portfolio-hub loop stats match the rulebook
node scripts/check-peer-consistency.mjs   # verify: no split react/react-dom, @types/*, or
                                           # @typescript-eslint plugin/parser majors, within an app
                                           # or across apps sharing an eslint major (not diff-shaped)
node scripts/check-peer-consistency.test.mjs  # self-test the peer/anchor-group matching
node scripts/install-git-hooks.mjs        # installs the local pre-push gate (root "prepare" script)
node scripts/install-git-hooks.test.mjs   # self-test the installer + the tracked .githooks/pre-push
node scripts/run-mutation.mjs <AppName>   # informational: Stryker mutation score for one app
node scripts/run-mutation.mjs --all       # informational: Stryker mutation score for every app
node scripts/run-mutation.test.mjs        # self-test the mutation-scoring logic
node scripts/harness-status-rdjson.mjs    # bridges guardrail hits to reviewdog rdjsonl (inline PR comments)
node scripts/harness-status-rdjson.test.mjs  # self-test the rdjsonl bridge
node scripts/check-secrets.mjs --base origin/master --head HEAD
                                           # diff-shaped: blocks a committed credential on an added line
node scripts/check-secrets.mjs --tree     # one-time full-tree audit (not diff-shaped)
node scripts/check-secrets.test.mjs       # self-test the secret-pattern matching
node scripts/check-containment.mjs --base origin/master --head HEAD
                                           # diff-shaped: blocks unacknowledged harness infra touches
node scripts/check-containment.test.mjs   # self-test the containment matching
node scripts/check-diff-size.mjs --base origin/master --head HEAD
                                           # diff-shaped: warns at 400, blocks at 800 changed lines
node scripts/check-diff-size.test.mjs     # self-test the diff-size computation
node scripts/check-instruction-tamper.mjs --base origin/master --head HEAD
                                           # diff-shaped sensor: detects rule weakening / gate bypass
                                           # in instruction files and workflows (non-blocking)
node scripts/check-instruction-tamper.test.mjs  # self-test the tamper detection heuristics
node scripts/check-spec-ordering.mjs --base origin/master --head HEAD
                                           # diff-shaped sensor: flags logic changes without a
                                           # matching spec or test touch (non-blocking)
node scripts/check-spec-ordering.test.mjs  # self-test the ordering detection
node scripts/check-readme-freshness.mjs --base origin/master --head HEAD
                                           # diff-shaped sensor: flags source changes without a
                                           # README update (non-blocking)
node scripts/check-readme-freshness.test.mjs  # self-test the README freshness detection
node scripts/generate-context-digest.mjs   # advisory: write .context-digest.json (per-app hashes,
                                           # module counts, guardrail/lesson counts, HEAD commit)
node scripts/generate-context-digest.mjs --diff  # compare saved digest against live state — shows
                                           # which apps' specs/schemas changed since session start
node scripts/generate-context-digest.test.mjs  # self-test the digest generation and diffing
node scripts/emit-github-issues.mjs       # propose (alternate output): findings -> tasks/issues.json
node scripts/emit-github-issues.mjs --upload  # also print the gh CLI bulk-upload loop
node scripts/emit-github-issues.test.mjs  # self-test the issue-shaping logic
```

Mutation testing (`run-mutation.mjs`) and the reviewdog inline-annotation bridge
(`harness-status-rdjson.mjs`) are both informational/additive — see `.agents/AGENTS.md` §8's
"Mutation testing" and "Inline PR annotations" subsections for why each stays outside
`harness-status.mjs`'s fast sense loop and never blocks a merge on its own.
`check-secrets.mjs` is diff-shaped like `check-enum-blast-radius.mjs` but **is** blocking, with no
PR-body escape hatch — see `.agents/AGENTS.md` §11. `check-containment.mjs` blocks unacknowledged
touches to harness infrastructure (scripts, AGENTS.md, CLAUDE.md, CI workflows, git hooks, spec
templates) — name the file in the PR body or use `[containment-override: path]` to pass.
`check-diff-size.mjs` warns at 400 and blocks at 800 net changed lines (excluding generated/lock
files) — add `[large-diff-acknowledged]` to the PR body to override.
`check-instruction-tamper.mjs` is a non-blocking sensor that detects rule weakening (removed
MUST/NEVER/always/mandatory/blocking/required) in instruction files, gate bypass
(`--no-verify`, `continue-on-error: true`, `if: false`) in workflows, and scope expansion
(`exclude:` additions) — informational only, exits 0 always.
`check-spec-ordering.mjs` is a non-blocking sensor that flags apps where logic modules changed
without a matching spec or test file touch — add `[spec-unchanged: reason]` to the PR body to
silence. `check-readme-freshness.mjs` is a non-blocking sensor that flags PRs where app
source or harness infrastructure changed without a corresponding README update — add
`[readme-unchanged: reason]` to the PR body to silence.
`generate-context-digest.mjs` is an advisory-only tool (no CI step, no gate):
it writes a `.context-digest.json` snapshot of per-app spec/schema hashes, module counts, and
guardrail/lesson counts so agents can detect context staleness during long-running sessions —
run it at session start and again with `--diff` before pushing to see what changed.
`emit-github-issues.mjs` is
optional tooling, not part of any gate — see `tasks/README.md`'s "Optional: bulk-import as GitHub
Issues" section.

`.\scripts\harness.ps1 {status|tasks|verify|learn|history}` wraps the same five in one entry point.
`harness-history.json` (git-tracked, unlike the gitignored `harness-status.json` snapshot) is the
per-commit ledger `harness-history.mjs` reads and appends to — see `.agents/AGENTS.md` §8.
`.\scripts\validate-specs.ps1 -Strict` (PowerShell only, no Node port) checks every app has a spec,
README, Zod usage, and BDD-formatted specs — non-strict mode only fails on a missing spec.
`.\scripts\scaffold-app.ps1` scaffolds a new `projects/<app>` with the expected skeleton.
`.\scripts\build-mobile.ps1` builds the Capacitor Android shell for `mood-diner`.

## Architecture

**Monorepo layout** — `projects/*` is an npm workspace; each app keeps its own `package.json` and
independent dependency versions (deliberately: see the two peer-set lessons in `.agents/AGENTS.md` §6
about why apps are *not* forced onto one shared version). Six apps:

| App | Stack | Notes |
|---|---|---|
| `portfolio-hub` | Vite + React 19 | Master showcase portal linking the other five |
| `mood-diner` | Vite + React 18 + Capacitor | Restaurant recommender/booking; also ships as an Android app |
| `travel-packing-app` | Next.js 16 + React 19 | Packing optimizer; ONNX/background-removal in-browser ML |
| `smart-recipe-app` | Next.js 16 + React 19 | Recipe manager; local embedding corpus (`@huggingface/transformers`) |
| `legal-financial-rag` | Vite + React 18 | 100% client-side RAG, no network calls; PBKDF2 + tamper-evident hash chain |
| `elder-care-planner` | Next.js 16 + React 19 | Cost/runway planner; every headline figure carries a confidence tag and a derivation trail |

**Spec-driven flow**: `specs/<app-name>-spec.md` is read *before* any code change to that app — it
dictates data models, architecture, and acceptance criteria, and a contradiction between a request and
the spec is a stop-and-flag, not a judgment call. `specs/templates/` holds the spec format itself.

**Contract-first data**: every app defines its models as Zod schemas (typically `src/lib/schemas.ts` or
`src/schemas.ts`) and infers TypeScript types via `z.infer<typeof Schema>`; untrusted input (storage,
imports) is validated at that boundary, not trusted implicitly.

**Test layout**: unit tests live beside the logic they cover under `src/lib`, `src/utils`, `src/services`,
`src/engine`, `src/data`, etc. (`*.test.ts`, Vitest, `Given/When/Then` in the test names/descriptions);
E2E specs live in `e2e/*.spec.ts` (Playwright + `@axe-core/playwright`). `vite.config.ts` explicitly sets
`include: ['src/**/*.test.ts']` / `exclude: ['e2e/**']` so Vitest never tries to execute Playwright specs.
Components/pages (`.tsx`) are deliberately not unit-tested — that coverage is Playwright + axe's job.

**The agentic loop** (full detail in `.agents/AGENTS.md` §8): `harness-status.mjs` senses missing
artifacts, spec drift, and
<!-- doc-claim: cmd="node scripts/count-guardrails.mjs" -->
**10** line-level "guardrails" distilled from real bugs (each one traces to a
prose lesson in `.agents/AGENTS.md` §6); `emit-tasks.mjs` turns findings into self-contained work orders
under `tasks/`; any agent claims one, does the work, opens a PR (**never self-merges**); the gate reruns
on every PR via `.github/workflows/sdd-sentinel.yml`. Guardrails are self-tested
(`harness-status.test.mjs`) and `harness-learn.mjs` blocks a guardrail from existing without a traced
lesson, so the enforcement can't silently rot or silently expand past what's documented.

**CI** (`.github/workflows/`): `ci.yml` runs `node scripts/test-app.mjs <app>` as one parallel matrix leg
per app on `ubuntu-latest`. Every leg still instantiates so all six `test (<app>)` status checks always
report (branch protection stays intact), but each leg first diffs against the PR base / previous push
tip and **skips its expensive suite** when neither that app (`projects/<app>/**`, `specs/<app>-spec.md`)
nor shared infrastructure (root `package.json`/lockfile, `scripts/`, `.agents/`, `AGENTS.md`,
`CLAUDE.md`, `specs/templates/`, `tsconfig*.json`, `ci.yml`) changed — a shared-infra change still
rebuilds all six, because one lockfile and one hoisted `node_modules` mean a change there can break any
app. `sdd-sentinel.yml` runs the harness gate plus `check-enum-blast-radius.mjs`,
`check-doc-claims.mjs --gate` (checked-in docs must match what they claim),
`check-guardrail-integrity.mjs` ("who guards the guards" — blocks a silently deleted guardrail or
shrunk gate self-test), `check-containment.mjs` (harness infrastructure touches must be acknowledged
in the PR body), `check-diff-size.mjs` (warns at 400, blocks at 800 net changed lines),
`check-loop-stats.mjs` (committed portfolio-hub loop stats match the
rulebook), `check-peer-consistency.mjs` (no split react/react-dom, `@types/*`, or
`@typescript-eslint` plugin/parser majors, within an app or across apps sharing an `eslint` major —
apps differing from *each other* stays fine by design), `validate-specs.ps1 -Strict`,
three non-blocking sensors — `check-instruction-tamper.mjs` (detects rule weakening and gate bypass
in instruction/workflow files), `check-spec-ordering.mjs` (flags logic changes without a
matching spec or test touch), and `check-readme-freshness.mjs` (flags source changes without a
README update) — and a
reviewdog step that posts every
guardrail hit as an inline PR comment (`harness-status-rdjson.mjs`, informational, never blocks)
on every PR; `mutation-testing.yml` runs `run-mutation.mjs` per app as its own informational,
`continue-on-error` matrix job; `deploy-pages.yml` and `android-release.yml` build and ship
the live artifacts (GitHub Pages, and the `mood-diner` Android APK) — both already run on `ubuntu-latest`,
which is why `ci.yml` does too rather than paying for a Windows runner to exercise the `.ps1` wrapper.
`deploy-pages.yml` assembles the full combined Pages artifact on every `master` push, but path-filters
via a **per-app build cache**: each app's built output is cached under a content hash of its own source
tree plus the root lockfile, so an unchanged app is restored rather than rebuilt (the heavy Next.js/ML
builds only run when that app or a shared dependency changed) while the uploaded site stays complete —
building only the changed app would delete the other five from production. `release.yml` cuts an
**independent, versioned release for a single app** when a tag shaped
`<app>-v<version>` is pushed (e.g. `elder-care-planner-v1.2.0`), or via `workflow_dispatch` — it resolves
the app from the tag, builds only that app against the shared root lockfile, zips its build output
(`out/` for the Next.js apps, `dist/` for the Vite apps), and publishes a GitHub Release via the
pre-installed `gh` CLI. One file rather than six (unlike the per-app `android-release-<app>.yml`) because
a web release carries no per-app signing secrets to separate.

**ICM navigation layer** (`IDENTITY.md`, `CONTEXT.md`, `_config/`, `stages/`): a five-layer
[Interpretable Context Methodology](https://github.com/ktnCodes/icm-template) overlay, additive to
everything above it. `stages/{sense,propose,act,verify,learn}/CONTEXT.md` restates the Agentic Loop
above as per-stage contracts (reads/runs/writes), and each stage's `output/README.md` points at
that stage's real artifact (`harness-status.json`, `tasks/*.md`, a PR, CI status,
`harness-history.json`) instead of duplicating it. `_config/{conventions,glossary,voice}.md` link
back to this file and `.agents/AGENTS.md` rather than restating them. Run `/icm-sync` (a project-scoped
skill in `.claude/skills/`) after any change that adds/removes a top-level folder, to keep
`IDENTITY.md`'s folder map and `CONTEXT.md`'s routing table from drifting out of sync with disk.

## Conventions worth knowing before you open a PR

These are the ones §9 of `.agents/AGENTS.md` exists because a real PR got wrong — see that section for
the full evidence:

- **Report what a command printed, not what you expect it to print.** Paste real gate output; "CI will
  catch it" is not a substitute for running `node scripts/test-app.mjs <AppName>` yourself.
- **Widening a `z.enum`/union obliges a full-repo grep** (`grep -rln "<TypeName>" projects/<app>/src/`)
  and a note on every consumer file in the PR body — `check-enum-blast-radius.mjs` enforces this in CI.
- **A new case kind needs a fixture in every existing sweep** that enumerates cases (table-driven tests,
  invariant checks across fixtures), or the suite stays green by not looking at the new case.
- **Prove a new test can fail**: break the implementation once, watch the test go red, restore it, state
  the mutation and result in the PR body. An `expect()` with no matcher or a tautological type assertion
  is not coverage.
- Discovered a reusable lesson? It goes in `.agents/AGENTS.md` §6, and — if it's mechanically detectable
  — as a self-tested guardrail in `scripts/harness-status.mjs` too. The protocol is in §8.
