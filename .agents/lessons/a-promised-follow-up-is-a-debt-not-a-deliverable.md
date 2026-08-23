# A Promised Follow-Up Is a Debt, Not a Deliverable

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

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
