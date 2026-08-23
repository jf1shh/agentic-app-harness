# AI Harness Control Layer - Rules for Agents

As an AI agent operating within this repository, you must strictly adhere to the following Spec-Driven Development (SDD) rules:

> **Navigation layer**: [`IDENTITY.md`](../IDENTITY.md) and [`CONTEXT.md`](../CONTEXT.md) at the repo
> root (plus `_config/` and `stages/`) are a five-layer [ICM](https://github.com/ktnCodes/icm-template)
> orientation layer sitting on top of this rulebook, not a substitute for it — read them first for a
> workspace map and a task-routing table, then come back here for the rules themselves. `stages/`
> restates §8's loop as one `CONTEXT.md` contract per stage; maintain the layer with the project-scoped
> `.claude/skills/{icm-scaffold,icm-sync,icm-context-scaffold}` skills as the repo evolves.

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
- **Unit-Test-Driven Development (the order of operations)**: for every change to a
  logic module — anything under `src/lib`, `src/utils`, `src/services`, `src/engine`,
  `src/core`, `src/domain`, `src/data`, `src/hooks`, `src/store`, `src/state`, or a
  top-level `src/*.ts` — write the failing unit test **first**, watch it fail, then make
  it pass. The order is not ceremony: a test written after the code is a test written
  against the code you happened to produce, and §9.4 exists because a test that has
  never been red is a claim about coverage rather than coverage. The three steps, and
  what each one is for:
  1. **Red** — add the case and run `npx vitest run` in `projects/<app>`. If it passes
     before you have written the implementation, the test is asserting something the
     code already does and is not the test you meant to write.
  2. **Green** — write the smallest implementation that satisfies it.
  3. **Prove** — for any behaviour you claim to protect, break the implementation once,
     confirm the test goes red, restore it. State the mutation and its result in the PR
     body (§9.4). This is the same discipline as the guardrail self-tests: the thing
     that gates merges is itself gated.
  Components, pages and routes (`.tsx`) are deliberately **out** of this rule — they are
  covered by Playwright and `@axe-core`, and demanding a unit test per React component
  would describe a testing strategy this repo has not chosen.
- **Backfilling coverage on a module that already works is the exception, and it is only
  the exception to step 1.** You cannot write a failing test for behaviour that is already
  correct, so do not contort one into existence — a test rewritten until it goes red
  against working code is asserting the bug you invented, not the behaviour you meant to
  protect. Skip **Red**; **Prove** is then not optional, it is the entire guarantee:
  write the assertion, break the module (flip a comparison, drop a clamp, return a
  constant), watch that test and no other go red, restore. State the mutation and its
  result in the PR body. A backfilled test whose mutation was never run is exactly the
  §9.4 defect wearing a different hat — it has never been red, so it is a claim about
  coverage rather than coverage. This is the path every work order under `tasks/` with
  type `unit-test-coverage` takes; the red-first order above governs new and changed
  logic, which is everything else.
- **This is sensed and gated, not just documented.** `senseUnitTests` in
  `scripts/harness-status.mjs` reports every logic module no unit test imports, every
  unit test file missing Given/When/Then, and any Vitest config without an explicit
  `include`. `type: 'unit-test-coverage'` findings **block the gate**: add a logic module
  without a unit test and `node scripts/harness-status.mjs --gate` exits 1 in the PR that
  adds it. The line-level half of the same rule also blocks, as the `no-op-assertion`
  guardrail.
  It was introduced **non-blocking** and promoted only once the backlog it found — 15
  untested modules and 12 unformatted test files across all six apps — was closed. That
  order matters and is the §8 policy in miniature: gating on day one would have reddened
  every PR on every app for work nobody had been asked to do, which teaches agents to
  route around the gate rather than satisfy it. Gate a rule when it describes a
  regression, not while it still describes history.
- You must write End-to-End (E2E) tests using Playwright for critical user flows.
- **BDD Specification Standard**: All E2E and Unit test scenarios must follow Behavior-Driven Development (BDD) formatting (`Given [Context] -> When [User Action] -> Then [Expected Outcome]`).
- You must enforce strict Accessibility (a11y) rules using `@axe-core/playwright` within the E2E tests.
- After implementing a feature, you **MUST** run the master verification script: `node scripts/test-app.mjs <AppName>` (cross-platform; `.\scripts\test-app.ps1 -AppName <AppName>` is a thin wrapper around it). Run it *before* pushing — the whole point of the Node port is that the authoritative gate no longer needs `pwsh`, so "CI will tell me" is not an acceptable substitute for running it.
- You cannot consider a feature complete unless the app passes all Security, Privacy, Optimization, A11y, and Functionality checks within the test script.
- **Automated Build Cleanup**: Every build and test cycle MUST include automated pre-build and post-build cleanup of stale build caches (`.next`, `dist`, `build`, `tsconfig.tsbuildinfo`) and temporary test outputs (`playwright-report`, `test-results`) via `npm run clean` and `.\scripts\clean-app.ps1`.
- **Mandatory Remote Deployment Verification**: Whenever initiating or triggering remote CI/CD workflows or cloud deployments (e.g., GitHub Actions workflows, Vercel builds), agents MUST NOT report completion immediately or poll rapidly in a loop. Instead, set a scheduled reminder (~5 minutes) using `schedule` to check job status after sufficient build time, confirming `completed success` before reporting completion to the user.
- **No Local Server Runs During Deployment Waits**: When waiting for live GitHub Pages or remote CI/CD builds to finish, agents do NOT need to launch or maintain local dev servers (`npm run dev`) or test servers locally; rely on scheduled reminder timers (`schedule`) and direct remote HTTP status checks.

## 6. Learned Lessons & Best Practices
- **Every agent re-reads and conforms to the harness instructions on every task.** [`AGENTS.md`](../../AGENTS.md) is the universal entry-point for every AI agent on this repo (OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, Aider, Windsurf, Zed, Warp, RooCode, Factory, Google Jules, Devin, Google Antigravity, and Claude Code as a fallback); the authoritative rulebook is [`.agents/AGENTS.md`](../../.agents/AGENTS.md) and the rules there are *enforced in CI, not just documented*, so a non-compliant change fails the build regardless of which tool wrote it. The plain-language "eight non-negotiables" at the top of `AGENTS.md` is a navigation summary, not the rulebook — an agent that reads only the summary will miss the long-form clauses, the §6 lessons with `[guardrail: <id>]` tags, and the §8 protocol for adding new lessons. Re-read both `AGENTS.md` and `.agents/AGENTS.md` at the *start of every change set* (a first-time read is not an up-to-date read after the repo evolves), and conform to them before: writing code or features (read the matching `specs/<app>-spec.md` first), inventing a release-time field that already exists in the spec, choosing a stack outside `projects/<app>/` scope, crafting a commit (`node scripts/harness-status.mjs --gate` must pass), opening a PR (mention the gate result), and merging on the user's behalf (agents **never self-merge** — human reviews and merges per §5/§8). When the user asks for something that contradicts the spec or the rulebook, **stop and flag the conflict** rather than silently diverging.
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
- **Workspace Hoisting Can Split a Peer Set That Isolation Was Hiding, Without Anyone Bumping a
  Version**: Converting the repo root to npm workspaces (root `package.json`, `workspaces:
  ["projects/*"]`) so the six apps' shared devDependencies — `react`, `typescript`, `vitest`,
  `@playwright/test`, `eslint`, and friends — dedupe into one `node_modules` instead of six is a real
  win (a single `npm install` at repo root replaces six, and disk/CI-cache pressure drops
  accordingly). But hoisting is not just a disk optimization: it changes *which physical copy* of a
  package a `require()` resolves, even when no `package.json` version range changes at all. mood-diner
  declared `eslint: ^8.57.0` with `@typescript-eslint/eslint-plugin/parser: ^8.65.0` — individually a
  valid peer range, and it worked under per-app isolated installs because npm could nest a
  self-consistent tree just for that app. Under workspace hoisting, `@typescript-eslint/eslint-plugin`
  deduped to the root (shared with the repo's ESLint-9 apps) while `eslint` itself stayed nested at
  8.x in mood-diner alone, so the plugin loaded `@typescript-eslint/utils` against the hoisted ESLint-9
  internals while ESLint 8's own rule loader expected the old shape — `eslint . ` crashed with
  `TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')`, a dual-package-instance
  failure with no version bump anywhere in the diff. `npx tsc --noEmit` and `npx vitest run` for the
  same app stayed green throughout, so a suite that stops at type-check and unit tests would have
  shipped this. The fix was the same shape as the dependency-bump lesson above: converge the drifted
  app onto the pairing its ESLint-8 siblings (`legal-financial-rag`, `portfolio-hub`) already use
  cleanly in this tree (`@typescript-eslint/eslint-plugin/parser` and `eslint-plugin-react-hooks`
  downgraded to match), not a root-level `overrides` that would force one eslint version repo-wide and
  contradict the apps' deliberately independent versioning. Two consequences worth carrying forward.
  (1) *After any workspace-affecting change (adding, removing, or re-hoisting a shared devDependency),
  run every app's full `npm run lint` — not just the app that changed* — because the breakage lands on
  whichever app's own tree gets partially hoisted, which is rarely the app whose `package.json` moved.
  (2) *A CI matrix leg that installs one app's deps in isolation no longer reflects what ships*: once
  the root lockfile is the source of truth, `node scripts/test-app.mjs <App>` and every workflow's
  `npm install` step resolve against the *whole* workspace, so a leg that looks like it tests one app
  in isolation is actually exercising the same shared tree every other leg does. `scripts/test-app.mjs`'s
  dependency-presence check was also a casualty of the same fact: it looked for
  `appPath/node_modules/@playwright/test`, which hoisting moved to the repo root, so the check always
  missed and re-ran `npm install` on every invocation — fixed by resolving the specifier the way Node
  actually would (`createRequire(appPath).resolve(...)`) instead of checking one literal path.
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
- **A Playwright `fill()` Before Hydration Is Swallowed, and It Looks Like a Broken Control**: In a
  server-rendered React app (Next.js, Remix), the markup is interactive-looking long before React
  attaches its listeners. A `fill()` that lands in that window sets the DOM value, dispatches an
  input event nobody is listening for, and is then reverted by the first client render — leaving no
  error and no console warning. The symptom is maddeningly indirect: a *later* assertion fails,
  usually on a submit button that never enables, and the obvious reading is that the app is broken.
  Diagnosing it cost a full debug cycle on `projects/elder-care-planner`, where the first field
  filled after `goto` was the one silently lost while every subsequent field worked. Two rules.
  (1) *Wait for a signal that client effects have run* before the first interaction — this app sets
  `document.documentElement.dataset.textsize` from a `useEffect`, so `waitForFunction` on it proves
  hydration; any app-owned post-hydration marker will do, but `waitForLoadState('networkidle')` will
  not, because hydration is not a network event. (2) *Assert the value stuck* immediately after
  filling it (`expect(field).toHaveValue(x)`), so a swallowed fill fails at the line that caused it
  rather than three actions later. Tests that fill a single field often pass by luck and hide this;
  a multi-field form whose submit depends on all of them is where it surfaces. Not tagged as a
  guardrail: "is this the first interaction after a navigation, in a hydrating app" is a
  cross-statement property that a per-line regex cannot see.
- **A Debounced Autosave Loses the Last Thing Typed**: Debouncing writes is right — a burst of
  typing should be one write, not thirty — but a debounce alone silently drops whatever is still
  pending when the page goes away, which is precisely the moment a user expects their work to be
  kept. In `projects/elder-care-planner` a 300ms debounce meant an edit followed by a reload was
  never written, and the symptom was indistinguishable from persistence being broken outright.
  Pair every debounced write with a synchronous flush on `pagehide` **and** on
  `visibilitychange`→`hidden`; the first covers navigation and closing a tab, the second covers a
  phone being backgrounded, where `pagehide` is not dependable. Hold the pending value in a ref so
  the listener is registered once rather than re-subscribed on every keystroke. Two consequences
  worth knowing. (1) *Prove it by reloading in an E2E test*, not by asserting the store was called
  — the bug lives entirely in the gap between "we scheduled a write" and "the write happened".
  (2) *A correct flush will fight a test that seeds corrupt storage and reloads*, because the flush
  overwrites the corruption on the way out; seed such fixtures with `addInitScript` before the
  first navigation instead. Not tagged as a guardrail: whether a given `setTimeout` write has a
  matching lifecycle flush is a whole-component property, not a line a regex can see.
- **An E2E Test That Calls a Live Third-Party API Outsources Your Build Status**: `travel-packing-app`'s
  E2E suite geocodes through `nominatim.openstreetmap.org` and `geocoding-api.open-meteo.com` for
  real. That makes a green build depend on someone else's uptime, rate limits and user-agent
  policy — Nominatim's usage policy explicitly blocks unfamiliar clients — and it means the suite
  cannot run at all in a network-restricted environment, which is where agents frequently work.
  The failure is also badly misleading: it surfaces as `expect(locator).toBeVisible()` finding
  nothing, so it reads as a broken feature rather than a blocked request, and the only clue is a
  `Geocoding Error: TypeError: Failed to fetch` line buried in the browser console output. Stub the
  network at the test boundary (`page.route()`) and keep one clearly-labelled opt-in spec for the
  live integration, so the deterministic suite proves the app's own logic and the live check is a
  separate signal that can fail without blocking a merge. Discovered while porting CI from
  `windows-latest` to `ubuntu-latest`: five apps ran clean on Linux and this one did not, which
  looked like a platform dependency for as long as it took to check whether the host was reachable.
  Not tagged as a guardrail: distinguishing a deliberate live-integration spec from an accidental
  one needs judgement, and the fetch is often several call frames from the test file.
- **A Flat Line Has No Bounding Box, and Playwright Calls It Hidden**: An SVG `<path>` that is
  legitimately horizontal — a series that is all zeros, a balance that never moves — has zero
  height, so `expect(locator).toBeVisible()` fails on it even though the element is in the DOM,
  correctly rendered, and visible to a human as a hairline on the axis. The failure reads as
  "the chart did not draw the line," which sends you looking for a rendering bug that is not
  there; in `projects/elder-care-planner` the real cause was fixture data (a $400,000 entry fee
  against $150,000 of savings) that flattened every curve onto zero. Two rules. (1) *Assert
  presence and attributes, not visibility*, for any series that can legitimately be flat —
  `toHaveCount(1)` plus the `stroke-dasharray` / `stroke-opacity` that encode its state proves
  more about the requirement than a bounding box does. (2) *Check the fixture makes the curve
  interesting before blaming the component*: a chart test whose data flatlines is not exercising
  the comparison it claims to, and it will pass or fail for reasons unrelated to the feature.
  Not tagged as a guardrail: whether a given series can legitimately be flat is a property of the
  data the test builds, several call frames from the assertion, and no regex over a line can see it.
- **A Binary Attachment Must Not Share a Storage Budget With the Record It Annotates**: Adding
  photos to `projects/elder-care-planner`'s facility shortlist looked like three lines beside the
  existing `localStorage` write, and that version would have destroyed data. `localStorage` is
  ~5MB **per origin**, so the plan and the images compete for one budget: a single phone photo,
  base64-encoded, is 4–5MB on its own, and the `QuotaExceededError` it raises lands on the *plan*
  write. A family loses thirty ledger entries because they attached a picture of a dining room,
  and nothing on screen connects the two events. The rule is structural, not a size limit — put
  binaries in **IndexedDB, in a store the document does not share**, keep only ids in the
  document, and downscale before storing (longest edge ≤1280px, JPEG q0.7) so the cap is generous
  rather than theoretical. Two consequences worth knowing. (1) *A separate store needs a separate
  erase*: "forget everything on this device" cleared `localStorage` and silently left the images
  behind, which on a shared computer is precisely the promise being broken. (2) *Prove the
  isolation by measuring the payload, not by reading the code* — the E2E spec records
  `localStorage.length` before and after attaching, asserts it grew by less than 200 bytes, and
  then reloads to confirm the image is still there; mutation-verified by lengthening the stored id,
  which fails exactly that assertion. Both writes are debounced, so the before/after readings must
  poll for the write to land rather than sampling straight after typing. Not tagged as a
  guardrail: "does this blob share a quota with that document" is a cross-module property, and the
  `setItem` call that eventually fails is nowhere near the code that attached the file.
- **Not Every Displayed Total Is a Sum, and Forcing One Into the Sum Check Breaks Both**: The
  §6.10 arithmetic-integrity rule — displayed parts must add to the displayed total, in cents —
  is right for every derivation in `explain/` that states a sum, and wrong for one that states a
  **weighted mean**. The facility score's parts add to a *points total* which is then divided by
  the total weight, so a literal reading of "the parts sum to the composite" is false. The
  approved spec said exactly that, and implementing it faithfully would have meant either a test
  asserting something untrue or dressing 1-to-5 scores up as `valueCents` so `isBalanced` had
  something to check — the second is worse, because it would make a currency-formatted "$19.00"
  appear where a score belongs and quietly satisfy the invariant while meaning nothing. The
  resolution is to **correct the criterion in the spec, in writing, before building against it**,
  and to follow the existing non-money precedent (`sensitivity` uses `reference` steps with
  `valueText` and a `valueText` result, so `hasArithmetic()` is false and the cents invariant
  holds vacuously *and* correctly). The real check is then stated in the form the figure actually
  takes: products sum to the stated points total, and that total over the stated weight equals the
  displayed score — asserted on the engine in the unit tests and on the **rendered strings** in
  the E2E spec, as the total-and-parts lesson above already requires. Not tagged as a guardrail:
  deciding whether a given figure is a sum or a quotient is exactly the judgement no regex has.
- **`getByLabel` Matches a Substring of the Accessible Name, So One Label Can Resolve to Two
  Controls**: A per-dimension score `<select>` labelled "Food at Oakmont" sat beside its own note
  field labelled "Note about food at Oakmont", and `getByLabel('Food at Oakmont')` matched both —
  twelve specs failed at once on a strict-mode violation that reads like a duplicated element
  rather than a naming collision. `exact: true` does not rescue it either, because these labels
  carry a hint `<span>` that is part of the accessible name. Locate by **role plus name**
  (`getByRole('combobox', { name })`) whenever two controls in one card describe the same subject;
  it disambiguates on the thing that actually differs, and it fails loudly if the control's role
  changes. This is a sharper form of the existing strict-mode lesson: scoping to a container was
  already being done here and was not enough. Not tagged as a guardrail: whether one label is a
  substring of another is a property of two separate JSX nodes.
- **Capacitor Absolute Base Path** `[guardrail: capacitor-absolute-base]`: An app that ships a Capacitor/Android container must never hardcode its static-host deploy subpath as the bundler `base` / `basePath` (e.g. `base: '/agentic-app-harness/mood-diner/'`). Capacitor serves the built bundle from `https://localhost/` inside the Android WebView, so every `/agentic-app-harness/...` asset URL 404s and the app boots to a blank white screen. The trap is that the *same* build is correct on GitHub Pages — so web CI, Playwright, and the live Pages deploy all stay green while the shipped Android artifact is dead on arrival. Use a relative `base: './'`, which resolves correctly under both the Pages subpath and the WebView origin. The guardrail is scoped via `appliesTo` and does not fire on web-only apps, where an absolute subpath base is the right answer.

- **Prove a New Test Can Fail** `[guardrail: no-op-assertion]`: §9.4 states the rule and the
  evidence — PR #41 shipped `const _: typeof PlanSchema = undefined as unknown as typeof
  PlanSchema;` as a "drift tripwire", where the annotation and the assertion are the same
  type, so no change to `Plan` could ever make it red. The mechanically detectable half of
  that lesson is now a guardrail, because both shapes it takes are visible in a single line.
  (1) *An `expect()` with no matcher chained onto it* evaluates its argument and asserts
  nothing — `expect(splitCosts(plan));` passes on every possible return value, including a
  thrown-away one, and reads in review exactly like an assertion. (2) *A value annotated
  `typeof X` and cast back to `typeof X`* is a tautology in type space. Both are worse than
  absent coverage: they are false statements about what is covered, and they displace the
  real test nobody now thinks to write. The regex excludes any line carrying a `).` matcher,
  requires the `expect(` call to **close on the line**, and requires a terminating `;`. That
  last condition was not in the first version, and the guardrail false-positived on its
  author's own new test within the hour — because a chain can be wrapped *two* ways, and
  `expect(Schema.parse(x))` with `.toEqual(y);` on the next line closes its call and is a
  complete statement by shape. Only the missing semicolon distinguishes it from the defect.
  The trade is deliberate and worth stating: a bare `expect(x)` written without a semicolon
  is now missed, which is acceptable because every app here lints with semicolons, whereas a
  blocking guardrail that reddens an ordinary wrapped assertion costs real work. The wider
  lesson is about the *evidence* rather than the regex — "zero hits across the repo when
  added" proved only that no one had yet written a shape the rule mishandled, and a
  line-level rule is one formatting habit away from its first false positive. Re-verified
  after the fix across all 35 unit test files and 24 E2E specs, with zero hits — a count
  worth re-running rather than restating, since an earlier draft of this bullet quoted both
  numbers wrong. The judgement half of the lesson
  cannot be automated and stays prose: no regex can tell whether a test that *does* assert
  is asserting the thing that matters, which is why §9.4 still asks you to break the code
  and watch the test go red.
- **Collapsing a Page Hides Whatever the Page Was Promising**: Turning a twelve-card scroll into
  disclosure sections is the right call for `projects/elder-care-planner`, and it silently
  demoted three separate guarantees on the way. (1) *A closed section says nothing*, so the
  Medicare correction — the most expensive misconception in the domain, deliberately placed on the
  results page rather than in a help article — went behind a click, and the E2E spec that guarded
  it still passed because `toContainText` does not assert visibility. The fix is a **status line**
  on every collapsed section, carrying the figure or the correction the reader came for, derived
  from engine output rather than recomputed beside it; and the two panels whose status lines carry
  editorial constraints must respect them — the facility shortlist counts communities and must not
  rank them, because §11.2 declines to name a best one on purpose. (2) *A collapsed `<details>`
  prints collapsed*, so the Family Meeting Summary would have reached the meeting as a heading. No
  stylesheet reliably reveals a closed `details` across browsers, so this is behaviour: open every
  printable section on `beforeprint` **and** synchronously around the in-app print button, then
  close only the ones you opened — printing must not rearrange the page someone was reading.
  (3) *An a11y audit of a collapsed page audits almost nothing*, because the controls are not in
  the accessibility tree; the axe sweep and the 200%-zoom overflow check both have to run against
  the expanded page or they quietly stop covering what they were written for. Two mechanical
  notes. `<details open={x}>` as a React prop is wrong on a page that re-renders per keystroke —
  it slams the section shut mid-typing; leave `open` out of props entirely and let the DOM hold
  it. And `locator('summary')` inside a section that contains its own nested `<details>` matches
  two elements, which surfaces as a strict-mode violation reading like a duplicated component.
  Not tagged as a guardrail: whether a given collapsed section has hidden something load-bearing
  is a judgement about what that panel was for, and the failing E2E assertion is usually in a
  different file from the component that collapsed.
- **A Containment Assertion Is Not a Coverage Assertion, and a Derived Figure Must Not Inherit
  Its Row's Confidence**: PR #47 added a `$30–$40` hourly band to
  `projects/elder-care-planner/src/lib/data/costOfCare.ts` and guarded it with two tests that
  asserted `low <= high`, both positive, and `low <= 3500 <= high`. A band of `[1, 999999]` — one
  cent to ten thousand dollars an hour — satisfies every one of those and passed all 350 tests,
  mutation-proven. The shape to distrust is a test that asserts a *property a whole family of
  wrong values shares*: pin the exact bounds, or assert the relationship that actually encodes
  the provenance (here, that the published median is the band's exact **midpoint**, which is the
  only thing making the spread checkable at all). The second half is the honesty failure the
  first half concealed. The survey publishes **one** merged `$35/hr` figure, so the spread around
  it is computed, not surveyed — yet it sat on a row tagged `confidence: 'verified'` and the UI
  called it "the published hourly-rate range." That is exactly the laundering the §6 *Cite
  Confidence* lesson names, and the codebase already had the precedent in
  `feeStructures.test.ts` (`FEE_RANGE_SOURCE.isAuthoritative === false`, commented as such) and
  in the deliberately-empty `STATE_MEDIANS` (*"a made-up state number is not [honest]"*). **A
  figure derived from a cited one needs its own `FigureConfidence` tag and its own note naming
  the origin** — a row-level tag describes the row's headline number, nothing else. Two further
  notes from the same PR. (1) *Read the spec's data clause before implementing it*: §11.10
  already required the band to carry four things — low, high, a `FigureConfidence` tag, and a
  note naming the survey — and the PR shipped two, so the fix was compliance rather than new
  design. (2) *A fallback that cannot run is worse than no fallback*: the component's
  `?? ±20%` spread was unreachable (its source is a compile-time constant that always carries
  the fields) and, had it ever run, would have invented a rate range on screen — so the dead
  branch was also the forbidden one. Not tagged as a guardrail: whether an assertion constrains
  enough, and whether a given number is derived from another, are judgements no regex over a
  line can make.

- **Two Bases On One Page Is a Defect Even When Both Are Right**: `elder-care-planner` drew an
  inflation-loaded runway projection (the engine compounds `annualEscalatorRate` on care and
  `colaRate` on income) and a today's-dollars break-even comparison (`engine/breakeven.ts` has no
  time dimension at all — it prices one month at current rates) in adjacent panels, with nothing
  on screen distinguishing them. Neither figure was wrong; the *page* was, because a reader who
  carries one basis across to the other panel misreads it, and there was no way to tell. The
  general rule: **where two figures on the same page are stated on different bases, naming the
  basis is part of the figure**, not an optional annotation. Three things this taught. (1) *The
  feedback that lands is usually already in the spec* — this arrived as a friend's suggestion to
  "add inflation adjustment", and §11.9 had already recorded the same observation from an earlier
  round, adjudicated and unbuilt; check `specs/` before treating relayed feedback as new work.
  (2) *A spec's own wording can be the thing that is wrong.* §11.9 was titled "values shown are in
  today's dollars", which is false for the runway and IL charts — implementing it verbatim would
  have printed a confident, incorrect statement on precisely the charts that most needed an
  accurate one, making the transparency feature the thing that misleads. Correct the criterion in
  the spec, in writing, before building against it — the same move §6's facility-score bullet
  already required for a weighted mean. (3) *One definition, consumed twice.* The basis strings
  live in a single module that both the chart label and the §6.10 derivation `assumptions` array
  read, because two copies of a sentence drift the first time one is edited, and a chart that
  disagrees with its own derivation about which dollars it is drawing is worse than one that says
  nothing. Prove it the way the §11.9 E2E does: assert each chart names its own basis **and does
  not claim the other**, since a test that only checks "a label is present" passes on a page that
  labels every chart identically — which is the original bug. Not tagged as a guardrail: whether
  two figures on a page are on different bases is a semantic property of the engines behind them,
  and no regex over a line can see it.

- **An Axis Label Is Not the Feature; the Event On It Is** `elder-care-planner`'s IL comparison
  chart carried two x-axis labels — "Month 1" and "Month N" — and the feedback that arrived was
  "make the x-axis years." Implementing that literally would have satisfied the words and missed
  the request: the stated goal was *"easily see, oops out of funds after 6 years"*, and **nothing
  on the chart marked the depletion event at all**, so no axis relabelling would have answered it.
  Read past the proposed mechanism to the thing the reader wanted to find, and check whether the
  page can express it yet. Three rules the fix turned on, each a specialisation of an existing §6
  lesson. (1) *Read the event off the series you plot* — the depletion month is found by scanning
  the same `assetsEndByMonthCents` the chart draws, never re-derived from plan inputs, because a
  marker at the wrong month **on a curve the reader can see** is the most falsifiable kind of wrong.
  (2) *Never snap a real event to a label* — savings exhausted in month 74 are reported as month 74
  in year 7; rounding to the nearest boundary puts the marker where the curve never crossed, and the
  reader's eye catches the discrepancy immediately. (3) *Silence is not an answer* — an option whose
  savings survive says so explicitly, because a blank is indistinguishable from a case the app
  failed to evaluate, and the marker belongs in the `role="img"` accessible description too, since
  a marker only sighted readers can find is not the feature that was asked for. Note also what the
  spec's own adjudication got right and the feedback did not: switching the series to annual
  resolution was already recorded as **rejected** (§6.5b.3), because the crossing usually happens
  mid-year — so the admissible change was year *labels* on still-monthly data. Not tagged as a
  guardrail: whether a chart surfaces the event its reader came for is a judgement about purpose,
  and the missing marker is an absence no regex over a line can see.

- **One Fact Stated Twice Will Eventually Be Stated Two Ways**: `elder-care-planner`'s break-even
  card rendered the same crossover three times — a summary paragraph, a slider status line, and
  (later) a headline sentence. The summary computed its own figure from `BreakEvenResult` and said
  *"the two options cost the same at 38.5 hours a week"*; the other two read the §11.10 band and
  said *"between 34.2 and 45.6 hours a week"*. A point estimate where §1.1 requires a range, sitting
  directly above two correct statements, and it was the most prominent of the three. Nobody wrote
  the contradiction deliberately: the band was resolved inside the slider component, so the panel
  literally could not reach it and computed the only thing it could. **The structural fix is to
  resolve a shared figure once, above every consumer, and pass it down** — here into
  `lib/engine/citedBreakEvenBand.ts`, resolved in the panel and handed to both. Two call sites
  computing "the same" value stay identical only until someone edits one, and the drift shows up as
  two sentences in one card disagreeing in front of the reader. Three practical notes. (1) *Share
  the phrase, not just the number*: both sentences now build from one `crossoverRangeText`, because
  agreeing on 34.2 and then formatting it differently is the same defect wearing a hat. (2) *Assert
  the agreement in E2E by parsing both rendered strings and comparing the captured groups* — a test
  that checks each sentence separately against a regex passes on two sentences that disagree with
  each other. (3) *Watch for the wording regressing on the way through*: the first draft of the
  replacement summary said "the published data" about a band that is `derived`, reintroducing the
  §6 Cite-Confidence laundering in a sentence written to fix a different problem — so there is now
  a test asserting neither sentence ever calls the band published. Not tagged as a guardrail:
  whether two strings in different components describe the same underlying fact is a semantic
  judgement, and the two call sites are usually in different files.
- **A Fragment-Only Navigation Does Not Remount, So a Mount Effect Alone Misses It**: The shared
  family link (spec §11.6) checks `location.hash` in a `useEffect(() => {...}, [])` to detect a
  `#share=...` link, following the same "read nothing from storage during render" pattern the
  existing plan-restore effect already uses. It worked for a fresh page load and failed silently
  for the case that matters most: a recipient who already has the app open in a tab and then opens
  or pastes a share link. Per the URL spec, a navigation that differs only in its fragment is a
  same-document navigation in every browser — no reload, no remount — so a mount-only effect simply
  never runs again to see the new hash. The symptom in Playwright was a `page.goto('#share=...')`
  that silently never rendered the passphrase gate, timing out on a locator that was correctly
  written but for a screen that never appeared; nothing in the component itself looked broken. The
  fix is to also listen for `hashchange` and re-run the same check, which is real behavior a
  fragment-based deep link needs, not a test-only workaround — the identical case happens in
  production the moment someone shares a link with a family member who already has the site open.
  Any future feature that reads `location.hash`, a query string, or anything else the browser can
  change without a full navigation needs the same two-part check: once on mount, and again on the
  event that fires when only that part of the URL changes.
- **A Tamper Test on Base64(url) Text Can Silently Tamper Nothing**: The shared-link decoder's
  tamper-detection test (`share.test.ts`) originally flipped the last character of the ciphertext
  segment and asserted decoding failed. It passed — and would have kept passing even if AES-GCM's
  authentication had been silently disabled, because base64 packs 6-bit groups into the encoding
  and a byte length that is not a multiple of 3 leaves the final character's low bits as padding
  that never maps to a real byte. Flipping exactly those bits re-encodes to a different string that
  decodes to the *identical* bytes, so "the fragment changed" and "the ciphertext changed" are not
  the same claim, and a test that only checks the former can be vacuous without ever failing loudly
  enough to notice. Caught only because the mutation-proof step (§9.4) mutated something unrelated
  (fixed salt/IV instead of random) and the tamper test *should* have still failed on that run but
  didn't — a mutation-proof step earns its keep by catching a defect in the test itself, not only in
  the code under test. The fix is to tamper at the byte level — decode to bytes, flip one in the
  middle, re-encode — which cannot land on a padding-only bit regardless of length. The same freshness
  test had a second, independent confound: two calls to the encoder produced different ciphertexts
  even with identical salt and IV, because a `createdAt` timestamp embedded in the plaintext differed
  by a few milliseconds between calls, so the test could not actually isolate what it claimed to
  test. Freezing the clock (`vi.setSystemTime`) before both calls removed that confound and let the
  salt/IV mutation prove the test could fail for the right reason. General shape: when a test's pass
  condition is "these two encoded outputs differ" or "this edited input now fails," check that the
  edit or the inputs cannot differ for a reason unrelated to the property under test — the last
  character of an encoding and a wall-clock timestamp are two ways that happens, and neither is
  obvious from reading the assertion alone.
- **A `<select>` in a Table Cell Can Defeat `overflow-x: auto` on Its Own Wrapper**: Every table in
  `elder-care-planner` sits inside a `.table-wrap { overflow-x: auto }` container specifically so a
  wide table scrolls within itself rather than the page (`.agents/AGENTS.md`'s own responsive
  discipline). The weekly care-coverage grid (spec §11.15) put a `<select>` — not plain text — in
  every cell, and the whole page started scrolling sideways at a narrow phone viewport, 163px worse
  than every other table on the same page using the identical wrapper. The cause: `select { width:
  100% }` is a global base rule, and in a table using the browser default auto layout, a
  `width: 100%` on a form control inside a cell is a *minimum*, not a cap — the browser will still
  grow the table past that 100% to fit the `<select>`'s intrinsic content width (its widest
  `<option>`, here a contributor's name), and an ancestor `overflow-x: auto` does not stop a
  descendant table from growing itself in the first place, it only stops the *already-grown* table
  from pushing the page. Plain-text table cells never hit this because text simply wraps or is
  clipped by the cell; a form control's minimum content width is enforced by the browser in a way
  ordinary content is not. The fix is `table-layout: fixed` on that specific table (scoped by class,
  not the global `table` rule, since other tables' content-driven column widths are intentional and
  correct) — fixed layout makes the specified widths authoritative, so `width: 100%` on the select
  is honoured exactly instead of treated as a floor. Diagnosed by binary-searching the DOM
  (`element.remove()` in `page.evaluate`, confirm `scrollWidth` drops) rather than reading CSS,
  because the failing assertion (`e2e/a11y.spec.ts`'s whole-page overflow check) was several
  components away from the actual cause and every individual `.table-wrap` measured as correctly
  containing its own content when inspected in isolation — the leak was in the *table's own* growth
  past its wrapper's constraint, not in the wrapper failing to constrain it. Not tagged as a
  guardrail: whether a given table cell holds a form control versus plain text is not visible to a
  line-level regex, and the fix lives in a CSS file nowhere near the component that triggers it.
- **A Sweep for "Mobile Formatting Is Weird" Needs `flexWrap` Everywhere and Real Overflow
  Measurement, Not Eyeballing**: A cross-app sweep at 320px and 375px viewports (`scrollWidth >
  clientWidth`, the same measurement `elder-care-planner`'s a11y spec already used) found the same
  root cause five separate times across `portfolio-hub` and `legal-financial-rag`: an inline
  `display: flex` row — a category filter bar, a card's badge header, a privilege-filter row, a
  search-hyperparameters row, a citation's title/score row — written with no `flexWrap: 'wrap'`
  because it never needed to wrap at desktop width. None of these were caught by the existing
  `responsive-grid` guardrail, which only pattern-matches `grid-template-columns`; an un-wrapped
  `flex` row is the same failure mode in a shape that guardrail's regex cannot see. The general fix
  is boring and repeats: add `flexWrap: 'wrap'` (and a `gap` if one was implied by margins instead)
  to every flex row holding more than one text/button/badge child that isn't already inside a
  fixed-width layout. What made this worth writing down rather than just fixing is the one bug that
  measurement-only debugging (bisecting `element.remove()`, per the lesson above) would have missed
  by inspection: `legal-financial-rag`'s `WatermarkOverlay` is `position: absolute; inset: 0` with
  `transform: rotate(-25deg)` on its text, at `opacity: 0.04` — nearly invisible, and its *layout*
  box exactly matches its parent, so nothing about reading the JSX or the rendered screenshot
  suggested a bug. But `getBoundingClientRect()` (and therefore scrollable overflow) reflects an
  element's *rendered*, post-transform bounding box, not its layout box — CSS Transforms is explicit
  that the transformed rendering is what participates in a scroll container's overflow — so the
  rotated text, wider than any narrow viewport, silently added ~40-270px of horizontal scroll no
  visual inspection would ever catch, since the content responsible is essentially invisible. The
  fix is `overflow-x: hidden` on the nearest ancestor that already establishes the absolute
  positioning context (here `.app-container`, which the watermark is already sized to fill via
  `inset: 0`), not on the watermark itself — clipping at the watermark's own box would work too but
  couples the fix to a decorative component instead of the layout boundary it's meant to respect.
  Two mechanical notes for building the regression tests. (1) *An overlap bug is not always an
  overflow bug*: `travel-packing-app`'s theme-toggle button (`position: absolute`, top-right) ran
  underneath a centered `<h1>` at narrow widths without ever making `scrollWidth` exceed
  `clientWidth` — both elements independently stayed within the viewport, they just occupied the
  same space. A `scrollWidth` assertion passed on this exact bug and had to be replaced with a
  `boundingBox()` vertical-overlap check; the wrong regression-test shape can look green on a real
  bug, so match the assertion to the actual failure mode, not to whichever check is easiest to
  write. (2) *A live E2E flow blocked reusing the existing spec as a regression baseline*:
  `travel-packing-app`'s only spec that reaches its main results page drives a real geocoding API
  call (the exact case the "live third-party API" lesson above already warns about), so it was
  already failing in this sandbox before any of these fixes — a fresh, self-contained test against
  the pre-results page was added instead of extending the blocked one. Not tagged as a guardrail:
  which flex rows need `flexWrap` is a judgement call over rendered layout, not a line-level pattern,
  and the transform-overflow mechanism in particular depends on a cross-file relationship between a
  decorative component and whichever ancestor happens to be the nearest scroll container.
- **A Drag-and-Drop Library's Auto-Scroll Invalidates Coordinates Measured Before the Drag
  Started**: `travel-packing-app`'s outfit-editor E2E spec (`e2e/outfit-editor.spec.ts`) measures a
  drop target's `boundingBox()` once, before the drag sequence starts, and replays those
  coordinates through a manual `mouse.move/down/move/up` sequence — dnd-kit's `DndContext` listens
  for pointer events, not the native HTML5 drag events Playwright's own `dragTo()` fires, so the
  manual sequence is required in the first place. That test passed in isolation and then started
  landing drops on "Day 3" instead of "Day 1" the moment an unrelated sibling PR (a new donut
  chart, merged via this session's independent-branch pattern) pushed the page's height past the
  test viewport: dnd-kit's built-in auto-scroll — a real, desirable feature, not a bug — engaged
  mid-drag once the cursor neared the bottom of a scrollable viewport, and the resulting scroll
  offset made the pre-measured `targetBox` describe a position the drop slot no longer occupied.
  Diagnosed with a temporary debug spec logging `targetBox` before and after the drag sequence
  (showed a -483px shift) and `document.elementFromPoint` at the drop coordinate (returned an
  unrelated `H2` heading, not the drop slot) — the failure otherwise looked identical to a broken
  drop handler. The fix that holds up under future, unrelated page growth is not "re-measure right
  before the drop" — that still races the auto-scroll's own animation timing — but sizing the test
  viewport tall enough to contain the *whole* page (`setViewportSize({ height: 5000 })`, safely
  above the ~4207px the page reached once every sibling phase had merged) so nothing is scrollable
  and auto-scroll never has a reason to engage. Not tagged as a guardrail: whether a given page's
  height will later outgrow a fixed test viewport is a property of future, unrelated changes to
  that same page, not something a line-level regex can see coming.
- **A Monetization UI That Shows Real Prices Needs a Real Purchase Behind It**: A full Play Store
  readiness audit across all five native apps found `mood-diner`'s `ProPaywallModal.tsx` presenting
  specific currency amounts ("$4.99/mo", "$39.99/yr"), a "Start 7-Day Free Trial" call to action,
  and "Cancel anytime with 1-click in Google Play / Web Settings" — while `upgradeToPro()` in
  `MonetizationContext.tsx` does nothing but flip a `localStorage` flag. Tapping the button grants
  Pro instantly, charges nothing, and starts no trial; the "Cancel... in Google Play" line
  references a Play Billing subscription that was never created. This is exactly the shape Play's
  Monetization and Payments policy exists to catch: a purchase-shaped UI that does not do what it
  visually claims is a rejection/removal risk independent of whether the underlying feature-gating
  logic (free daily credits, Pro-only unlocks) is itself fine — and it was, per §11 of this app's
  spec, which only requires the *gate* to be well-behaved (opt-in, non-interrupting), not that the
  UI behind it be truthful about billing. The store-listing kit's own README had already flagged
  this exact defect and explicitly declined to fix it, reasoning it was "a UX mismatch... I didn't
  change this since it wasn't part of what was asked" — correct scope discipline for a listing-copy
  pass, but the flag sat unresolved through a subsequent full audit pass too. **Resolved**: the
  product decision landed on rewriting the copy rather than wiring up real Play Billing — the
  billing-cycle selector (the whole Annual/Monthly-with-prices toggle) is gone, the CTA is now
  "Unlock Pro Features" with no price or trial period attached, and the footer states plainly
  what actually happens ("No payment, no account — this preview switches your device to the Pro
  feature set at no cost") instead of claiming a cancellable Google Play subscription. Verifying
  this by reading the component alone would have been incomplete: `ProPaywallModal` was fully
  built and wired to `MonetizationContext` but **never mounted anywhere** — `App.tsx` rendered
  `BookingsModal`, `WeatherWidgetModal`, and `AddRealRestaurantModal` but not this one, so
  `openPaywall()` silently did nothing and no user could ever have seen the deceptive copy in the
  first place. A Playwright smoke check against the running dev server (click `#upgrade-pro-btn`,
  wait for `.modal-content`) timed out until `<ProPaywallModal />` was added to `App.tsx`'s render
  tree alongside its sibling modals — the same "assert on the rendered page, not the source" habit
  the other lessons in this section already insist on. Not tagged as a guardrail: distinguishing a
  truthful mock-data label from a deceptive one is a judgment about what copy claims, not a
  line-level pattern, and "is this component actually mounted" requires resolving an import graph
  a regex over one file cannot see.
- **A Green PR Check Is Not a Green Master, When Several Merges Share One Lockfile**: Dependabot
  PR #135 (`typescript-eslint` 7→8, grouped across `legal-financial-rag`/`mood-diner`/
  `portfolio-hub`) passed its own CI cleanly and was merged as part of a same-day batch of 11
  Dependabot merges. `master`'s `Lint & static analysis` step started failing on the very next
  commit — in all three of that PR's own apps — with `TypeError: Cannot read properties of
  undefined (reading 'allowShortCircuit')`, the exact dual-package-instance failure this section's
  "Workspace Hoisting" lesson already documents, now reproduced by a correctly-*grouped* PR
  instead of a lone single-app one. The PR's check had genuinely passed; what changed was that by
  the time it merged, several *other* lockfile-touching PRs in the same batch had already landed,
  and the union of all of them, resolved fresh by npm on `master`, hoisted differently than any
  one PR's own branch ever tested. Caught only because `master`'s actual post-merge CI was checked
  directly (`list_workflow_runs` filtered to `branch: master`) rather than trusted from each PR's
  own already-green check — the two can disagree the moment more than one lockfile-touching PR
  lands in a short window, which a same-day dependency-triage pass all but guarantees. Fixed by
  reverting the three apps' `typescript-eslint` to `^7.18.0` together (the peer set moves as one,
  same as the hoisting lesson already prescribes), verified by re-running `node scripts/
  test-app.mjs <App>` for each rather than trusting the revert on inspection alone. The durable
  fix is process, not code: enable "Require branches to be up to date before merging" in the
  repo's branch protection for `master`, so a PR is forced to re-run CI against the *current* tip
  — not a stale snapshot from whenever it was opened — before it's mergeable, which is exactly the
  gap that let this land. Not tagged as a guardrail: nothing about this is visible in a diff or a
  line of source — the defect only exists in the interaction between separately-merged PRs and a
  shared lockfile, which is a repository-configuration property, not a code pattern.
- **A Contract That Exists But Isn't Wired Is Not a Contract**: A full security audit found
  `mood-diner`'s `src/App.tsx` reading `mood_diner_custom_restaurants` and `mood_diner_reservations`
  from `localStorage` with a bare `JSON.parse` and no schema check — the one boundary in the repo
  that skipped §1's "validate untrusted input at the boundary" rule, while every sibling app
  (`smart-recipe-app`'s `parseStored()`, `elder-care-planner`'s `parsePlan()`) already did it
  correctly. The app's own `src/lib/schemas.ts` had a `RestaurantSchema` that looked like it existed
  for exactly this purpose — but it was imported by nothing except its own test file, and had
  quietly drifted out of sync with the real `Restaurant` shape while sitting unused: it was missing
  four fields the real app writes (`hasFireplace`, `heroImage`, `priceRange`,
  `isRealWorldVerified`) and still declared three fictional ones from an earlier data model
  (`rooftop`, `fireplace`, `hasHeaters`) that nothing produces. Wiring the schema in naively — without
  first checking it against the real shape — would have silently stripped a restaurant's image and
  price badge on every load, since Zod drops unknown keys by default rather than erroring on them.
  Two consequences. (1) *A schema's existence is not evidence it's enforced* — grep for where a
  `Schema.parse`/`safeParse` call site actually sits, not just whether the `z.object()` exists,
  before trusting a "contract-first" claim about a boundary. (2) *The concrete exploit this gap
  admitted*: `websiteUrl` is rendered directly as an `<a href>` in `RestaurantCard`/`RestaurantModal`,
  so an untyped `z.string()` field on that boundary would have let a hand-edited or corrupted
  localStorage payload carry a `javascript:` URI straight into it — closed with a `.refine()`
  requiring the parsed value's `URL.protocol` to be `http:`/`https:`, proven by three rejection
  cases (`javascript:`, `data:`, and a non-URL string) and a mutation test (temporarily replacing the
  per-entry `safeParse` filter with a passthrough cast made the malformed/tampered-row tests fail as
  expected, then the fix was restored). Not tagged as a guardrail: "does an exported Zod schema
  actually gate the boundary it was written for" requires resolving an import graph and comparing a
  schema's fields against a separately hand-written interface — neither is a line-level pattern.

- **A "Wait for the Save to Land" Helper Returns on ANY Save, So a Before/After Payload
  Measurement Must First Wait for the Entity That Makes the Baseline Meaningful**: Both
  `elder-care-planner` payload-size specs (`receipts.spec.ts` and `facilities.spec.ts`,
  guarding spec §11.14/§11.2.4's "the plan grows by an id, not an image" claim) snapshot the
  baseline right after `waitForEncryptedSave` — which returns on the *first* encrypted envelope
  in storage. Under 4–8 parallel workers that can be the page-load save, taken before the
  just-logged ledger entry (or just-added tour) has landed, so the measured delta then includes
  the whole entry on top of the receipt id: `235 > 200` bytes, on an app provably storing only
  the id (clean-run delta: 48 bytes). The failure reads as "the app leaked image bytes into the
  plan" and is actually the baseline racing the debounced write. Two rules. (1) *Wait for the
  entity, not the envelope* — poll the *decoded* state (`readStoredPlannerState`) until the
  entry/tour is present, then snapshot the baseline; the envelope's random IV proves a save
  landed, not which state it carries. (2) *A poll function that can throw is not a poll* —
  `readStoredPlannerState` throws when no envelope exists yet, and `expect.poll` propagates
  throws instead of retrying, so the first draft of this fix (poll without a catch) failed the
  very next full-suite run on the first evaluation; wrap it in a catch that returns a sentinel
  (`0`) and keep polling. Proven by hammering the fixed specs at `--workers=8` (3× receipts, all
  green) after the single-worker isolation pass; the full-suite re-run is what caught the
  no-catch draft. Not tagged as a guardrail: whether a given save carries the state a
  measurement depends on is a timing property, invisible to any line-level regex.

- **The Rulebook's Lesson Count Is Load-Bearing Data, Not Documentation**: `projects/portfolio-hub`
  derives its displayed loop stats — and its `loopStats.generated.test.ts` assertion — from the live
  `scripts/harness-status.mjs` and `.agents/AGENTS.md` (§6 lesson bullets counted), not from a
  hand-written constant. PR #217 added one §6 lesson and pushed without regenerating
  `portfolio-hub/src/data/loopStats.generated.ts`; CI's `test (portfolio-hub)` leg went red with
  `expected 47 to be 46` on a change to an entirely different app. The fix is the app's own
  generator: after any change to `.agents/AGENTS.md` that adds, removes, or merges a §6 lesson (or
  changes a `[guardrail: …]` tag count), run `cd projects/portfolio-hub && npm run
  generate:loop-stats` and re-run its suite in the same commit. The failure is already guarded —
  portfolio-hub's own unit test recomputes the counts against the committed fixture — so this is a
  pre-push discipline lesson, not a missing test. The failure is now guarded twice, so it cannot
  resurface as a red round-trip one commit late: portfolio-hub's own unit test recomputes the
  counts against the committed fixture, and `scripts/check-loop-stats.mjs` recomputes them again at
  the repo gate, failing fast with the `npm run generate:loop-stats` hint. Not a
  `harness-status.mjs` guardrail: "did these counts drift" is a cross-file recompute, not a
  line-level pattern — the same reason it lives as a workflow step (like
  `check-enum-blast-radius.mjs` and `check-doc-claims.mjs`) rather than in `GUARDRAILS`.
- **A GPU-less Container Cannot Create a WebGL Context in the Pinned Headless Shell — Degrade
  Gracefully, and Test the No-WebGL Path**: In the GPU-less sandbox/CI containers this repo runs
  in, Playwright's bundled headless shell cannot create a WebGL context
  (`BindToCurrentSequence failed`), and neither `--enable-unsafe-swiftshader` nor
  `--use-angle=swiftshader` rescues it. Two consequences. (1) *Any WebGL renderer must survive that
  condition*: `travel-packing-app`'s `new THREE.WebGLRenderer()` threw uncaught in its mount
  effect, which React's error boundary turned into the whole Knapsack Engine panel unmounting —
  including the accessible text breakdown the spec promises. Guard renderer creation and degrade to
  the text fallback; assert it with an E2E that stubs `HTMLCanvasElement.prototype.getContext` to
  return null via `page.addInitScript`. (2) *To test the working-WebGL path in such a container*,
  run the suite against the full Chrome binary with `--no-sandbox --in-process-gpu
  --enable-unsafe-swiftshader` through the existing `HARNESS_CHROMIUM_PATH` override — a small
  wrapper script suffices, and it is an environment override, not part of the app. Not tagged as a
  guardrail: WebGL availability is a runtime/environment property, not a line pattern.
- **Verify a Stated Count Before Writing It Down — Don't Recall It**: PR #38's own description
  claimed "10 components ... + 2 more" for `mood-diner` — wrong, but harmless, since the shipped
  README already said 8, matching the directory on disk. The more serious version of the same
  mistake landed in a shipped file: `elder-care-planner/README.md` stated "437 unit tests," a
  number that matched no real source — not the actual suite (`npx vitest run`: 551 passed, 33
  files), not even `portfolio-hub`'s own catalog (`237`). The same README's engine table also
  undercounted (10 listed, 14 real files in `src/lib/engine/`) and its architecture block dropped
  one of six real data files. A follow-up PR (#223) had to re-derive every number from the actual
  files and command output rather than trust the prose. **Any specific count named in a PR body or
  a README — component counts, test counts, engine counts, file counts — must be produced by
  literally running the count in that session** (`ls src/components | wc -l`, `npx vitest run`,
  `grep -c`), never recalled from an earlier pass, a sibling doc, or an impression of the file tree.
  Not tagged as a guardrail: whether a given number was actually counted versus remembered leaves
  no trace in the diff for a line-level regex to catch — only re-running the count catches it,
  which is what `scripts/check-doc-claims.mjs` already does for the one claim it covers (§8);
  extending its coverage to more per-app numeric claims is a natural, still-open follow-up.
- **`localStorage` Throws — It Does Not Merely Return Null — and a Root Provider Is the Worst
  Place to Learn That**: `mood-diner`'s own `src/lib/storage.ts` already wrapped every `getItem` in
  a `try`/`catch` and validated the result through Zod, exactly as §1 requires. Its
  `MonetizationContext.tsx`, in the same app, did neither: `localStorage.getItem(KEY) as PlanTier`
  and `parseInt(saved, 10)`, both bare. The same shape as §11's *Contract That Exists But Isn't
  Wired* — one hardened path, one unhardened path, same app, same data class — and it had three
  separate failure modes stacked on it. (1) *Access throws when the browser denies storage* (a
  private window, site data blocked, an Android WebView with DOM storage off). Not "returns null" —
  a `SecurityError`. This read happens while the provider builds its initial state at the **root of
  the tree**, so the throw is not caught by anything and the entire app renders as a blank page,
  the exact failure §12's boundaries exist to stop. A hardened storage module three files away does
  not help if the crashing read isn't going through it. (2) *An unvalidated `as` cast is a lie about
  the type*, and a hand-edited `'gold'` propagates as a `PlanTier` everywhere downstream. (3) *A
  corrupt count poisons itself permanently*: `parseInt('abc')` is `NaN`, `NaN > 0` is false so the
  user is locked out of the free allowance, and — because the provider writes state back on change —
  `NaN.toString()` persists `"NaN"`, so the lockout **survives every future reload**. Three rules.
  *Guard the access, not just the parse.* *A corrupt count must fail toward the generous side* —
  resetting to the full allowance hands a free user one extra day, resetting to zero silently
  withholds what the app promised, and only one of those is recoverable by the user. *Don't reach
  for `z.coerce` on a stored number*: it turns `null` and `''` into `0`, converting "nothing stored"
  into "nothing left", which is the lockout wearing a Zod schema. Verified by mutation — restoring
  the original unguarded reads turns 9 of the 17 cases in `monetizationStorage.test.ts` red,
  including both the storage-denied and the persisted-`NaN` cases. Not tagged as a guardrail:
  whether a given `getItem` sits on a path that can crash the root of the tree is a cross-file
  property, and the hardened sibling module is what makes the gap invisible to a line-level read.

- **`JSON.parse('null')` Succeeds, So a `try`/`catch` Around the Parse Is Not a Validation**:
  `travel-packing-app`'s packing checklist restored its checked-items map with `saved ?
  JSON.parse(saved) : {}` inside a `try`/`catch`, which looks like a guarded read and is not one.
  The string `"null"` is *valid JSON*: it parses without throwing, the catch never fires, and
  `checkedItems` becomes `null` — then `Object.values(checkedItems)` throws during render, several
  lines and one component away from the read that caused it. The same hole passes an array, a bare
  number, and an object whose values aren't booleans. **Validate the parsed result, not just the
  act of parsing**; a `catch` only covers syntactically invalid JSON, which is the *easier* half of
  the problem. What made the gap conspicuous once found: the same file already validated the *other*
  untrusted source of the identical shape — `isChecklistSyncMessage`, guarding messages arriving over
  `BroadcastChannel` from another tab — so the app was strict about a message from a sibling tab and
  credulous about its own `localStorage`. Both now resolve through one exported `isCheckedItemsMap`,
  per §6's *one definition, consumed twice* rule, so the two paths cannot drift into disagreeing
  about what a valid map is. General shape worth carrying: when a value can arrive from two
  untrusted sources, check that **both** go through the guard, and be suspicious of the one that
  looks too routine to need it. Not tagged as a guardrail: "was the result of this parse validated"
  needs the data flow from the parse to its first use, which a per-line regex cannot follow.

- **A Promised Follow-Up Is a Debt, Not a Deliverable**: PRs #161 and #162 (weather-reactive
  packing essentials, travel-mode preference) each branched independently off `master` and said so
  explicitly in their own bodies — *"whichever merges second will need a conflict-resolution merge
  ... I'll handle that once one of them lands."* Neither was revisited. Six days later `master` had
  grown a full i18n system and several new components touching the same files, and what the PR
  bodies described as a quick merge-order fix had become a ~20-file manual conflict resolution on
  each — confirmed with a local three-way merge test (`git merge-tree`), not just GitHub's
  `mergeable_state` flag, before either was closed. The promise wasn't dishonest when written; it
  assumed a re-invocation that never happened. An agent should not write "I'll handle X once Y
  lands" unless something concrete will actually re-invoke it to do so — a scheduled check, a
  human review cadence, a CI hook — and where that isn't guaranteed, the honest sentence is "this
  will conflict with #NNN; whichever lands second needs a human-initiated rebase," not a promise
  the same session cannot keep. Not tagged as a guardrail: whether a stated intention to return
  will actually be acted on is outside anything visible in the diff itself.

- **Unpinned Dependencies Drift Without Code Changes** `[guardrail: unpinned-deps]`: A dependency
  version range (`^1.0.0`, `~1.0.0`, `>=1.0.0`, `latest`, `*`) lets a fresh `npm install` resolve
  a different version than the one the suite passed against. The two peer-set lessons above are
  about *which* version to pin; this is about the pin *existing at all*. A pinned version (`"1.2.3"`)
  only changes when a human or agent deliberately edits it, so a regression is tied to a tracked
  change. An unpinned range drifts on every install, and the failure can surface weeks later on a
  different machine. `workspace:*` is exempt — it is a monorepo protocol, not a range. Pin every
  dependency to an exact version; use the `dependency-doctor` skill (`.agents/skills/dependency-doctor/`)
  to find the existing backlog, and let the guardrail prevent new ones from being added.

- **Ease-In Timing On Enter Animations Feels Jarring** `[guardrail: ease-in-on-enter]`: An
  `ease-in` timing curve (Tailwind `ease-in`, Framer Motion `ease: "easeIn"`, CSS
  `cubic-bezier(0.4, 0, 1, 1)`) decelerates into position — the element appears to slow down as
  it arrives, which feels sluggish and physically wrong. Enter/mount animations should use
  `ease-out`: the element accelerates into view and settles naturally (CSS
  `cubic-bezier(0, 0, 0.2, 1)`, the Material Design standard deceleration curve). `ease-in` is
  correct for exit/leave transitions, but those are rare in UI work compared to enter — if a hit
  lands on an exit animation, it is safe to ignore. Inspired by `emilkowalski/skills`.

- **Hidden Text Overflow Must Indicate Truncation** `[guardrail: text-truncate-missing]`:
  Combining `overflow-hidden` with `whitespace-nowrap` clips text invisibly — the user sees a
  sentence stop mid-word and has no visual indicator that content was hidden. Add `truncate`
  (Tailwind), `text-ellipsis`, or `line-clamp-N` so the truncation is visually communicated with
  an ellipsis or fade. `overflow-hidden` alone (layout containment) and `whitespace-nowrap` alone
  (preventing wrap) are not this anti-pattern — only the specific combination without a
  truncation indicator fires.

- **A Dead `public/` File Ships in Every Build, and No Line-Level Rule Can See It**: `public/`
  is copied verbatim into every web build and Capacitor container, so an asset nothing references
  is pure payload on every ship — yet "no file references this" is an *absence* check across the
  whole tree (the reference can be several files away: `index.html` → `manifest.json` →
  `icon-512.png`) that no `test(line)` predicate can express. Two 2026-08 optimization audits
  found this class only by hand: mood-diner shipped an obsolete `public/playstore-banner.jpg`
  (681 KB) and `public/icon-512.jpg` (489 KB), and travel-packing-app and smart-recipe-app each
  shipped five unreferenced `create-next-app` placeholder SVGs. The mechanical half is
  `senseDeadPublicAssets` in `scripts/harness-status.mjs`: every file under `<app>/public/` whose
  basename appears nowhere else in the app (src, html, json, markdown, e2e, store-listing, or
  other public files — excluding node_modules/android/build outputs) is reported as
  `dead-public-asset`. It is a **sensor**, not a guardrail, and starts **non-blocking** per §8:
  deleting an asset can need product judgement — a brand asset, a store-listing source, or a
  privacy policy deliberately hosted standalone (`privacy.html` is referenced by each app's
  README/store-listing docs, so it stays silent). What it deliberately does not claim: a
  *referenced* but oversized asset (a 500 KB icon the manifest really uses) is a size-tuning
  question, not this bug — re-encoding wants a human eyeball and is out of scope. Not tagged
  `[guardrail: …]` because it is not line-detectable; it carries a fixture-driven self-test in
  `harness-status.test.mjs`, so it cannot silently stop reporting.

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

### Harness composition conventions

The harness implementation keeps four deliberately small composition patterns explicit:

- **Pipeline**: deterministic stages transform collected findings in order.
- **Chain of Responsibility**: registered supplemental sensors each contribute findings without depending on sibling sensors.
- **Strategy**: blocking policy is injectable through `createBlockingStrategy`, while the default policy remains the VERIFY contract.
- **Adapter**: `createProjectAdapter` normalizes project-root file discovery and repository-relative paths across the six apps.

These are functional zero-dependency helpers, not a class framework. Do not introduce a pattern abstraction unless it removes an existing cross-app conditional or makes a harness contract executable in the self-test.

### Blocking guardrails vs. informational sensors
Not every mechanical check belongs in `GUARDRAILS`. That array is for **line-level
regressions**: its `test(line)` contract is what `harness-status.test.mjs` self-tests,
and every hit **blocks merge**. Some real defects are *absence* checks (a missing
signing config, an unbranded launcher icon, a missing privacy policy) that no regex
over a line can express, and that describe incomplete work rather than a regression.

Those belong in a **sensor** in `senseApp` — see `senseMobileRelease` (Play Store
release readiness), scoped to apps with a native container,
`senseProductionBundleTest` (does the E2E suite ever load the built output?), and
`senseUnitTests` (does a unit test reach each logic module, is it BDD-formatted, is
Vitest scoped?). Sensors are self-tested against fixture trees, so they cannot
silently stop reporting, and they become work orders via `emit-tasks.mjs`.

A sensor starts **non-blocking** and is promoted later. The rule is not "sensors never
gate" — it is *gate a check when it describes a regression, not while it still
describes history*. `senseMobileRelease` and `senseProductionBundleTest` are still
excluded from `isBlocking`, because both still describe incomplete work. `senseUnitTests`
was too, and was promoted once its backlog — 15 untested modules and 12 unformatted test
files — was closed; it now fails the gate. Gating a check on day one, while it is still
reporting work nobody has been asked to do, reddens unrelated PRs and teaches agents to
route around the gate rather than satisfy it.

Promote a sensor check to a *guardrail* (as opposed to a blocking sensor) only once it
is line-detectable, since `test(line)` is the contract the guardrail self-test enforces.

`senseUnitTests` is the clearest example of the split, because the same lesson
produced one of each. "Is this logic module reached by any unit test?" is an absence
check across the whole tree — it resolves every import specifier in every unit test
file against the filesystem, which no `test(line)` predicate can express — so it is a
non-blocking sensor. "Does this assertion have a matcher?" is one line, always wrong,
and had zero hits when added — so it is the blocking `no-op-assertion` guardrail. Note
what the sensor deliberately does **not** claim: crediting a module because a test
imports it answers "is this reached?", not "is this well tested". Depth is a
line-coverage question and wants a line-coverage tool; a zero-dependency scan should
report only what it can actually see.

### Making Learn data-driven: `harness-history.mjs`

The promotion criterion above — "a check is promoted once it stops describing history and
starts describing a regression" — has so far been applied from memory: `senseUnitTests` was
promoted because someone tracked its backlog to zero and remembered to flip `isBlocking()`.
Nothing in the harness *noticed* that on its own, and nothing flags the mirror-image case: a
guardrail that has never once fired since it was added, which is either working exactly as
intended (prevention, not detection) or scoped too narrowly to ever match — a distinction only
a human can make, but one nobody is prompted to look at.

`scripts/harness-history.mjs` closes that gap without adding a second enforcement layer. Every
finding `harness-status.mjs` can produce now carries a stable `ruleId` (independent of which app
it fired in — `guardrail:no-op-assertion`, `unit-test-coverage:untested-modules`, and so on),
mirrored in an `allRuleMeta()` registry that `harness-status.test.mjs` cross-checks against a
live fixture run, so an `add(...)` call site with no registered `ruleId` fails the self-test
instead of quietly falling out of history. `node scripts/harness-history.mjs --record` snapshots
the current per-`ruleId` finding counts, keyed by commit sha, into `harness-history.json` — this
file **is committed to the repo**, unlike the gitignored `harness-status.json` snapshot, because
its value is the trend across commits, not any single run. `node scripts/harness-history.mjs`
(no flags) reads that ledger and reports:

- **Promotion candidates** — a non-blocking rule with zero hits for its entire streak of the
  last N (default 10, `--threshold=N`) recorded commits, i.e. the same signal that justified
  promoting `unit-test-coverage`, now surfaced by a command instead of a memory.
- **Never-fired guardrails** — a blocking guardrail with zero hits across its whole tracked
  history, an explicit invitation for a human to check whether it is prevention or dead weight.
- **Chronically firing** — a blocking rule still showing hits on the latest recorded commit,
  which should not happen (the gate should have stopped the merge) and is worth investigating
  as a possible bypass.

Two things this deliberately does **not** do. First, it does not decide anything: promotion is
still a human-or-agent action through the same `isBlocking()` edit and PR this section always
described: this script only makes "has this been quiet long enough?" answerable by a command.
Second, recording is opt-in (`--record`), never a side effect of the report — a file meant to
accumulate the team's shared trend must not be silently rewritten by whoever happens to run a
read-only check locally. Run `--record` at the same point in a change set where you already run
`harness-learn.mjs`, and commit the updated `harness-history.json` alongside the rest of the PR,
the same discipline this repo already applies to other generated-but-tracked files.

### Mutation testing: `scripts/run-mutation.mjs` (Stryker, informational)

§9.4 ("prove a new test can fail") has, until now, been enforced entirely by prose: an agent
hand-mutates the implementation once, watches the test go red, restores it, and states the
mutation in the PR body. That proof is real the moment it's written, and unverifiable a moment
later — nothing re-runs it, and nothing stops a future PR from citing a mutation that was never
actually tried. `scripts/run-mutation.mjs` is the machine-checked version: it runs Stryker Mutator
against an app's logic modules (the same `mutate: ['src/**/*.ts', ...]` scope §5 draws for unit
tests — components/pages are out, for the same reason they're out of unit-test scope) and reports
what fraction of mutants the existing suite actually kills.

It is an **informational sensor**, not a gate, and deliberately so — the same sensor-before-
guardrail policy above applies to a new axis of measurement, not just to new finding types.
`scripts/stryker.shared.mjs` sets `thresholds.break: null` so Stryker itself never exits non-zero
on a low score, `run-mutation.mjs` always exits 0, and `.github/workflows/mutation-testing.yml`
wraps the run in `continue-on-error: true` besides. Promoting a score floor to a blocking check is
a deliberate, later, human decision, once a floor is chosen and any existing backlog is closed —
exactly the arc `unit-test-coverage` went through before it started blocking the gate.

One architectural line worth stating explicitly: this sensor is **not** wired into
`harness-status.mjs`'s `senseApp`, unlike every other sensor in this section. `harness-status.mjs`
is a synchronous, zero-dependency, sub-second sweep — every local invocation and every `--gate`
check pays its cost — and mutation testing takes real wall-clock minutes per app. Folding it into
that scan would quietly break the sense layer's speed contract for every future user of it. It
runs instead as its own script and its own CI workflow, matching the same
sensor-vs-guardrail-vs-gate split, just outside the module that split was originally described in.

Run it locally with `node scripts/run-mutation.mjs <AppName>` (or `--all`); `npm run test:mutation`
inside a given `projects/<app>` runs Stryker directly for a tighter local loop.

### Dependency vulnerability audit: `scripts/check-dependency-audit.mjs` (npm audit, informational)

`test-app.mjs` already runs `npm audit --audit-level=high` as an advisory step (§5) — but it runs
that six times, once per app, against the one shared root lockfile, and only ever prints to that
app's own console output. Nothing tracked it across commits or surfaced it as a single readable
summary. In practice, 11 real advisories (1 high, 8 moderate, 2 low, at the time this was found)
accumulated silently for weeks across four transitive devDependencies — `undici` (via
`promptfoo → ai → @ai-sdk/gateway`, `legal-financial-rag`'s eval tooling), `nanoid` (via `postcss`,
every app's build), `uuid` (via `@capacitor/cli → xcode`, unused iOS tooling in an Android-only
repo), and `qs` (via `@stryker-mutator/core → typed-rest-client`). The only place they surfaced was
a `remote:` warning line on `git push` — real, but easy to never read, and nothing re-surfaced it on
the next push if you didn't. None of the four were in a shipped app bundle (all devDependencies-only
tooling), so there was no live exposure, but an unread advisory is still a debt: the fix, once
looked at, was mostly free — `npm audit fix` resolved 7 of 11 within already-declared semver ranges,
and the remaining `uuid`/`xcode` chain needed only a scoped root `package.json` `overrides` entry
(`{ "xcode": { "uuid": "^11.1.1" } }`), which hoists `xcode`'s `uuid` requirement onto the
already-patched top-level `uuid`, without forcing a `@capacitor/cli` downgrade — the same pattern
this repo's `overrides` block already used once before, for `sharp`/`adm-zip` (PR #182).

`scripts/check-dependency-audit.mjs` is the fix: it runs `npm audit --json` once at the repo root
(works from `package-lock.json` alone — no `node_modules` install required, verified by running it
with `node_modules` renamed away) and prints every advisory, sorted worst-severity-first, in one
place that's part of the PR's own CI log instead of a push warning. Its parsing logic
(`summarizeAudit()`) is pure and self-tested against a fixture shaped like `npm audit`'s real JSON
output, so the self-test never depends on network or the live advisory database — the same
"live third-party API" discipline §6 already requires of E2E specs.

Deliberately outside `harness-status.mjs`'s `senseApp()` sweep, for the same reason mutation testing
is (immediately above): that sweep is a zero-dependency, sub-second, offline scan, and `npm audit`
needs network access and can take real wall-clock seconds — folding it in would break the sense
layer's speed contract. It runs as its own CI step in `sdd-sentinel.yml`, `continue-on-error: true`
like the other non-blocking sensors, and is **not** gated on `github.event_name == 'pull_request'`
the way the diff-shaped sensors are: a new CVE can be published against a version this repo already
has pinned, with no lockfile change in the current PR at all, so it needs to run on every trigger,
not just when the lockfile itself moved.

Non-blocking per the sensor-before-guardrail policy above: it reports advisory counts, it does not
fail `test-app.mjs` or the harness `--gate`. Promoting a severity floor (e.g. "0 high/critical
advisories") to a blocking check is a deliberate, later, human decision, once a floor is chosen —
the same arc `unit-test-coverage` went through before it started blocking the gate.

### Inline PR annotations: `scripts/harness-status-rdjson.mjs` (reviewdog)

§9.1 says "never self-certify verification" for PR bodies — a rule written because an agent's
prose summary of a gate's output once said the opposite of what the gate actually found.
`scripts/harness-status-rdjson.mjs` applies the same fix one level down: it turns every guardrail
hit `harness-status.mjs` finds (each one already carries a `file`/`line`/`snippet` via its
`evidence` array) into a reviewdog rdjsonl diagnostic, posted as an inline PR comment on the exact
line that tripped it. There is no summary step left to get wrong, because the finding lands
directly on the code it's about.

Only guardrail findings translate — they're the one finding shape with a specific line to attach
to. App-level findings (missing spec, spec drift, no Zod schema, ...) have no single line they
belong on, and forcing one onto an arbitrary line would be a worse comment than none; those stay
visible in `harness-status.mjs`'s own console and JSON output, which still runs on every PR.
`-filter-mode=added` (in `.github/workflows/sdd-sentinel.yml`) means only findings that land on
lines the PR itself touched get posted, so a pre-existing hit elsewhere in the repo isn't
re-litigated on every unrelated PR — reviewdog's diff-awareness doing, for free, what a Danger.js
rule would have to reimplement by hand.

This is purely additive: the annotation step runs with `continue-on-error: true` and can never
block a merge on its own. `scripts/harness-status.mjs --gate`, run immediately before it in the
same workflow, remains the actual gate.

### Context staleness detection: `scripts/generate-context-digest.mjs`

Long-running agent sessions — sessions where the gap between first reading a file and pushing a
commit spans more than a few minutes — risk acting on stale context. A concurrent merge may have
changed a spec, a schema, or the guardrail registry between the moment you cached it and the
moment you push. `scripts/generate-context-digest.mjs` writes a `.context-digest.json` snapshot
(gitignored, like `harness-status.json`) of per-app spec/schema hashes, module/test counts, the
current HEAD commit, and the guardrail and lesson counts. Run it:

1. **At session start**: `node scripts/generate-context-digest.mjs` — establishes a baseline.
2. **Before pushing** (if the session has been long-running): `node scripts/generate-context-digest.mjs --diff` — compares the saved baseline against live repo state and reports which apps' specs or schemas changed in the interim.

If `headCommit` differs between the two runs, re-read any changed specs before pushing. This is
advisory only — no CI step, no blocking gate.

### Protocol: adding a learned lesson
When you discover a reusable lesson, decide whether it is **mechanically detectable**:
1. **Mechanical** (a pattern a regex can catch): (a) add a guardrail object to `GUARDRAILS` in `scripts/harness-status.mjs` with a `lesson` field; (b) add a known-bad + known-good case to `scripts/harness-status.test.mjs`; (c) add the lesson bullet to section 6 below and tag it `` `[guardrail: <id>]` ``. Run `.\scripts\harness.ps1 verify` — self-test, learn, and gate must all pass.
2. **Non-mechanical** (needs human judgement): add a plain prose bullet to section 6. Do **not** add a `[guardrail: ...]` tag (there is nothing to enforce it).
Never tag a lesson `[guardrail: <id>]` without a real guardrail of that id — the Learn gate will fail the build.

---

## 9. Opening a pull request: report what you ran, not what you meant to run

Every rule in this section was written after a specific PR shipped a specific defect. They are
stated with the evidence attached because a rule whose cost is visible gets followed, and an
abstract exhortation does not — §5 already said, in bold, that running the harness before pushing
is mandatory and that "CI will tell me" is not an acceptable substitute. A PR ignored it anyway
and then asserted the opposite. Prose alone did not carry the point, so these rules are phrased as
things you *do and paste*, not things you *affirm*.

### 9.1 Never self-certify verification

**Write only what a command actually printed.** Do not write "all checks pass," "CI-clean," or
"harness gate: 0 blocking findings" unless you ran the command in this session and are pasting its
output.

PR #41 shipped with a section headed "Verification (CI-clean)" reporting a passing harness gate and
0 blocking findings. CI was red on that commit: type-check failed and the E2E stage never started
because the same error broke `next build`. Only `npx vitest run` had been run. The unit tests
genuinely did pass — which is how the claim got written — but they were not the gate, and the gate
is what the sentence claimed.

The damage is not the red build; CI catches that. The damage is that a reviewer who trusts the body
merges a broken change, and a reviewer who does not trust it must re-verify everything the body
says, which costs more than an empty body would have.

- A red suite, honestly reported, is fine. Say what failed and why the PR is open anyway.
- "Not run, because …" is fine. CI becomes the record and reviewers read it that way.
- A green suite claimed but not run is not fine, and is the one failure mode this section exists
  to prevent.

The same applies to the PR body's own factual claims about the diff. PR #41 stated that a broken
test fixture "is gone" when it was still in the file. If you assert something about the code, look
at the code first.

### 9.2 Widening a type obligates you to visit every consumer

Adding a member to a `z.enum`, a union, or any exported type is not a local change. Every
`Record<Type, …>`, `switch`, and `Object.keys()` over that type is now incomplete, and the compiler
only catches the subset that is exhaustively typed.

Before pushing such a change, run:

```
grep -rln "<TypeName>" projects/<app>/src/
```

Open **every** file it returns. In the PR body, list each one and say how it handles the new member
or why it needs no change.

**This one is enforced in CI.** `scripts/check-enum-blast-radius.mjs` compares the enum members at
the merge base against HEAD, resolves the inferred type through its `z.infer` alias, and fails the
build if any file referencing that type was neither touched nor named in the PR body. It is
diff-shaped rather than line-shaped, which is why it is a workflow step rather than a
`harness-status.mjs` guardrail — a guardrail's `test(line)` contract cannot express "this changed
relative to another commit". It is self-tested (`check-enum-blast-radius.test.mjs`) against the
real shape of the PR below, so it cannot silently stop firing. Naming a file in the body counts as
handling it, so "needs no change, because …" stays available and stays visible to a reviewer.

PR #41 added `'independent_living'` to `CareTypeSchema`. That type had **seven consumers in the
app; the PR opened two**. Of the five it skipped, three were where the failures lived:

| Skipped file | What it cost |
|---|---|
| `data/costOfCare.ts` | `Record<CareType, string>` was unsatisfied → type-check failed → `next build` failed → the entire Playwright stage never ran |
| `explain/build.ts` | `CARE_TYPE_LABELS[careType]` was `undefined`, and `.toLowerCase()` on it crashed the methodology panel at runtime |
| `app/page.tsx` | the care-type dropdown enumerates that type, so the option became selectable with no cost data and no way to price it |

Fixing all of it touched nine files. Three of the four that actually needed changing were files the
authoring pass never opened.

### 9.3 A new case kind belongs in every existing sweep

Where a suite enumerates cases — a `CASES` array, a table-driven test, an invariant checked across
a spread of fixtures — adding a new kind of case obliges you to add a fixture to that sweep.
Otherwise the suite stays green by not looking.

`explain/build.test.ts` already asserted `isBalanced` across every derivation, in both
engine-value and rendered-string form. PR #41 introduced a code path that broke that invariant in
two panels — one showing `$0.00` of parts against a `$3,500.00` total, the other `$7,500.00`
against `$407,500.00` — and the suite passed throughout, because no fixture in the sweep used the
new care type. The tests were not wrong. They were not looking.

### 9.4 Prove a new test can fail

For every behaviour a PR claims to protect: break the code, watch the test go red, put it back.
State the mutation and its result in the PR body.

PR #41 ended `buyin.test.ts` with

```ts
const _: typeof PlanSchema = undefined as unknown as typeof PlanSchema;
```

described in a comment as a tripwire that would flag drift in `Plan`. The annotation and the
assertion are the same type, so it cannot fail under any change whatsoever. A test that cannot
fail is not weak coverage — it is a false statement about what is covered, and it displaces the
real test nobody now thinks to write.

### 9.5 Scope claims must be achievable

State what a change forces, not what you intended it to touch. PR #41 said "**Engine only.** No UI
changes in this PR" — but the care-type dropdown is built from `Object.keys(CARE_TYPE_LABELS)`, so
the moment the enum gained a member the UI gained an option. The claim could not have been true.

If a change forces a user-visible surface, either handle it or say plainly that it is unhandled.
An unachievable scope claim tells a reviewer not to look where the problem is.

## 10. Definition of Ready / Definition of Done

Sections 2, 5, 8, and 9 already state every rule below in full; nothing here is new. This section
exists because those rules are scattered across the file by topic (spec discipline, testing order,
PR hygiene), and a pre-flight / pre-merge moment benefits from having them in one place to run down.
Where this checklist and the full rule it compresses disagree, the full rule governs — this is a
summary, not a separate source of truth.

### 10.1 Definition of Ready — before you start implementing

- The matching spec in `specs/<app>-spec.md` covers what you're about to build. If it's silent,
  ambiguous, or contradicts the request, that's a stop-and-flag per §2 — not a judgment call to
  resolve on the fly.
- The change fits in one sentence a reviewer could hold you to later. If describing it needs "and,"
  it is more than one change.
- The acceptance criteria are concrete enough to write a failing test against before writing any
  implementation — the §5 "Red" step needs a real target, not a vague one.
- You already know which existing sweeps, fixtures, or enumerated-case tables this change will touch
  (§9.3), and whether it widens an enum or union (§9.2) — so the consumer grep happens before you're
  deep in the diff, not after review flags it.

### 10.2 Definition of Done — before you open, and before you merge

- `node scripts/test-app.mjs <AppName>` has been run in this session, and what you report is its
  actual printed output — not the expected result of the sub-checks you happen to remember running
  (§9.1).
- Every new or changed logic module has a unit test that was red before it went green, or — for a
  backfill on already-working code — a stated mutation that was run and observed to fail (§5).
- `node scripts/harness-status.mjs --gate` has been run and shows 0 blocking findings; this is not
  inferred from the checks above having passed.
- Any type widening names every consumer file from `grep -rln "<TypeName>" projects/<app>/src/` and
  states how each one handles the new case, or why it needs none (§9.2).
- Every sweep that enumerates cases carries a fixture for the new one (§9.3).
- Every "this protects X" claim in the PR body names the mutation that was run against it and the
  result (§9.4).
- The PR's scope claims describe what the diff actually forces, not what you meant to touch (§9.5).
- `README.md`, the relevant `specs/<app>-spec.md`, and `HANDOFF.md` reflect the change, not the
  state before it (§7).

A red suite or a "not run, because …" is an honest Definition of Done failure and belongs in the PR
body verbatim (§9.1) — it is not a reason to skip opening the PR. It is a claimed green that was
never run that this checklist exists to prevent.

## 11. Security & Privacy Baseline

Generic web-app security checklists (server authZ, rate limiting, audit logs) mostly don't apply
here: `portfolio-hub` and `elder-care-planner` make zero runtime network calls at all, and none of
the six apps run a backend this repo owns. What follows is scoped to what these apps actually are —
a mix of fully offline apps, apps that call a handful of external read-only APIs, and apps that
persist sensitive data to `localStorage`/IndexedDB on the user's own device.

- **No secrets in source, and it's enforced, not just asked for.** `scripts/check-secrets.mjs`
  scans every line a PR *adds* (diff-shaped, like `check-enum-blast-radius.mjs`) against
  high-confidence credential patterns (Anthropic, OpenAI, Google, xAI, AWS, GitHub, Slack keys; PEM
  private-key blocks) and runs as a blocking step in `sdd-sentinel.yml`. Unlike the blast-radius and
  guardrail-integrity gates, there is **no PR-body acknowledgment escape hatch** — a real committed
  credential is never something to wave through with a note; rotate it, then remove it from the
  working tree (removing it in a later commit does not remove it from git history). Run
  `node scripts/check-secrets.mjs --tree` locally for a one-time full-tree audit; the CI gate only
  looks at lines a PR itself adds, so it won't re-flag anything already in history.

- **A network call an app makes must be named in that app's spec, and must never carry
  sensitive data off-device.** The six apps are not uniformly offline: `travel-packing-app` calls
  Nominatim, Open-Meteo, and currency/advisory APIs for weather, geocoding, and exchange rates;
  `smart-recipe-app` calls TheMealDB for recipe search; `mood-diner`'s service worker fetches for
  cache-fallback only; `legal-financial-rag`, `elder-care-planner`, and `portfolio-hub` make none at
  application runtime (`legal-financial-rag`'s own README notes Google Fonts still loads once over
  network on first visit, which is why its claim is "no *document or query* content leaves the
  device," not "zero requests ever" — say what you actually mean, per the Cite Confidence lesson in
  §6). The boundary that matters: every existing call sends anonymous lookup parameters (a place
  name, a date, a currency code, a search term) and nothing from a user's financial, health, or care
  plan. Widening what a network call sends — or adding a new call — is a spec change to that app's
  `specs/<app>-spec.md`, not something to add quietly alongside an unrelated feature.

- **No analytics or telemetry SDK without a spec update.** None of the six apps currently ship one
  (checked: no PostHog, Google Analytics, Segment, Plausible, Mixpanel, or Amplitude anywhere in
  `projects/`). That's a deliberate privacy stance for at least `legal-financial-rag` and
  `elder-care-planner`, not an oversight to "fix" — adding one to any app needs the same spec
  contradiction check §1 already requires for any feature, because it changes what that app promises
  never to send off-device.

- **Sensitive data written to persistent client storage needs the same at-rest treatment the app
  already gives that data on its other paths.** `legal-financial-rag` encrypts its vault at rest
  (PBKDF2 + a tamper-evident hash chain, see §6's Node WebCrypto lesson).
  `elder-care-planner`'s own share/export path (`src/lib/share.ts`) has always encrypted a plan
  with AES-GCM + PBKDF2 before it leaves the device — but until a security audit on 2026-08-14
  (PR #214) found it, `savePlan`/`savePlannerState` in `src/lib/storage.ts` wrote that same data
  (income, savings, monthly care costs) to `localStorage` as plain `JSON.stringify(...)`, on every
  autosave. The data had an encrypted-at-rest treatment defined in the same app; the far more
  common code path (routine local persistence, not the occasional export) simply didn't use it.

  **Resolved** (work order `tasks/elder-care-planner-unencrypted-plan-storage.md`, spec §4.1a): the
  key-management decision this bullet originally deferred — a device-bound key with no user
  friction, versus a passphrase gate like `legal-financial-rag`'s — was made and recorded in the
  spec *before* implementing, per §1. A device-bound, non-extractable AES-GCM-256 key
  (`src/lib/planEncryption.ts`, held in IndexedDB) was chosen over a passphrase specifically
  because this app's own spec already rejects any account gate or mandatory friction step "at any
  point," and a forgotten passphrase permanently locking a family out of a parent's care plan is a
  worse failure mode than the plaintext gap it fixes. One edge stayed open on purpose rather than
  fixed silently: the `pagehide` flush (tab close / navigation) cannot rely on an async
  `crypto.subtle.encrypt` completing before the page is torn down — measured to actually lose the
  write under a plain browser reload, not a theoretical concern — so that one flush path writes
  plaintext synchronously, same as it always did, and the next successful save (the next visit, or
  an earlier `visibilitychange`) transparently re-encrypts it. Six existing E2E specs
  (`care-coverage`, `facilities`, `home-sale`, `receipts`) asserted on the raw `localStorage` value
  by plaintext substring purely as a "did the debounced write land yet" synchronization point, and
  had to be rewritten against the new envelope format (`e2e/support.ts`'s `waitForEncryptedSave`);
  one of them genuinely needed to inspect the underlying data shape (a duplicate-array check) and
  now decrypts in-page via `readStoredPlannerState`, since the non-extractable device key never
  leaves the browser for the Node-side test process to read.

  Not tagged as a guardrail: "does this write path handle data as sensitively as another path in
  the same app handles the same data" is exactly the kind of cross-file, judgment-dependent
  property no regex over a line can see — the same shape as several lessons in §6.

## 12. Client-Side Observability

None of these apps run a backend this repo owns, so "observability" doesn't mean server logs,
distributed tracing, or a metrics pipeline — there is no server to instrument. What it means here is
narrower and answerable: **when something breaks at runtime, does the app tell you, without shipping
what broke anywhere off the user's device?**

- **Every app should fail into something, not into a blank page.** `travel-packing-app` set the
  pattern: a structured `Logger` (`src/services/logger.ts`) that persists entries to IndexedDB via
  `idb-keyval` for later inspection, still `console.error`s in dev, and is wired into a top-level
  error boundary (`src/app/error.tsx`) so a render crash shows a recoverable screen instead of a
  blank one. **Coverage is now closed across all six apps**: the Next.js apps
  (`elder-care-planner`, `smart-recipe-app`) each have their own `src/app/error.tsx`, and the three
  Vite apps (`mood-diner`, `portfolio-hub`, `legal-financial-rag`) have the class-component
  equivalent at `src/components/ErrorBoundary.tsx` (`getDerivedStateFromError` for the fallback,
  `componentDidCatch` for reporting), wired in `src/main.tsx` around the root `<App />`, since Vite
  has no framework-level error-boundary convention to lean on. Each app keeps its own copy rather
  than sharing one from a common package — the same deliberate independence the six apps' separate
  dependency versions already reflect. Two things the five new boundaries settled that are worth
  carrying into any future one. (1) *Wrap outside the providers, not inside them*: `mood-diner`'s
  `MonetizationProvider` reads `localStorage` while building its initial state, so a boundary nested
  inside it would not catch the very crash most likely to happen at startup. (2) *The fallback must
  not render the error*: `error.message` and a component stack can quote the user data the app was
  holding when it crashed, so these log to the console and show fixed copy on screen — a boundary
  that helpfully prints the exception is a disclosure bug on an app whose whole promise is that the
  data stays on-device. Both are asserted, not just intended: each Vite app's
  `ErrorBoundary.test.tsx` renders a child that throws a message containing a marker string and
  asserts the marker never reaches `container.textContent`.

- **Nothing observed here leaves the device.** A structured logger is for the same on-device
  inspection §6's debugging lessons already rely on (e.g. the elder-care-planner debounced-autosave
  and hydration-timing bugs) — it is not a telemetry pipeline, and adding one that phones home would
  contradict the privacy stance §11 already states. If a future app genuinely needs remote error
  reporting, that's an explicit spec decision, not a default.

- **Now a reasonable sensor candidate, and still not a guardrail.** §8's policy is to gate a check
  once it describes a regression, not while it still describes a backlog — the same arc
  `senseUnitTests` went through before it started blocking the gate. That precondition is now met:
  with all six apps carrying a boundary, "does `senseApp` find a matching error boundary for this
  app's framework" would report zero findings on the current tree, so adding it describes a
  regression rather than a backlog. It stays prose in this pass only because it was not what this
  audit was asked to build; the next agent to pick it up should add it as a **non-blocking** sensor
  first (`src/app/error.tsx` for a Next.js app, a `getDerivedStateFromError` component reachable
  from `src/main.tsx` for a Vite one) and promote it later, per the same policy. It is a sensor and
  not a `GUARDRAILS` entry for the usual reason: "is this app's root wrapped in a boundary" is an
  absence check across an import graph, which no `test(line)` predicate can express.
