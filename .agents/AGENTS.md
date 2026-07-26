# AI Harness Control Layer - Rules for Agents

As an AI agent operating within this repository, you must strictly adhere to the following Spec-Driven Development (SDD) rules:

## 1. Spec is the Single Source of Truth
- **NEVER** write code or generate new features without first reading the corresponding specification in the `specs/` directory.
- The specification dictates architecture, data models, and acceptance criteria.
- **Contract-First Schema Validation**: All application data models must be defined as runtime Zod schemas (`zod`) from which TypeScript types are inferred (`z.infer<typeof Schema>`), guaranteeing runtime data integrity across local storage, API imports, and component props.
- If the user asks you to implement something that contradicts the spec, you MUST notify the user of the contradiction and ask if the spec should be updated.

## 2. No "Vibe Coding"
- Do not make arbitrary architectural decisions on the fly.
- If a requirement is ambiguous or underspecified, **STOP** and ask the user for clarification, or update the specification file and ask for approval before writing the implementation.

## 3. Harness Engineering / Feedback Loops
- If you make a mistake or encounter a bug during implementation, do not just fix the code. You must also consider if a rule, test, or clarification needs to be added to the spec or to this `AGENTS.md` file to prevent the mistake from happening again.

## 4. Work in the Correct Directory
- This is a monorepo. All applications live in the `projects/` directory.
- Ensure your terminal commands and file edits are scoped to the correct `projects/<app-name>` directory.

## 5. Mandatory Testing & Verification (CI/CD)
- You must write unit tests (Vitest) for all core logic.
- You must write End-to-End (E2E) tests using Playwright for critical user flows.
- **BDD Specification Standard**: All E2E and Unit test scenarios must follow Behavior-Driven Development (BDD) formatting (`Given [Context] -> When [User Action] -> Then [Expected Outcome]`).
- You must enforce strict Accessibility (a11y) rules using `@axe-core/playwright` within the E2E tests.
- After implementing a feature, you **MUST** run the master verification script: `node scripts/test-app.mjs <AppName>` (cross-platform; `.\scripts\test-app.ps1 -AppName <AppName>` is a thin wrapper around it). Run it *before* pushing — the whole point of the Node port is that the authoritative gate no longer needs `pwsh`, so "CI will tell me" is not an acceptable substitute for running it.
- You cannot consider a feature complete unless the app passes all Security, Privacy, Optimization, A11y, and Functionality checks within the test script.
- **Automated Build Cleanup**: Every build and test cycle MUST include automated pre-build and post-build cleanup of stale build caches (`.next`, `dist`, `build`, `tsconfig.tsbuildinfo`) and temporary test outputs (`playwright-report`, `test-results`) via `npm run clean` and `.\scripts\clean-app.ps1`.
- **Mandatory Remote Deployment Verification**: Whenever initiating or triggering remote CI/CD workflows or cloud deployments (e.g., GitHub Actions workflows, Vercel builds), agents MUST NOT report completion immediately or poll rapidly in a loop. Instead, set a scheduled reminder (~5 minutes) using `schedule` to check job status after sufficient build time, confirming `completed success` before reporting completion to the user.
- **No Local Server Runs During Deployment Waits**: When waiting for live GitHub Pages or remote CI/CD builds to finish, agents do NOT need to launch or maintain local dev servers (`npm run dev`) or test servers locally; rely on scheduled reminder timers (`schedule`) and direct remote HTTP status checks.

