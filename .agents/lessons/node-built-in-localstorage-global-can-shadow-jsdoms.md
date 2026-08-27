# Node's Built-In `localStorage` Global Can Shadow jsdom's, Invisibly to a Pinned-Node CI

- **Node's Built-In `localStorage` Global Can Shadow jsdom's, Invisibly to a Pinned-Node CI**:
  `smart-recipe-app/src/lib/data.test.ts` failed all 15 of its cases on a local run with
  `TypeError: Cannot read properties of undefined (reading 'clear')` on `localStorage.clear()` in
  `beforeEach` — on a machine running Node 26.7.0, despite `vitest.config.ts` correctly declaring
  `environment: 'jsdom'`. It was not a style problem: a scratch probe proved every access form
  (`localStorage.clear()`, `window.localStorage.clear()`, `globalThis.localStorage.clear()`) failed
  identically. The actual cause is a Node/jsdom version interaction — Node 22+ ships its own
  experimental `localStorage`/`sessionStorage` globals, present on `globalThis` by default and
  non-functional without a `--localstorage-file` flag (`ExperimentalWarning: localStorage is not
  available because --localstorage-file was not provided`). That property already existing is
  enough to make Vitest's jsdom environment skip installing its own working `Storage` instance
  under the same name, so the global resolves to Node's broken stub instead. Running with
  `NODE_OPTIONS=--no-experimental-webstorage` removes Node's own accessor before jsdom's
  environment setup runs, and all 47 tests in the file pass.

  This was invisible in CI: `ci.yml` and `sdd-sentinel.yml` both pin Node 20, which predates the
  built-in entirely, so the shadowing never happens there. It surfaced only because a local session
  ran on a newer Node — and nothing in the repo would have caught that divergence: there is no
  `.nvmrc` or root `package.json` `engines.node` pinning contributors to Node 20, so `AGENTS.md`
  §5's own instruction to trust a local `node scripts/test-app.mjs <app>` run over "CI will catch
  it" can quietly stop being true depending on which Node happens to be on a contributor's `PATH`.
  That gap is real but deliberately not closed here — it's a separate, mechanically detectable
  absence check (does a Node version pin exist and match CI's) that belongs in its own sensor, not
  bundled into this fix.

  **Fixed centrally, not per-app**: `test-app.mjs`'s Vitest step now probes
  `node --no-experimental-webstorage -e ''` once and, only if that exits `0`, adds
  `NODE_OPTIONS=--no-experimental-webstorage` to the env it spawns `vitest run` with. The probe
  guard matters as much as the fix: the flag doesn't exist on Node 20, and an unrecognized `node`
  flag aborts the process before running anything at all — passing it unconditionally would have
  taken down every app's unit-test step in CI, not just fixed the one that hit this locally. Scoped
  to the one shared script every app's unit tests run through, so any of the other five apps that
  later adds a unit test touching the real Storage API is already covered.

  Not tagged as a guardrail: `smart-recipe-app`'s test file was already correct application/test
  code — `localStorage.clear()` in a jsdom-environment test is exactly the right way to write that
  assertion, and `elder-care-planner`'s alternative of injecting a `StorageLike` fake is a different
  valid design choice, not a rule this one was violating. The defect was in the shared runner's
  environment, not in a line of source a regex could flag as wrong on its own.
