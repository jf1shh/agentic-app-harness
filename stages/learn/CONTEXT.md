# Stage 5 — Learn

## What do I do here?

Close the loop: enforce that every guardrail traces to a documented lesson, and record this
commit's per-rule finding counts so promotion/demotion decisions (blocking vs. informational) are
data-driven instead of remembered.

## Contract

- **Reads**: `.agents/AGENTS.md` §6 lesson bullets and their `[guardrail: <id>]` tags,
  `scripts/harness-status.mjs`'s `GUARDRAILS` + `allRuleMeta()` registry.
- **Runs**:
  - `node scripts/harness-learn.mjs` — blocking: every guardrail ⇄ lesson ⇄ self-test link
    resolves both directions.
  - `node scripts/harness-history.mjs --record` — snapshot this commit's per-rule finding counts.
  - `node scripts/harness-history.mjs` — report promotion candidates and never-fired guardrails.
- **Writes**: `harness-history.json` at the repo root (git-tracked ledger — commit it alongside
  the rest of the PR), plus, when a lesson is discovered, a new bullet in `.agents/AGENTS.md` §6
  and optionally a new guardrail. See `output/README.md` in this folder.

## Loop closes here

A promotion decision made here (e.g. `senseUnitTests` → blocking) changes what **Verify** enforces
on the next PR — the loop feeds back into `../verify/`.
