# Stage 1 — Sense

## What do I do here?

Deterministically scan every app under `projects/` for missing artifacts, contract/BDD gaps,
spec drift, and guardrail violations. No LLM involved — this is a zero-dependency Node ESM sweep.

## Contract

- **Reads**: `projects/*/src/**`, `specs/*.md`, `.agents/AGENTS.md`'s `GUARDRAILS`-tracked lessons.
- **Runs**: `node scripts/harness-status.mjs` (add `--gate` for the blocking subset, `--strict` to
  also include drift/manual-review findings).
- **Writes**: `harness-status.json` at the repo root (gitignored — regenerate, don't hand-edit).
  See `output/README.md` in this folder for why that file isn't duplicated here.

## Next stage

Findings become work orders in **Propose** (`../propose/`).
