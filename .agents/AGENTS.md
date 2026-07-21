# AI Harness Control Layer - Rules for Agents

As an AI agent operating within this repository, you must strictly adhere to the following Spec-Driven Development (SDD) rules:

## 1. Spec is the Single Source of Truth
- **NEVER** write code or generate new features without first reading the corresponding specification in the `specs/` directory.
- The specification dictates architecture, data models, and acceptance criteria.
- If the user asks you to implement something that contradicts the spec, you MUST notify the user of the contradiction and ask if the spec should be updated.

## 2. No "Vibe Coding"
- Do not make arbitrary architectural decisions on the fly.
- If a requirement is ambiguous or underspecified, **STOP** and ask the user for clarification, or update the specification file and ask for approval before writing the implementation.

## 3. Harness Engineering / Feedback Loops
- If you make a mistake or encounter a bug during implementation, do not just fix the code. You must also consider if a rule, test, or clarification needs to be added to the spec or to this `AGENTS.md` file to prevent the mistake from happening again.

## 4. Work in the Correct Directory
- This is a monorepo. All applications live in the `projects/` directory.
- Ensure your terminal commands and file edits are scoped to the correct `projects/<app-name>` directory.

## 5. Mandatory Testing & Verification (CI/CD)
- You must write unit tests (Vitest) for all core logic.
- You must write End-to-End (E2E) tests using Playwright for critical user flows.
- You must enforce strict Accessibility (a11y) rules using `@axe-core/playwright` within the E2E tests.
- After implementing a feature, you **MUST** run the master verification script: `.\scripts\test-app.ps1 -AppName <AppName>`.
- You cannot consider a feature complete unless the app passes all Security, Privacy, Optimization, A11y, and Functionality checks within the test script.
