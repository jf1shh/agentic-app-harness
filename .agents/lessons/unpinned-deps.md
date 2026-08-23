# Unpinned Dependencies Drift Without Code Changes

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Unpinned Dependencies Drift Without Code Changes** `[guardrail: unpinned-deps]`: A dependency
  version range (`^1.0.0`, `~1.0.0`, `>=1.0.0`, `latest`, `*`) lets a fresh `npm install` resolve
  a different version than the one the suite passed against. The two peer-set lessons above are
  about *which* version to pin; this is about the pin *existing at all*. A pinned version (`"1.2.3"`)
  only changes when a human or agent deliberately edits it, so a regression is tied to a tracked
  change. An unpinned range drifts on every install, and the failure can surface weeks later on a
  different machine. `workspace:*` is exempt — it is a monorepo protocol, not a range. Pin every
  dependency to an exact version; use the `dependency-doctor` skill (`.agents/skills/dependency-doctor/`)
  to find the existing backlog, and let the guardrail prevent new ones from being added.

**Promoted to blocking.** This guardrail started `manual-review` (non-blocking) because it is a
full-file scan, not diff-shaped — blocking it while any of the tree's 149 pre-existing unpinned
entries remained would have failed CI on files nobody touched in that PR. The backlog (all six
apps) was pinned to each entry's currently-resolved installed version — a text-level replacement,
verified by diffing the regenerated `package-lock.json` and confirming zero `resolved`/`integrity`
lines changed anywhere, i.e. no package's actual installed version moved, only the declared range
tightened to match it. Confirmed with a full `npm run lint` pass across all six apps and two
complete `test-app.mjs` runs. Same arc `unit-test-coverage` went through: non-blocking while it
still described a backlog, blocking once it had nothing left to say about history.
