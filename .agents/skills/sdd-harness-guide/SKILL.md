---
name: sdd-harness-guide
description: Quick-reference pointer to the Agentic App Harness operational workflow and CLI, for AI agents working in this monorepo.
---

# SDD Harness Operational Guide

The authoritative workflow and rules live in [`.agents/AGENTS.md`](../../AGENTS.md) — read it
in full before changing code. It is deliberately **not** restated here: `_config/conventions.md`
already documents why a second copy of the rules drifts the moment either is edited. This file
is a pointer plus the few operational notes that live nowhere else.

## Where the workflow lives

- **End-to-end sequence (idea → spec → build → gate → PR → harness loop):**
  [`docs/APP_DEVELOPMENT_CYCLE.md`](../../../docs/APP_DEVELOPMENT_CYCLE.md) — ordered Phases 0–9.
- **Binding rules** (spec-first, Zod contract-first, BDD `Given → When → Then`, testing, the
  agentic loop, PR discipline): [`.agents/AGENTS.md`](../../AGENTS.md) §1–§9.
- **Orientation first:** [`IDENTITY.md`](../../../IDENTITY.md) (workspace map) and
  [`CONTEXT.md`](../../../CONTEXT.md) (task routing) at the repo root.

## CLI quick reference

- `.\\scripts\\harness.ps1 test all` — run the full per-app gate across every app.
- `.\\scripts\\harness.ps1 test <appName>` — run it for one app (wraps `scripts/test-app.mjs`).
- `node scripts/test-app.mjs <AppName>` — the authoritative per-app gate directly (lint, tsc,
  Vitest, Playwright + axe a11y); add `--changed` to gate only the apps this diff touches.
- `.\\scripts\\harness.ps1 validate` — spec & schema coverage audit.
- `.\\scripts\\harness.ps1 status` / `tasks` / `verify` / `learn` — the agentic loop stages.
- `.\\scripts\\harness.ps1 clean` — monorepo build cleanup.
- `.\\scripts\\harness.ps1 mobile <appName>` — Capacitor Android platform build.

## Operational notes (not stated elsewhere)

- **Remote deploys need a follow-up check.** After pushing changes that trigger GitHub Actions,
  set a ~5-minute reminder to confirm the workflow reported `completed success` and the deployed
  URL answers HTTP 200 before declaring the task done. Do not run a local server while waiting
  for a remote build — it verifies nothing the remote will ship.
