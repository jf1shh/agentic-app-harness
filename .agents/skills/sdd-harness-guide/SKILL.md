---
name: sdd-harness-guide
description: Comprehensive operational guide for AI agents executing Spec-Driven Development (SDD), Zod Contract-First validation, BDD testing, and build management in the Agentic App Harness monorepo.
---

# SDD Harness Operational Guide

As an AI Agent operating within this monorepo (`jf1shh/agentic-app-harness`), follow these core execution procedures:

## 1. Primary Workflow Execution Order

1. **Read Spec First**: Never generate code without reading `specs/<app-name>-spec.md`.
2. **Contract-First Schemas**: Define data models in `src/lib/schemas.ts` or `src/schemas.ts` using `zod`. Infer TypeScript types (`z.infer<typeof Schema>`).
3. **BDD Specification Standard**: Format test scenarios in `Given [Context] -> When [User Action] -> Then [Expected Outcome]`.
4. **Pre/Post Build Cleanup**: Execute `.\scripts\clean-app.ps1` or `npm run clean`.
5. **Verification**: Run `.\scripts\test-app.ps1 -AppName <AppName>`.
6. **Remote Deployment Verification**: When pushing changes triggering GitHub Actions, set a **5-minute reminder timer** (`schedule`) to verify `completed success` and test HTTP 200 responses before declaring completion. Do not run local servers while waiting for remote builds.
7. **Session Wrap-up**: Update `README.md`, `HANDOFF.md`, and execute `/learn` loop.

## 2. CLI Tooling Reference

- `.\scripts\harness.ps1 test all` — Test all monorepo apps.
- `.\scripts\harness.ps1 test <appName>` — Test a specific app.
- `.\scripts\harness.ps1 validate` — Run spec & schema coverage audit.
- `.\scripts\harness.ps1 clean` — Monorepo build cleanup.
- `.\scripts\harness.ps1 mobile <appName>` — Capacitor Android platform build.
