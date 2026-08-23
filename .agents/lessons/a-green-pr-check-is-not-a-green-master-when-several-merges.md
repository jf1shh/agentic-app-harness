# A Green PR Check Is Not a Green Master, When Several Merges Share One Lockfile

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

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
