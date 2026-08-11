# Glossary

## ICM terms

- **ICM (Interpretable Context Methodology)** — the folder-structure layer this file belongs to:
  plain-text markdown files that give an LLM immediate spatial orientation in a workspace, instead
  of a multi-agent framework. See [ktnCodes/icm-template](https://github.com/ktnCodes/icm-template).
- **Layer 0 (`IDENTITY.md`)** — "Where am I?": the workspace map.
- **Layer 1 (`CONTEXT.md`)** — "Where do I go?": task routing.
- **Layer 2 (stage `CONTEXT.md`)** — "What do I do?": not used in this repo (quick mode only —
  see below).
- **Layer 3 (`_config/`)** — "What rules apply?": conventions, glossary, voice — this folder.
- **Layer 4 (`output/`)** — working artifacts of a staged pipeline; not applicable here.
- **Quick mode** — the ICM adoption path used in this repo: layers 0/1/3 only, laid on top of the
  existing structure without restructuring it. (As opposed to "full mode," which adds physical
  stage folders with contracts and output directories — appropriate for a from-scratch pipeline,
  not a monorepo of six already-structured apps.)

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
