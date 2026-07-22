# Contributing to Agentic App Harness

Thank you for your interest in contributing to the **Agentic App Harness**! This monorepo enforces strict **Spec-Driven Development (SDD)**, **Contract-First Schema Validation**, and **Behavior-Driven Development (BDD)** testing.

---

## 🚀 SDD Workflow Guidelines

All contributions must follow our spec-driven workflow:

1. **Spec First**: Never write implementation code directly without a specification file in `specs/`. Read the spec before opening a Pull Request.
2. **Contract-First Schemas**: All data structures must be defined as runtime Zod schemas (`zod`) in `src/lib/schemas.ts` or `src/schemas.ts`, with inferred TypeScript types (`z.infer<typeof Schema>`).
3. **BDD Test Standard**: Write unit tests (Vitest) and End-to-End tests (Playwright) using explicit `Given [Context] -> When [Action] -> Then [Outcome]` scenario formatting.
4. **Master Harness Verification**: Before submitting a PR, run the master verification script:
   ```powershell
   .\scripts\test-app.ps1 -AppName <AppName>
   ```
   Your contribution must pass all Security Audit (`npm audit`), Code Linting (`eslint`), Type Check (`tsc`), Vitest unit tests, and Playwright a11y audits.

---

## 🛠️ Monorepo Applications

- `projects/portfolio-hub`: Master Showcase Web Portal (Port 3009).
- `projects/mood-diner`: Smart Restaurant Recommender & Booking Engine (Port 5173).
- `projects/travel-packing-app`: Smart Wardrobe & Knapsack Weight Assistant (Port 3000).
- `projects/smart-recipe-app`: Smart Kitchen Recipe Manager (Port 3001).

---

## 📦 Pull Request Process

1. Fork the repository and create your feature branch (`git checkout -b feature/my-feature`).
2. Implement your changes following SDD rules in `.agents/AGENTS.md`.
3. Run `.\scripts\clean-app.ps1` and `.\scripts\test-app.ps1 -AppName <AppName>`.
4. Commit your changes (`git commit -m "feat: description of change"`).
5. Push to your branch (`git push origin feature/my-feature`) and open a Pull Request.
