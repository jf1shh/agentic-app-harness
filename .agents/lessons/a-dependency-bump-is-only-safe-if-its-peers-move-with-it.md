# A Dependency Bump Is Only Safe If Its Peers Move With It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

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
