# Glossary

## ICM terms

- **ICM (Interpretable Context Methodology)** — the folder-structure layer this file belongs to:
  plain-text markdown files that give an LLM immediate spatial orientation in a workspace, instead
  of a multi-agent framework. Originated in
  [RinDig/Interpretable-Context-Methodology](https://github.com/RinDig/Interpretable-Context-Methodology);
  this repo adopts it via the derived [ktnCodes/icm-template](https://github.com/ktnCodes/icm-template).
- **Layer 0 (`IDENTITY.md`)** — "Where am I?": the workspace map.
- **Layer 1 (`CONTEXT.md`)** — "Where do I go?": task routing.
- **Layer 2 (stage `CONTEXT.md`)** — "What do I do, in this stage?": `stages/<stage>/CONTEXT.md`,
  one per stage of the harness's Sense → Propose → Act → Verify → Learn loop.
- **Layer 3 (`_config/`)** — "What rules apply?": conventions, glossary, voice — this folder.
- **Layer 4 (`output/`)** — "Where does this stage's output actually live?":
  `stages/<stage>/output/README.md` points at the real artifact (`harness-status.json`,
  `tasks/*.md`, a PR, CI status, `harness-history.json`) rather than duplicating it.
- **Full mode** — the ICM adoption path used in this repo: all five layers. Layer 2/4 are mapped
  onto the harness's own five-stage loop (`.agents/AGENTS.md` §8) — the one process in this repo
  that is already staged with defined inputs and outputs — rather than onto the six apps under
  `projects/`, which are independent products, not pipeline stages of one workflow.
- **`/icm-scaffold`, `/icm-sync`, `/icm-context-scaffold`** — Claude Code skills installed at
  `.claude/skills/`, sourced from [ktnCodes/icm-template](https://github.com/ktnCodes/icm-template),
  that generate and maintain this ICM layer: scaffold it from scratch, re-sync `IDENTITY.md`/
  `CONTEXT.md` against the folders actually on disk, or backfill a missing `CONTEXT.md`.

## Repo terms

- **App** — one of the six independent products under `projects/` (`portfolio-hub`, `mood-diner`,
  `travel-packing-app`, `smart-recipe-app`, `legal-financial-rag`, `elder-care-planner`), each with
  its own `package.json`, spec, and test suite.
- **Harness** — the deterministic, LLM-free toolchain in `scripts/` that senses drift, proposes
  work orders, and gates CI. See `.agents/AGENTS.md` §8.
- **Guardrail** — a line-level, self-tested regex rule in `scripts/harness-status.mjs`'s
  `GUARDRAILS` array; every hit blocks the merge gate and traces back to a lesson in
  `.agents/AGENTS.md` §6.
- **Sensor** — a non-line-level check in `senseApp` (e.g. missing spec, missing release config)
  that reports absence rather than a regression; starts non-blocking, promoted to blocking once its
  backlog is closed.
- **Gate** — `node scripts/harness-status.mjs --gate`, the blocking CI check that fails on
  guardrail hits and missing specs.
- **Work order** — a self-contained task file under `tasks/`, emitted by `scripts/emit-tasks.mjs`
  from a harness finding; any agent may claim one and open a PR.
- **Spec** — `specs/<app-name>-spec.md`, the single source of truth for an app's architecture,
  data models, and acceptance criteria, read before any code change to that app.
