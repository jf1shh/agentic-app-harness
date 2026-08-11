# Stage 4 — Verify

## What do I do here?

Re-run the deterministic checks as a blocking CI gate. A PR cannot merge while this stage is red.

## Contract

- **Reads**: the PR's diff against the merge base.
- **Runs** (all invoked by `.github/workflows/sdd-sentinel.yml` and `ci.yml`):
  - `node scripts/harness-status.mjs --gate` — guardrail regressions + missing specs (blocking).
  - `node scripts/check-enum-blast-radius.mjs` — a widened enum/union with an unvisited consumer.
  - `node scripts/check-doc-claims.mjs --gate` — checked-in docs match what they claim.
  - `node scripts/check-guardrail-integrity.mjs --base origin/master --head HEAD` — blocks a
    deleted guardrail or shrunk gate self-test.
  - `node scripts/test-app.mjs <AppName>` per app — security audit, lint, type-check, Vitest,
    Playwright + axe a11y.
  - `.\scripts\validate-specs.ps1 -Strict` — every app has a spec, README, Zod usage, BDD specs.
- **Writes**: a pass/fail CI status on the PR, and (informationally, never blocking) inline
  reviewdog annotations via `scripts/harness-status-rdjson.mjs`.

## Next stage

A merged PR's guardrail counts get snapshotted in **Learn** (`../learn/`).
