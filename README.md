# Agentic App Harness

A **spec-driven development (SDD) harness** for building and maintaining production-grade web & mobile apps with AI coding assistants — where the quality bar (runtime schemas, unit + E2E tests, accessibility, spec coverage) is **enforced in CI, not just documented**.

> **What "agentic" means here:** the apps in this repo are built and maintained by AI coding agents working under strict rules in [`.agents/AGENTS.md`](.agents/AGENTS.md). This project is the *harness* around that workflow — the specs, scripts, and CI gates that keep AI-assisted development rigorous and drift-free. It is not itself a runtime AI/LLM system; the thing on display is the engineering process and tooling.

It hosts five real, deployed applications and holds every one of them to the same enforced standard.

---

## 🌐 Live GitHub Pages Showcase & Applications

- **Master Portfolio Showcase Hub:** [https://jf1shh.github.io/agentic-app-harness/](https://jf1shh.github.io/agentic-app-harness/)
- **MoodDiner (Smart Restaurant Recommender & Booking App):** [https://jf1shh.github.io/agentic-app-harness/mood-diner/](https://jf1shh.github.io/agentic-app-harness/mood-diner/)
- **Travel Packing App (Wardrobe & Knapsack Weight Optimizer):** [https://jf1shh.github.io/agentic-app-harness/travel-packing-app/](https://jf1shh.github.io/agentic-app-harness/travel-packing-app/)
- **Smart Kitchen Recipe Manager (Meal Planner & Pantry):** [https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/](https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/)
- **LexiVault Financial RAG (100% Local Private Legal RAG & Security Engine):** [https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/](https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/)

---

## Directory Structure

- `projects/`: Monorepo workspace containing all web & mobile applications.
  - `projects/portfolio-hub`: Master Showcase Web Portal (Port 3009).
  - `projects/mood-diner`: Smart Restaurant Recommender & Table Booking Engine (Port 5173).
  - `projects/travel-packing-app`: Smart Wardrobe Packing Assistant (Port 3000).
  - `projects/smart-recipe-app`: Smart Kitchen Recipe Manager (Port 3001).
  - `projects/legal-financial-rag`: 100% Client-Side Private RAG for Legal Counsel & Financial Compliance (Port 3009).
- `specs/`: Markdown specifications for every application. These are the **single source of truth**.
- `scripts/`: Master harness CLI, verification, cleanup, mobile, and scaffolding scripts (`harness.ps1`, `test-app.ps1`, `validate-specs.ps1`, `clean-app.ps1`, `build-mobile.ps1`, `scaffold-app.ps1`).
- `.agents/`: Harness control layer. `AGENTS.md` holds the engineering rules AI coding agents must follow in this repo.

---

## Engineering Standards (enforced, not aspirational)

1. **Spec-Driven Development (SDD)**: Specs dictate architecture, data models, and acceptance criteria before code is written.
2. **Contract-First Schema Validation (Zod)**: Every app defines its data models as runtime Zod schemas and infers its TypeScript types from them (`z.infer<typeof Schema>`), validating untrusted input (storage, imports) at the boundary.
3. **Behavior-Driven Development (BDD)**: All E2E and unit scenarios follow `Given [Context] -> When [Action] -> Then [Outcome]`.
4. **Mandatory Testing & Verification**: Each app must pass `.\scripts\test-app.ps1 -AppName <AppName>` — security audit, ESLint, type-check, Vitest, and Playwright E2E + `@axe-core` accessibility.
5. **5 Defense-in-Depth Security Hardening Layers**: LexiVault includes zero-exfiltration CSP headers, PBKDF2 passphrase key derivation (100,000 iterations), auto-lock timer, ReDoS/prompt injection shield, and tamper-evident blockchain-style hash chaining.
6. **Enforced in CI**: The `Harness Testing Suite` workflow runs the full gate for every app on each push, and the `SDD Sentinel` workflow runs `validate-specs.ps1 -Strict` on pull requests — which **fails the build** if any app is missing a spec, Zod schema, or BDD specs. Compliance is a gate, not a claim.
7. **Continuous Learning Loops**: Edge cases and lessons are persisted back into `.agents/AGENTS.md` so the same mistake isn't repeated.