## 6. Learned Lessons & Best Practices
- **Authentic Real-World Datasets**: When building recommendation engines, prioritize authentic real-world data (real addresses, actual Google/Yelp ratings, real menus & pricing) and provide a live import mechanism so users can work with real locations.
- **Vitest vs. Playwright Test Separation**: Always explicitly set `include: ['src/**/*.test.ts']` and `exclude: ['e2e/**']` in `vite.config.ts` so Vitest does not attempt to execute Playwright `e2e` specs.
- **Modal Component State Sync**: When opening modals with contextual initial tab props (e.g. "Book Table" vs "Menu"), assign a unique `key` (e.g. `key={restaurantId + tab}`) to force a clean remount of modal state.
- **Playwright Strict Mode Selectors**: In Playwright E2E tests, scope selectors tightly to containers (e.g. `.modal-content h2`) to prevent duplicate matching when identical headings exist on background cards.
- **Dynamic Generator & E2E Fixture Decoupling**: When switching from static mock data to dynamic generator logic (e.g. Archetype generation), update Playwright E2E tests to assert generic structural elements rather than hardcoded fixture strings (e.g. specific item names), ensuring tests remain resilient to generator changes.
- **Multi-Constraint Schedule Fallbacks**: When applying layered strict filters (weather warmth, time-of-day, color clash, hot-weather dark exclusions), always provide cascading fallbacks so itinerary days never receive empty schedules when constraints are overly restrictive.
- **Monorepo Dev Server Port Collisions**: When running Next.js or other dev servers in a monorepo testing harness, explicitly define a unique port (e.g., `npm run dev -- -p 3005`) in `playwright.config.ts` to prevent silent port collisions with other background projects that could cause E2E tests to execute against the wrong application.
- **Accessibility (a11y) Color Contrast**: When designing premium UIs with bright primary/secondary colors (like Emerald or Amber) against white text, standard shades (e.g. 500/600) often fail WCAG 2.0 AA minimum contrast ratios (4.5:1). Always use darker variants (e.g., Emerald 700 `#047857`, Amber 800 `#9a3412`) to ensure `@axe-core/playwright` accessibility checks pass seamlessly.
- **Accessibility (a11y) Tablist ARIA Scoping**: When implementing tabbed navigation components with `role="tab"`, `@axe-core/playwright` strict WCAG accessibility checks enforce `aria-required-parent` requiring the parent container element to explicitly declare `role="tablist"` (e.g. `<div className="nav-tabs" role="tablist">`).
- **Strict TypeScript in Harness** `[guardrail: explicit-any]`: When executing the `test-app.ps1` harness, always define explicit interfaces for data models rather than using `any`, as the harness strictly enforces ESLint `@typescript-eslint/no-typescript-eslint/no-explicit-any` rules.
- **Mobile PWA Viewport Accessibility** `[guardrail: viewport-no-zoom]`: When configuring `<meta name="viewport">` for mobile PWA standalone apps, avoid setting `user-scalable=no` or `maximum-scale=1.0`, as `@axe-core/playwright` flags this as a WCAG 1.4.4 text zoom violation. Use `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- **Fast Refresh Export Scoping**: In Vite React apps, add `/* eslint-disable react-refresh/only-export-components */` when exporting non-component context hooks alongside context providers in shared provider files.
- **Next.js Static Export Server Action Scoping**: In Next.js static exports (`output: 'export'`), Node filesystem calls and Server Actions (`'use server'`) fail static page generation during `next build`. Refactor server actions to browser-compatible storage (`localStorage`) and import functions directly inside `'use client'` components rather than passing functions as props across server/client component boundaries.
- **PWA Service Worker Subpath Scoping** `[guardrail: root-service-worker]`: In Vite/React PWA applications deployed under subfolder paths on static hosts like GitHub Pages (`/agentic-app-harness/mood-diner/`), registering root `/sw.js` or caching root `/index.html` causes 404 cache failures. Use dynamic `self.location.pathname` in `sw.js` and `window.location.pathname + 'sw.js'` in `index.html` to guarantee subpath compatibility.
- **Node WebCrypto TypedArray Buffer Normalization** `[guardrail: pbkdf2-salt-buffer]`: When deriving WebCrypto keys via `subtle.deriveKey` with `PBKDF2`, passing `saltBytes.buffer` as `salt` fails in Node.js 20 WebCrypto bindings with `TypeError: 'salt' of 'Pbkdf2Params' is not instance of ArrayBuffer`. Pass a fresh `new Uint8Array(saltBytes)` cast as `BufferSource` to guarantee cross-platform compatibility across both browser and Node.js WebCrypto runtimes.
- **Harness CI Dependency Guarding**: In monorepo CI scripts where a top-level `npm install` runs before subproject test scripts, subproject `test-app.ps1` scripts must check for specific test runner binaries (e.g., `if (-Not (Test-Path "node_modules/@playwright/test"))`) rather than generic `if (-Not (Test-Path "node_modules"))` to ensure devDependencies are installed even if `node_modules` already exists.
- **Responsive Grid Layouts** `[guardrail: responsive-grid]`: Apps must render on phones. Never ship a fixed multi-track **inline** grid — `style={{ gridTemplateColumns: '1fr 1fr' }}` (or `'1fr 2fr'`, `'200px 1fr'`, …) — because inline styles cannot be overridden by media queries, so the grid never collapses on narrow screens. Never use a fixed `minmax()` basis of 300px or more, which overflows phone viewports. Instead use `repeat(auto-fit, minmax(min(BASIS, 100%), 1fr))` (collapses gracefully and never overflows), or a responsive class with a `@media` breakpoint. A `grid-template-columns` value in a CSS file is exempt from the guardrail because it can be handled by an accompanying media query — but it still must actually be handled.
- **Test the Artifact You Ship, at Every Origin It Ships To**: A Playwright suite pointed only at the dev server proves nothing about the production bundle — the dev server rewrites away exactly the deploy-specific configuration (`base`, asset URLs, minified chunk names) that breaks a real deployment. An app that ships to more than one origin needs a smoke test that loads the **built** output at **each** origin, and asserts on failed requests (`response.status() >= 400`), not just on rendered text. Serve each origin on its **own port**: one server answering several mounts will resolve an asset URL pinned to the wrong origin and pass on an app that is broken in production. Prove such a test works by mutation — reintroduce the bug and confirm the test actually fails — because a smoke test that silently passes on a broken build is worse than none. See `projects/mood-diner/e2e/production-bundle.spec.ts`. This is now mechanically sensed: `senseProductionBundleTest` reports any app whose Playwright `webServer` entries only ever run a dev server, and `scripts/serve-dist.mjs` is the shared server so adopting it is a config line rather than new code. The stand-in server must **resolve URLs the way the real host does** — GitHub Pages serves `/recipes` from `recipes.html`, and a Next.js static export prefetches exactly those extensionless paths, so a server that only tried the literal path reported four 404s the live site never produces. A smoke test that cries wolf gets muted, which is worse than not having one; but resolve only the *requested* path, never a blanket SPA fallback to the root `index.html`, or a misrouted asset URL silently returns HTML and the test passes on a broken build.
- **A Dependency Bump Is Only Safe If Its Peers Move With It**: Single-package automated bumps break a
  monorepo in three recurring ways, all of which took master red at once and killed the Pages deploy at
  its first build step. (1) *Split peer sets* — `react-dom` to 19 while `react` stayed at 18, or
  `@typescript-eslint/eslint-plugin` to 8 while its `parser` stayed at 7: `npm install` then fails
  outright, so nothing downstream even builds. (2) *Majors the toolchain has not adopted* — TypeScript 7
  while `typescript-eslint` still refuses `>=7.0`, and ESLint 10 while `eslint-plugin-react` still calls
  the ESLint 9 context API. (3) *Majors that drop exports* — `lucide-react` 1.x removed brand icons, so
  a `Github` import that type-checked yesterday does not today. The rule: when a bump lands on one half
  of a peer pair, move the whole set together or revert it; and treat a major bump of a *linter, compiler
  or icon set* as an API change to verify, never as a patch. `npm install` succeeding is not the check —
  run the app's full suite, because the ESLint and lucide breakages both installed cleanly and failed at
  lint and type-check.
- **Format a Total and Its Parts at the Same Precision**: An engine that splits an amount to the exact
  cent still looks broken if the UI renders the parts and the total at different precision. Rounding
  three shares of $1,233.33 to whole dollars displays $1,233 × 3 against a total of $3,700 — arithmetic
  the reader can do in their head, and failing it costs more credibility than the rounding saved. Where
  a total and its components are both on screen, format them identically, and assert it in an E2E test
  by parsing the *rendered* strings rather than the engine output: the unit tests passed throughout
  this bug, because the defect was never in the engine. Not tagged as a guardrail — deciding which
  figures constitute a total-and-parts relationship needs human judgement, and a regex over a line
  cannot see that two `formatX` calls in different components feed the same table.
- **Cite Confidence, Not Just Sources**: A dataset where every figure carries the same citation hides
  that some figures are solid and others are guesses. `projects/elder-care-planner/src/lib/data/costOfCare.ts`
  tags each entry `verified` (cross-checked against two independent reports), `needs_verification`
  (single secondary summary) or `derived` (not a surveyed category), and the UI surfaces the tag next to
  the number. This is what makes it possible to ship an incomplete dataset honestly instead of either
  stalling or laundering a weak figure into a confident one. The same discipline says what to do about
  gaps: where no verified state-level figure existed, the app falls back to the national median and
  *says so*, rather than interpolating a plausible-looking number.
- **Explain the Arithmetic Without Re-implementing It**: When an app shows its working — a
  "how was this calculated?" panel, a derivation table, a methodology page — the explanation must
  be *built from engine output*, never recomputed alongside it. A second implementation of the
  same formula passes review on the day it is written and then drifts the first time the engine
  changes, and a confidently wrong derivation is worse than none: it is the app being caught out
  by the very transparency it offered. `projects/elder-care-planner/src/lib/explain/` reads every
  cents value out of a `CostBreakdown`, `RunwayResult`, `BreakEvenResult` or `SplitResult`, and
  the unit tests assert correspondence in both directions — each derivation's stated result equals
  the engine's figure, *and* adding a fee moves the derivation by exactly that fee rather than
  leaving it stale. Two further rules make such a panel trustworthy rather than decorative.
  (1) *The parts must sum to the total as rendered*, which means parsing the formatted strings in
  the test, not the engine output — the same discipline as the total-and-parts lesson above, and
  the exact check a sceptical reader performs the moment the panel invites them to. (2) *A clamp
  is a step, not a silent discrepancy*: where a figure is floored (a funding gap that cannot go
  below zero), show the clamp as its own line, or the arithmetic visibly fails to balance in
  precisely the case where the user is most relieved and least expecting an error. Both were
  proven by mutation — dropping the add-on rows and disabling the clamp each fail the suite. Not
  tagged as a guardrail: no regex can tell whether a number was read from an engine result or
  recomputed from the same inputs, which is the whole distinction.
- **Capacitor Absolute Base Path** `[guardrail: capacitor-absolute-base]`: An app that ships a Capacitor/Android container must never hardcode its static-host deploy subpath as the bundler `base` / `basePath` (e.g. `base: '/agentic-app-harness/mood-diner/'`). Capacitor serves the built bundle from `https://localhost/` inside the Android WebView, so every `/agentic-app-harness/...` asset URL 404s and the app boots to a blank white screen. The trap is that the *same* build is correct on GitHub Pages — so web CI, Playwright, and the live Pages deploy all stay green while the shipped Android artifact is dead on arrival. Use a relative `base: './'`, which resolves correctly under both the Pages subpath and the WebView origin. The guardrail is scoped via `appliesTo` and does not fire on web-only apps, where an absolute subpath base is the right answer.

