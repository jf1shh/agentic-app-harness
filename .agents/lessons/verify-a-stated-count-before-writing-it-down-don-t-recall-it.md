# Verify a Stated Count Before Writing It Down — Don't Recall It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

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
