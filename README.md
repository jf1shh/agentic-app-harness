# Agentic App Harness

Welcome to the **Agentic App Harness**. This monorepo is engineered for high-velocity **Spec-Driven Development (SDD)** with AI coding agents.

It hosts fullstack web and mobile applications (e.g., `MoodDiner`, `Portfolio Showcase Hub`, `Travel Packing App`, `Smart Kitchen Recipe Manager`) and enforces strict SDD, Contract-First schema validation, BDD testing, and zero-drift harness engineering.

---

## 🌐 Live GitHub Pages Showcase & Applications

- **Master Portfolio Showcase Hub:** [https://jf1shh.github.io/agentic-app-harness/](https://jf1shh.github.io/agentic-app-harness/)
- **MoodDiner (Smart Restaurant Recommender & Booking App):** [https://jf1shh.github.io/agentic-app-harness/mood-diner/](https://jf1shh.github.io/agentic-app-harness/mood-diner/)
- **Travel Packing App (Wardrobe & Knapsack Weight Optimizer):** [https://jf1shh.github.io/agentic-app-harness/travel-packing-app/](https://jf1shh.github.io/agentic-app-harness/travel-packing-app/)
- **Smart Kitchen Recipe Manager (Meal Planner & Pantry):** [https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/](https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/)

---

## Directory Structure

- `projects/`: Monorepo workspace containing all web & mobile applications.
  - `projects/portfolio-hub`: Master Showcase Web Portal (Port 3009).
  - `projects/mood-diner`: Smart Restaurant Recommender & Table Booking Engine (Port 5173).
  - `projects/travel-packing-app`: Smart Wardrobe Packing Assistant (Port 3000).
  - `projects/smart-recipe-app`: Smart Kitchen Recipe Manager (Port 3001).
- `specs/`: Markdown specifications for every application. These are the **single source of truth**.
- `scripts/`: Master verification, build cleanup, mobile initialization, and scaffolding scripts (`test-app.ps1`, `clean-app.ps1`, `build-mobile.ps1`, `scaffold-app.ps1`).
- `.agents/`: Harness Control Layer. Contains `AGENTS.md` which dictates strict engineering rules for AI agents.

---

## Engineering Standards & Methodologies

1. **Spec-Driven Development (SDD)**: Specs dictate architecture, data models, and acceptance criteria before writing code.
2. **Contract-First Schema Validation (Zod)**: All application data models are defined as runtime Zod schemas (`zod`), with inferred TypeScript types (`z.infer<typeof Schema>`).
3. **Behavior-Driven Development (BDD)**: All E2E and Unit test suites follow `Given [Context] -> When [User Action] -> Then [Expected Outcome]` format.
4. **Mandatory Testing & Verification**: All applications must pass `.\scripts\test-app.ps1 -AppName <AppName>` (Security, Lint, Type-Check, Vitest, Playwright, Axe A11y).
5. **Continuous Learning Loops**: Lessons learned, edge cases, and user rules are automatically persisted in `.agents/AGENTS.md`.
