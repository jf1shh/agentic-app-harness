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

## Commands

Root install (npm workspaces — one lockfile for all six apps' shared deps):

```
npm install
```

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
node scripts/check-enum-blast-radius.mjs  # diff-shaped: widened enum/union has an unvisited consumer
node scripts/check-doc-claims.mjs --gate  # verify: checked-in docs (this file included) match what they claim
```

`.\scripts\harness.ps1 {status|tasks|verify|learn}` wraps the same four in one entry point.
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
**7** line-level "guardrails" distilled from real bugs (each one traces to a
prose lesson in `.agents/AGENTS.md` §6); `emit-tasks.mjs` turns findings into self-contained work orders
under `tasks/`; any agent claims one, does the work, opens a PR (**never self-merges**); the gate reruns
on every PR via `.github/workflows/sdd-sentinel.yml`. Guardrails are self-tested
(`harness-status.test.mjs`) and `harness-learn.mjs` blocks a guardrail from existing without a traced
lesson, so the enforcement can't silently rot or silently expand past what's documented.

**CI** (`.github/workflows/`): `ci.yml` runs `node scripts/test-app.mjs <app>` as one parallel matrix leg
per app on `ubuntu-latest`; `sdd-sentinel.yml` runs the harness gate plus `check-enum-blast-radius.mjs`,
`check-doc-claims.mjs --gate` (checked-in docs must match what they claim), and `validate-specs.ps1
-Strict` on every PR; `deploy-pages.yml` and `android-release.yml` build and ship
the live artifacts (GitHub Pages, and the `mood-diner` Android APK) — both already run on `ubuntu-latest`,
which is why `ci.yml` does too rather than paying for a Windows runner to exercise the `.ps1` wrapper.

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
