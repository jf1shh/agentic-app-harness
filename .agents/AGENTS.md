# AI Harness Control Layer - Rules for Agents

As an AI agent operating within this repository, you must strictly adhere to the following Spec-Driven Development (SDD) rules:

## 1. Spec is the Single Source of Truth
- **NEVER** write code or generate new features without first reading the corresponding specification in the `specs/` directory.
- The specification dictates architecture, data models, and acceptance criteria.
- **Contract-First Schema Validation**: All application data models must be defined as runtime Zod schemas (`zod`) from which TypeScript types are inferred (`z.infer<typeof Schema>`), guaranteeing runtime data integrity across local storage, API imports, and component props.
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
- **BDD Specification Standard**: All E2E and Unit test scenarios must follow Behavior-Driven Development (BDD) formatting (`Given [Context] -> When [User Action] -> Then [Expected Outcome]`).
- You must enforce strict Accessibility (a11y) rules using `@axe-core/playwright` within the E2E tests.
- After implementing a feature, you **MUST** run the master verification script: `.\scripts\test-app.ps1 -AppName <AppName>`.
- You cannot consider a feature complete unless the app passes all Security, Privacy, Optimization, A11y, and Functionality checks within the test script.
- **Automated Build Cleanup**: Every build and test cycle MUST include automated pre-build and post-build cleanup of stale build caches (`.next`, `dist`, `build`, `tsconfig.tsbuildinfo`) and temporary test outputs (`playwright-report`, `test-results`) via `npm run clean` and `.\scripts\clean-app.ps1`.
- **Mandatory Remote Deployment Verification**: Whenever initiating or triggering remote CI/CD workflows or cloud deployments (e.g., GitHub Actions workflows, Vercel builds), agents MUST NOT report completion immediately or poll rapidly in a loop. Instead, set a scheduled reminder (~5 minutes) using `schedule` to check job status after sufficient build time, confirming `completed success` before reporting completion to the user.

## 6. Learned Lessons & Best Practices
- **Authentic Real-World Datasets**: When building recommendation engines, prioritize authentic real-world data (real addresses, actual Google/Yelp ratings, real menus & pricing) and provide a live import mechanism so users can work with real locations.
- **Vitest vs. Playwright Test Separation**: Always explicitly set `include: ['src/**/*.test.ts']` and `exclude: ['e2e/**']` in `vite.config.ts` so Vitest does not attempt to execute Playwright `e2e` specs.
- **Modal Component State Sync**: When opening modals with contextual initial tab props (e.g. "Book Table" vs "Menu"), assign a unique `key` (e.g. `key={restaurantId + tab}`) to force a clean remount of modal state.
- **Playwright Strict Mode Selectors**: In Playwright E2E tests, scope selectors tightly to containers (e.g. `.modal-content h2`) to prevent duplicate matching when identical headings exist on background cards.
- **Dynamic Generator & E2E Fixture Decoupling**: When switching from static mock data to dynamic generator logic (e.g. Archetype generation), update Playwright E2E tests to assert generic structural elements rather than hardcoded fixture strings (e.g. specific item names), ensuring tests remain resilient to generator changes.
- **Multi-Constraint Schedule Fallbacks**: When applying layered strict filters (weather warmth, time-of-day, color clash, hot-weather dark exclusions), always provide cascading fallbacks so itinerary days never receive empty schedules when constraints are overly restrictive.
- **Monorepo Dev Server Port Collisions**: When running Next.js or other dev servers in a monorepo testing harness, explicitly define a unique port (e.g., `npm run dev -- -p 3005`) in `playwright.config.ts` to prevent silent port collisions with other background projects that could cause E2E tests to execute against the wrong application.
- **Accessibility (a11y) Color Contrast**: When designing premium UIs with bright primary/secondary colors (like Emerald or Amber) against white text, standard shades (e.g. 500/600) often fail WCAG 2.0 AA minimum contrast ratios (4.5:1). Always use darker variants (e.g., Emerald 700 `#047857`, Amber 800 `#9a3412`) to ensure `@axe-core/playwright` accessibility checks pass seamlessly.
- **Strict TypeScript in Harness**: When executing the `test-app.ps1` harness, always define explicit interfaces for data models rather than using `any`, as the harness strictly enforces ESLint `@typescript-eslint/no-explicit-any` rules.
- **Mobile PWA Viewport Accessibility**: When configuring `<meta name="viewport">` for mobile PWA standalone apps, avoid setting `user-scalable=no` or `maximum-scale=1.0`, as `@axe-core/playwright` flags this as a WCAG 1.4.4 text zoom violation. Use `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- **Fast Refresh Export Scoping**: In Vite React apps, add `/* eslint-disable react-refresh/only-export-components */` when exporting non-component context hooks alongside context providers in shared provider files.
- **Next.js Static Export Server Action Scoping**: In Next.js static exports (`output: 'export'`), Node filesystem calls and Server Actions (`'use server'`) fail static page generation during `next build`. Refactor server actions to browser-compatible storage (`localStorage`) and import functions directly inside `'use client'` components rather than passing functions as props across server/client component boundaries.
- **PWA Service Worker Subpath Scoping**: In Vite/React PWA applications deployed under subfolder paths on static hosts like GitHub Pages (`/agentic-app-harness/mood-diner/`), registering root `/sw.js` or caching root `/index.html` causes 404 cache failures. Use dynamic `self.location.pathname` in `sw.js` and `window.location.pathname + 'sw.js'` in `index.html` to guarantee subpath compatibility.

## 7. Mandatory Session Wrap-up & Continuous Learning
- **Update Documentation & READMEs**: At the end of every session or major milestone, and whenever new features are added, agents MUST update all relevant `README.md` files and `.md` documentation (e.g., project specifications in `specs/`, walkthroughs, implementation plans, and project READMEs) to accurately reflect the latest project state, feature set, architecture, and live deployment endpoints.
- **Create Agent Handoff File**: Agents MUST create or update a dedicated handoff file (e.g., `HANDOFF.md` in the project root or relevant app directory) detailing current project state, key changes, open bugs/blockers, and exact next steps so any future AI agent can seamlessly take over the work without loss of context.
- **Execute Learning Loop (`/learn`)**: Agents MUST systematically review session outcomes, extract new lessons, anti-patterns, or edge cases discovered during execution, and persist them into `AGENTS.md` (or as updated rules and skills) after every session to guarantee continuous improvement across future sessions.
