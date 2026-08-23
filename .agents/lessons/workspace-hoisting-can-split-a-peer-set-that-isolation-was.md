# Workspace Hoisting Can Split a Peer Set That Isolation Was Hiding, Without Anyone Bumping a Version

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

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