## 7. Mandatory Session Wrap-up & Continuous Learning
- **Update Documentation & READMEs**: At the end of every session or major milestone, and whenever new features are added, agents MUST update all relevant `README.md` files and `.md` documentation (e.g., project specifications in `specs/`, walkthroughs, implementation plans, and project READMEs) to accurately reflect the latest project state, feature set, architecture, and live deployment endpoints.
- **Create Agent Handoff File**: Agents MUST create or update a dedicated handoff file (e.g., `HANDOFF.md` in the project root or relevant app directory) detailing current project state, key changes, open bugs/blockers, and exact next steps so any future AI agent can seamlessly take over the work without loss of context.
- **Execute Learning Loop (`/learn`)**: Agents MUST systematically review session outcomes, extract new lessons, anti-patterns, or edge cases discovered during execution, and persist them into `AGENTS.md` (or as updated rules and skills) after every session to guarantee continuous improvement across future sessions.
- **Prefer Guardrails over Prose**: When a lesson is mechanically detectable, do not stop at documenting it here — encode it as a guardrail in `scripts/harness-status.mjs` so the harness catches the regression deterministically instead of relying on the next agent reading this file. Prose is the fallback for lessons that cannot be automated.

## 8. The Agentic Loop (Sense → Propose → Act → Verify → Learn)
The harness closes its own improvement loop without any embedded LLM or API key — the AI agent is a pluggable actuator, not a hardcoded dependency.
- **Sense** (`node scripts/harness-status.mjs` / `.\scripts\harness.ps1 status`): deterministically scans every app for missing artifacts, contract/BDD gaps, spec drift (unchecked spec features), and guardrail violations, writing `harness-status.json`.
- **Propose** (`node scripts/emit-tasks.mjs` / `.\scripts\harness.ps1 tasks`): turns each finding into a self-contained, bring-your-own-agent work order under `tasks/`. See `tasks/README.md` for the contract.
- **Act**: any agent (this one included) may claim an open task in `tasks/`, do the work, and open a PR — **never self-merge**.
- **Verify** (`node scripts/harness-status.mjs --gate` / `.\scripts\harness.ps1 verify`): a blocking CI gate that fails on guardrail regressions and missing specs, while drift/manual-review findings only inform. The guardrails are themselves self-tested (`scripts/harness-status.test.mjs`), so the gate can't silently rot. Re-run `emit-tasks.mjs --prune` to retire resolved work orders.
- **Learn** (`node scripts/harness-learn.mjs` / `.\scripts\harness.ps1 learn`): a blocking gate that enforces a closed traceability loop — every guardrail must carry a `lesson` back-reference and be tagged `[guardrail: <id>]` on its motivating AGENTS.md bullet, and every such tag must resolve to a real, self-tested guardrail. This makes "the harness gets stricter over time" a verifiable invariant, not a good intention.

