# Contributing to Agentic App Harness

Thank you for your interest in contributing to the **Agentic App Harness**! This monorepo enforces strict **Spec-Driven Development (SDD)**, **Contract-First Schema Validation**, and **Behavior-Driven Development (BDD)** testing.

**New here?** [`IDENTITY.md`](IDENTITY.md) is a one-page workspace map and [`CONTEXT.md`](CONTEXT.md)
is a task-routing table ("what do you want to do → where do you go") — read those before digging
through the tree by hand. Both are part of this repo's [ICM](https://github.com/ktnCodes/icm-template)
navigation layer, additive on top of the rules below, not a replacement for them.

**Building something end-to-end?** [`docs/APP_DEVELOPMENT_CYCLE.md`](docs/APP_DEVELOPMENT_CYCLE.md)
sequences the rules below — spec, scaffold, contract-first schemas, test-first build, E2E/a11y, the
gate, PR discipline, and the harness loop that takes over after merge — into the order you'd
actually follow, with a one-page checklist at the end.

---

## 🚀 SDD Workflow Guidelines

All contributions must follow our spec-driven workflow:

1. **Spec First**: Never write implementation code directly without a specification file in `specs/`. Read the spec before opening a Pull Request.
2. **Contract-First Schemas**: All data structures must be defined as runtime Zod schemas (`zod`) in `src/lib/schemas.ts` or `src/schemas.ts`, with inferred TypeScript types (`z.infer<typeof Schema>`).
3. **BDD Test Standard**: Write unit tests (Vitest) and End-to-End tests (Playwright) using explicit `Given [Context] -> When [Action] -> Then [Outcome]` scenario formatting.
4. **Master Harness Verification**: Before submitting a PR, run the master verification script:
   ```
   node scripts/test-app.mjs <AppName>
   ```
   Cross-platform Node ESM — this is the authoritative gate, and the one CI runs.
   `.\scripts\test-app.ps1 -AppName <AppName>` is a thin PowerShell wrapper around
   the same script, kept for local muscle memory on Windows.

   Your contribution must pass all Security Audit (`npm audit`), Code Linting (`eslint`), Type Check (`tsc`), Vitest unit tests, and Playwright a11y audits.

---

## 🛠️ Monorepo Applications

- `projects/portfolio-hub`: Master Showcase Web Portal (Port 3009).
- `projects/mood-diner`: Smart Restaurant Recommender & Booking Engine (Port 5178).
- `projects/travel-packing-app`: Smart Wardrobe & Knapsack Weight Assistant (Port 3000).
- `projects/smart-recipe-app`: Smart Kitchen Recipe Manager (Port 3005).
- `projects/legal-financial-rag`: 100% Client-Side Private RAG for Legal Counsel & Financial Compliance (Port 3010).
- `projects/elder-care-planner`: Offline-first elder care cost, runway and family cost-sharing planner (Port 3011).

---

## 📦 Pull Request Process

1. Fork the repository and create your feature branch (`git checkout -b feature/my-feature`).
2. Implement your changes following SDD rules in `.agents/AGENTS.md`.
3. Run `npm run clean` in the app directory (or `.\scripts\clean-app.ps1`) and `node scripts/test-app.mjs <AppName>` (or `.\scripts\test-app.ps1 -AppName <AppName>`).
4. Commit your changes (`git commit -m "feat: description of change"`).
5. Push to your branch (`git push origin feature/my-feature`) and open a Pull Request.
