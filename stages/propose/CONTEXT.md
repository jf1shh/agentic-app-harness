# Stage 2 — Propose

## What do I do here?

Turn each Sense finding into a self-contained, bring-your-own-agent work order — a task any
agent (human-directed or autonomous) can pick up without re-deriving context from the finding.

## Contract

- **Reads**: `harness-status.json` (Sense's output, repo root).
- **Runs**: `node scripts/emit-tasks.mjs` (add `--prune` to retire work orders whose findings are
  now resolved).
- **Writes**: `tasks/<id>.md` — see `tasks/README.md` for the work-order contract itself (what
  fields a task carries, what "done" means). See `output/README.md` in this folder for why the
  files live in `tasks/` rather than here.

## Next stage

An agent claims an open task and moves to **Act** (`../act/`).
