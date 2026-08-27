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

- **Every agent re-reads and conforms to the harness instructions on every task.** — see [`.agents/lessons/every-agent-re-reads-and-conforms-to-the-harness.md`](lessons/every-agent-re-reads-and-conforms-to-the-harness.md).
- **Authentic Real-World Datasets** — see [`.agents/lessons/authentic-real-world-datasets.md`](lessons/authentic-real-world-datasets.md).
- **Vitest vs. Playwright Test Separation** — see [`.agents/lessons/vitest-vs-playwright-test-separation.md`](lessons/vitest-vs-playwright-test-separation.md).
- **Modal Component State Sync** — see [`.agents/lessons/modal-component-state-sync.md`](lessons/modal-component-state-sync.md).
- **Playwright Strict Mode Selectors** — see [`.agents/lessons/playwright-strict-mode-selectors.md`](lessons/playwright-strict-mode-selectors.md).
- **Dynamic Generator & E2E Fixture Decoupling** — see [`.agents/lessons/dynamic-generator-e2e-fixture-decoupling.md`](lessons/dynamic-generator-e2e-fixture-decoupling.md).
- **Multi-Constraint Schedule Fallbacks** — see [`.agents/lessons/multi-constraint-schedule-fallbacks.md`](lessons/multi-constraint-schedule-fallbacks.md).
- **Monorepo Dev Server Port Collisions** — see [`.agents/lessons/monorepo-dev-server-port-collisions.md`](lessons/monorepo-dev-server-port-collisions.md).
- **Accessibility (a11y) Color Contrast** — see [`.agents/lessons/accessibility-a11y-color-contrast.md`](lessons/accessibility-a11y-color-contrast.md).
- **Accessibility (a11y) Tablist ARIA Scoping** — see [`.agents/lessons/accessibility-a11y-tablist-aria-scoping.md`](lessons/accessibility-a11y-tablist-aria-scoping.md).
- **Strict TypeScript in Harness** `[guardrail: explicit-any]` — see [`.agents/lessons/explicit-any.md`](lessons/explicit-any.md).
- **Mobile PWA Viewport Accessibility** `[guardrail: viewport-no-zoom]` — see [`.agents/lessons/viewport-no-zoom.md`](lessons/viewport-no-zoom.md).
- **Fast Refresh Export Scoping** — see [`.agents/lessons/fast-refresh-export-scoping.md`](lessons/fast-refresh-export-scoping.md).
- **Next.js Static Export Server Action Scoping** — see [`.agents/lessons/next-js-static-export-server-action-scoping.md`](lessons/next-js-static-export-server-action-scoping.md).
- **PWA Service Worker Subpath Scoping** `[guardrail: root-service-worker]` — see [`.agents/lessons/root-service-worker.md`](lessons/root-service-worker.md).
- **Node WebCrypto TypedArray Buffer Normalization** `[guardrail: pbkdf2-salt-buffer]` — see [`.agents/lessons/pbkdf2-salt-buffer.md`](lessons/pbkdf2-salt-buffer.md).
- **Harness CI Dependency Guarding** — see [`.agents/lessons/harness-ci-dependency-guarding.md`](lessons/harness-ci-dependency-guarding.md).
- **Responsive Grid Layouts** `[guardrail: responsive-grid]` — see [`.agents/lessons/responsive-grid.md`](lessons/responsive-grid.md).
- **Test the Artifact You Ship, at Every Origin It Ships To** — see [`.agents/lessons/test-the-artifact-you-ship-at-every-origin-it-ships-to.md`](lessons/test-the-artifact-you-ship-at-every-origin-it-ships-to.md).
- **A Dependency Bump Is Only Safe If Its Peers Move With It** — see [`.agents/lessons/a-dependency-bump-is-only-safe-if-its-peers-move-with-it.md`](lessons/a-dependency-bump-is-only-safe-if-its-peers-move-with-it.md).
- **Workspace Hoisting Can Split a Peer Set That Isolation Was Hiding, Without Anyone Bumping a Version** — see [`.agents/lessons/workspace-hoisting-can-split-a-peer-set-that-isolation-was.md`](lessons/workspace-hoisting-can-split-a-peer-set-that-isolation-was.md).
- **Format a Total and Its Parts at the Same Precision** — see [`.agents/lessons/format-a-total-and-its-parts-at-the-same-precision.md`](lessons/format-a-total-and-its-parts-at-the-same-precision.md).
- **Cite Confidence, Not Just Sources** — see [`.agents/lessons/cite-confidence-not-just-sources.md`](lessons/cite-confidence-not-just-sources.md).
- **Explain the Arithmetic Without Re-implementing It** — see [`.agents/lessons/explain-the-arithmetic-without-re-implementing-it.md`](lessons/explain-the-arithmetic-without-re-implementing-it.md).
- **A Playwright `fill()` Before Hydration Is Swallowed, and It Looks Like a Broken Control** — see [`.agents/lessons/a-playwright-fill-before-hydration-is-swallowed-and-it.md`](lessons/a-playwright-fill-before-hydration-is-swallowed-and-it.md).
- **A Debounced Autosave Loses the Last Thing Typed** — see [`.agents/lessons/a-debounced-autosave-loses-the-last-thing-typed.md`](lessons/a-debounced-autosave-loses-the-last-thing-typed.md).
- **An E2E Test That Calls a Live Third-Party API Outsources Your Build Status** — see [`.agents/lessons/an-e2e-test-that-calls-a-live-third-party-api-outsources.md`](lessons/an-e2e-test-that-calls-a-live-third-party-api-outsources.md).
- **A Flat Line Has No Bounding Box, and Playwright Calls It Hidden** — see [`.agents/lessons/a-flat-line-has-no-bounding-box-and-playwright-calls-it.md`](lessons/a-flat-line-has-no-bounding-box-and-playwright-calls-it.md).
- **A Binary Attachment Must Not Share a Storage Budget With the Record It Annotates** — see [`.agents/lessons/a-binary-attachment-must-not-share-a-storage-budget-with.md`](lessons/a-binary-attachment-must-not-share-a-storage-budget-with.md).
- **Not Every Displayed Total Is a Sum, and Forcing One Into the Sum Check Breaks Both** — see [`.agents/lessons/not-every-displayed-total-is-a-sum-and-forcing-one-into-the.md`](lessons/not-every-displayed-total-is-a-sum-and-forcing-one-into-the.md).
- **`getByLabel` Matches a Substring of the Accessible Name, So One Label Can Resolve to Two Controls** — see [`.agents/lessons/getbylabel-matches-a-substring-of-the-accessible-name-so.md`](lessons/getbylabel-matches-a-substring-of-the-accessible-name-so.md).
- **Capacitor Absolute Base Path** `[guardrail: capacitor-absolute-base]` — see [`.agents/lessons/capacitor-absolute-base.md`](lessons/capacitor-absolute-base.md).
- **Prove a New Test Can Fail** `[guardrail: no-op-assertion]` — see [`.agents/lessons/no-op-assertion.md`](lessons/no-op-assertion.md).
- **Collapsing a Page Hides Whatever the Page Was Promising** — see [`.agents/lessons/collapsing-a-page-hides-whatever-the-page-was-promising.md`](lessons/collapsing-a-page-hides-whatever-the-page-was-promising.md).
- **A Containment Assertion Is Not a Coverage Assertion, and a Derived Figure Must Not Inherit Its Row's Confidence** — see [`.agents/lessons/a-containment-assertion-is-not-a-coverage-assertion-and-a.md`](lessons/a-containment-assertion-is-not-a-coverage-assertion-and-a.md).
- **Two Bases On One Page Is a Defect Even When Both Are Right** — see [`.agents/lessons/two-bases-on-one-page-is-a-defect-even-when-both-are-right.md`](lessons/two-bases-on-one-page-is-a-defect-even-when-both-are-right.md).
- **An Axis Label Is Not the Feature; the Event On It Is** — see [`.agents/lessons/an-axis-label-is-not-the-feature-the-event-on-it-is.md`](lessons/an-axis-label-is-not-the-feature-the-event-on-it-is.md).
- **One Fact Stated Twice Will Eventually Be Stated Two Ways** — see [`.agents/lessons/one-fact-stated-twice-will-eventually-be-stated-two-ways.md`](lessons/one-fact-stated-twice-will-eventually-be-stated-two-ways.md).
- **A Fragment-Only Navigation Does Not Remount, So a Mount Effect Alone Misses It** — see [`.agents/lessons/a-fragment-only-navigation-does-not-remount-so-a-mount.md`](lessons/a-fragment-only-navigation-does-not-remount-so-a-mount.md).
- **A Tamper Test on Base64(url) Text Can Silently Tamper Nothing** — see [`.agents/lessons/a-tamper-test-on-base64-url-text-can-silently-tamper-nothing.md`](lessons/a-tamper-test-on-base64-url-text-can-silently-tamper-nothing.md).
- **A `<select>` in a Table Cell Can Defeat `overflow-x: auto` on Its Own Wrapper** — see [`.agents/lessons/a-select-in-a-table-cell-can-defeat-overflow-x-auto-on-its.md`](lessons/a-select-in-a-table-cell-can-defeat-overflow-x-auto-on-its.md).
- **A Sweep for "Mobile Formatting Is Weird" Needs `flexWrap` Everywhere and Real Overflow Measurement, Not Eyeballing** — see [`.agents/lessons/a-sweep-for-mobile-formatting-is-weird-needs-flexwrap.md`](lessons/a-sweep-for-mobile-formatting-is-weird-needs-flexwrap.md).
- **A Drag-and-Drop Library's Auto-Scroll Invalidates Coordinates Measured Before the Drag Started** — see [`.agents/lessons/a-drag-and-drop-library-s-auto-scroll-invalidates.md`](lessons/a-drag-and-drop-library-s-auto-scroll-invalidates.md).
- **A Monetization UI That Shows Real Prices Needs a Real Purchase Behind It** — see [`.agents/lessons/a-monetization-ui-that-shows-real-prices-needs-a-real.md`](lessons/a-monetization-ui-that-shows-real-prices-needs-a-real.md).
- **A Green PR Check Is Not a Green Master, When Several Merges Share One Lockfile** — see [`.agents/lessons/a-green-pr-check-is-not-a-green-master-when-several-merges.md`](lessons/a-green-pr-check-is-not-a-green-master-when-several-merges.md).
- **A Contract That Exists But Isn't Wired Is Not a Contract** — see [`.agents/lessons/a-contract-that-exists-but-isn-t-wired-is-not-a-contract.md`](lessons/a-contract-that-exists-but-isn-t-wired-is-not-a-contract.md).
- **A "Wait for the Save to Land" Helper Returns on ANY Save, So a Before/After Payload Measurement Must First Wait for the Entity That Makes the Baseline Meaningful** — see [`.agents/lessons/a-wait-for-the-save-to-land-helper-returns-on-any-save-so-a.md`](lessons/a-wait-for-the-save-to-land-helper-returns-on-any-save-so-a.md).
- **The Rulebook's Lesson Count Is Load-Bearing Data, Not Documentation** — see [`.agents/lessons/the-rulebook-s-lesson-count-is-load-bearing-data-not.md`](lessons/the-rulebook-s-lesson-count-is-load-bearing-data-not.md).
- **A GPU-less Container Cannot Create a WebGL Context in the Pinned Headless Shell — Degrade Gracefully, and Test the No-WebGL Path** — see [`.agents/lessons/a-gpu-less-container-cannot-create-a-webgl-context-in-the.md`](lessons/a-gpu-less-container-cannot-create-a-webgl-context-in-the.md).
- **Verify a Stated Count Before Writing It Down — Don't Recall It** — see [`.agents/lessons/verify-a-stated-count-before-writing-it-down-don-t-recall-it.md`](lessons/verify-a-stated-count-before-writing-it-down-don-t-recall-it.md).
- **`localStorage` Throws — It Does Not Merely Return Null — and a Root Provider Is the Worst Place to Learn That** — see [`.agents/lessons/localstorage-throws-it-does-not-merely-return-null-and-a.md`](lessons/localstorage-throws-it-does-not-merely-return-null-and-a.md).
- **`JSON.parse('null')` Succeeds, So a `try`/`catch` Around the Parse Is Not a Validation** — see [`.agents/lessons/json-parse-null-succeeds-so-a-try-catch-around-the-parse-is.md`](lessons/json-parse-null-succeeds-so-a-try-catch-around-the-parse-is.md).
- **A Promised Follow-Up Is a Debt, Not a Deliverable** — see [`.agents/lessons/a-promised-follow-up-is-a-debt-not-a-deliverable.md`](lessons/a-promised-follow-up-is-a-debt-not-a-deliverable.md).
- **Unpinned Dependencies Drift Without Code Changes** `[guardrail: unpinned-deps]` — see [`.agents/lessons/unpinned-deps.md`](lessons/unpinned-deps.md).
- **Ease-In Timing On Enter Animations Feels Jarring** `[guardrail: ease-in-on-enter]` — see [`.agents/lessons/ease-in-on-enter.md`](lessons/ease-in-on-enter.md).
- **Hidden Text Overflow Must Indicate Truncation** `[guardrail: text-truncate-missing]` — see [`.agents/lessons/text-truncate-missing.md`](lessons/text-truncate-missing.md).
- **A Dead `public/` File Ships in Every Build, and No Line-Level Rule Can See It** — see [`.agents/lessons/a-dead-public-file-ships-in-every-build-and-no-line-level.md`](lessons/a-dead-public-file-ships-in-every-build-and-no-line-level.md).
- **Node's Built-In `localStorage` Global Can Shadow jsdom's, Invisibly to a Pinned-Node CI** — see [`.agents/lessons/node-built-in-localstorage-global-can-shadow-jsdoms.md`](lessons/node-built-in-localstorage-global-can-shadow-jsdoms.md).

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
Section 6 below is a lean **index** — one line per lesson, linking to the full text in its own file
under `.agents/lessons/<slug>.md` (see `docs/SLIM_RULEBOOK_PROPOSAL.md` for why: the full prose used
to load into every agent session regardless of relevance, and was over half this file's size). A new
lesson gets **two** pieces, not one:
1. **The full lesson**, written in `.agents/lessons/<slug>.md` (slug = the guardrail id if mechanical,
   otherwise a short kebab-case slug of the title) — the actual explanation, evidence, and any
   sub-points, exactly as much detail as the old inline bullets carried.
2. **A one-line index entry** in section 6 below: `` - **<Title>**`[guardrail: <id>]` — see [`.agents/lessons/<slug>.md`](lessons/<slug>.md). `` (omit the tag for a non-mechanical lesson). The **title text on this
   index line is load-bearing**: `harness-learn.mjs` checks that a guardrail's declared `lesson`
   string is a substring of the line carrying its `[guardrail: <id>]` tag, so the index line's bold
   title must match the guardrail's `lesson:` field in `scripts/harness-status.mjs` verbatim.

Then, decide whether the lesson is **mechanically detectable**:
1. **Mechanical** (a pattern a regex can catch): (a) add a guardrail object to `GUARDRAILS` in `scripts/harness-status.mjs` with a `lesson` field matching the index line's title exactly; (b) add a known-bad + known-good case to `scripts/harness-status.test.mjs`; (c) tag the index line `` `[guardrail: <id>]` ``. Run `.\scripts\harness.ps1 verify` — self-test, learn, and gate must all pass.
2. **Non-mechanical** (needs human judgement): the index line carries no `[guardrail: ...]` tag (there is nothing to enforce it).
Never tag an index line `[guardrail: <id>]` without a real guardrail of that id — the Learn gate will fail the build. `node scripts/check-loop-stats.mjs` will fail if `.agents/AGENTS.md`'s lesson count (one `^- \*\*` line per lesson, same as before the split) drifts from the fixture portfolio-hub commits — regenerate it (`cd projects/portfolio-hub && npm run generate:loop-stats`) after adding a lesson.

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