### Blocking guardrails vs. informational sensors
Not every mechanical check belongs in `GUARDRAILS`. That array is for **line-level
regressions**: its `test(line)` contract is what `harness-status.test.mjs` self-tests,
and every hit **blocks merge**. Some real defects are *absence* checks (a missing
signing config, an unbranded launcher icon, a missing privacy policy) that no regex
over a line can express, and that describe incomplete work rather than a regression.

Those belong in a **sensor** in `senseApp` with a non-blocking `type` — see
`senseMobileRelease` (Play Store release readiness), scoped to apps with a native
container, and `senseProductionBundleTest` (does the E2E suite ever load the built
output?). Both are excluded from `isBlocking` on purpose, so incomplete work informs
without painting unrelated PRs red. Sensors are still self-tested against fixture
trees, so they cannot silently stop reporting, and they still become work orders via
`emit-tasks.mjs`. Promote a sensor check to a guardrail only once it is
line-detectable *and* the repo has decided it must never regress.

### Protocol: adding a learned lesson
When you discover a reusable lesson, decide whether it is **mechanically detectable**:
1. **Mechanical** (a pattern a regex can catch): (a) add a guardrail object to `GUARDRAILS` in `scripts/harness-status.mjs` with a `lesson` field; (b) add a known-bad + known-good case to `scripts/harness-status.test.mjs`; (c) add the lesson bullet to section 6 below and tag it `` `[guardrail: <id>]` ``. Run `.\scripts\harness.ps1 verify` — self-test, learn, and gate must all pass.
2. **Non-mechanical** (needs human judgement): add a plain prose bullet to section 6. Do **not** add a `[guardrail: ...]` tag (there is nothing to enforce it).
Never tag a lesson `[guardrail: <id>]` without a real guardrail of that id — the Learn gate will fail the build.
