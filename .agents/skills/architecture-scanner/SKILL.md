---
name: architecture-scanner
description: "Survey a codebase for deepening opportunities — modules with wide public surfaces behind thin facades. Produces a visual HTML report ranking candidates by import count so you can pick one and grill through the refactor."
argument-hint: "[--app <name>] [--output <path>]"
---

# Architecture Scanner

Survey a codebase for "deep module" opportunities — files that export a wide surface
(export count) behind a thin facade (few internal helpers), measured against how many
consumers actually import them. The underlying principle is from John Ousterhout's
_A Philosophy of Software Design_: deep modules do a lot behind a simple interface.

This skill is a survey, not a rescue. It finds candidates and ranks them; it does not
refactor them. Each candidate needs human judgment — some wide exports are legitimate
(constants tables, barrel files), and some thin facades are the right answer (a simple
adapter).

## When to run

- Periodically, every few days while actively building an app.
- When a file grows past ~200 lines and you suspect it's doing too many things.
- When you notice imports like `import { a, b, c, d, e, f, g } from 'src/utils'`.

## Step 1: Locate the target

If `--app <name>` is given, scan `projects/<name>/src/`. If omitted and the agent is
inside a `projects/<app>/` directory, use that app. Otherwise, prompt: "Which app
should I scan?"

Skip generated files (`_generated/`, `*.generated.ts`, `*.generated.tsx`), test files
(`*.test.ts`, `*.spec.ts`), E2E specs (`e2e/`), and type-only files (`*.d.ts`).

## Step 2: Gather module stats

For every `.ts`/`.tsx` file in `src/`:

**Count exports.** Count how many distinct `export` declarations the file has.
Count named exports in `export { ... }` blocks as one each, and `export default`
as one. Don't double-count re-exports (`export { X } from './other'`) — those are
forwarding, not depth.

**Count local helpers.** Count functions, classes, and const declarations that are
NOT exported. An `export function foo()` counts as an export, not a helper. A bare
`function bar()` counts as a helper.

**Count unique consumer files.** For each export, `grep` the rest of `src/` for
imports of that symbol. A file that imports 3 symbols from the module counts as
one consumer, not three. Deduplicate consumers across exports.

**Compute depth score.** A module is "deep" when it has a high ratio of consumers
to exports — many files depend on it, but it exposes few things. The raw score is:

```
depthScore = consumerCount / Math.max(exportCount, 1)
```

## Step 3: Rank and filter

Sort by `depthScore` descending, then by `consumerCount` descending.

Filter out:
- **Score < 3** — fewer than 3 consumers per export isn't interesting.
- **Export count = 1** — a single-export module is already narrow by design.
- **Barrel files** — files whose name is `index.ts` and whose exports are all
  `export { ... } from '...'` re-exports. These are intentional, not accidental.
- **Constants/data tables** — files with >80% of their exports being `const`
  declarations of primitive/object literals (not functions). A wide constants table
  is the right answer.

Flag (but don't filter out) files where `helperCount < exportCount` — these are
"thin" modules whose public surface is larger than their internal machinery,
suggesting they could absorb helpers from elsewhere.

## Step 4: Report

Output as Markdown, or as a standalone HTML file if `--output <path>` is given.
The HTML report should be a single self-contained file with:
- A summary card (app name, total files scanned, top candidate count).
- A ranked table of candidates: file, export count, consumer count, depth score,
  helper count, and a "thin?" flag.
- One-liner descriptions for each: what the module exports, what its consumers
  import most.
- Clicking a row expands the full export list and top 5 consumer files.

The Markdown report is simpler — a ranked table:

```
| Rank | File | Exports | Consumers | Depth Score | Thin? | Notes |
|------|------|---------|-----------|-------------|-------|-------|
| 1 | src/lib/engine/costOfCare.ts | 4 | 38 | 9.5 | no | Core cost data consumed by 6 panels |
| 2 | src/utils/format.ts | 8 | 24 | 3.0 | yes | Thin — 8 exports, 0 helpers. Consider absorbing format helpers from consumers |
```

## Step 5: Grill through the top candidate

If the user picks a candidate (or if only one clear winner exists), walk through
the deepening exercise:

1. **What does this module export?** List every public symbol.
2. **What do consumers actually import?** For each export, list the top 3-5
   consumer files and what they use.
3. **What internal helpers exist?** Count the non-exported machinery.
4. **What could be deepened?** Identify functions in consumer files that call this
   module and could move *into* it — making the module do more behind its existing
   interface.
5. **Propose a plan.** One sentence: "Move `X` from `consumer1.ts` and `Y` from
   `consumer2.ts` into `module.ts` as private helpers behind the existing 4 exports."
6. **Ask for approval** before touching any file.

## Dependencies
- `grep` (for symbol-level import resolution)
- `git ls-files` (alternative to direct filesystem listing)
- No npm packages. All counting is regex-based.

## Verification
- Run on a known app (e.g. `elder-care-planner`). The report must list real files
  with real export/consumer counts.
- No false positives on barrel files or constants tables.
- The HTML output (if used) must open in a browser with no console errors.