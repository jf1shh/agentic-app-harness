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
