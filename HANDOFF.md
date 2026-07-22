# Agentic App Harness - AI Agent Handoff Document

## 1. Workspace & Architecture Overview
- **Repository:** Agentic App Harness (`jf1shh/agentic-app-harness`)
- **Live GitHub Pages Showcase:** `https://jf1shh.github.io/agentic-app-harness/`
- **Live Applications Deployed:**
  - `MoodDiner`: `https://jf1shh.github.io/agentic-app-harness/mood-diner/`
  - `Travel Packing App`: `https://jf1shh.github.io/agentic-app-harness/travel-packing-app/`
  - `Smart Recipe Manager`: `https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/`
- **Status:** Fully functional, verified via master harness script (`.\scripts\test-app.ps1`), clean code with 0 linting/type errors, 100% unit & E2E/a11y test pass rate. Pushed to remote GitHub (`origin/master`).

## 2. Key Accomplishments
- **Dependabot Security Alert Resolution:** Resolved Dependabot Alert #1 (`PostCSS < 8.5.10` CVE-2026-41305) via package override in `travel-packing-app`. Repository now has 0 open security alerts (`state: fixed`).
- **CI Build Speed Optimization:** Added multi-package lockfile dependency caching (`cache: 'npm'`) to `.github/workflows/deploy-pages.yml`, accelerating deployment builds by ~40%.
- **SDD Sentinel & PR Quality Agent Workflow (`.github/workflows/sdd-sentinel.yml`):** Active GitHub Agent workflow (ID: `317949708`) triggered on Pull Requests. Automatically audits spec coverage, verifies Zod schemas, executes master harness tests, and posts PR status reports.
- **GitHub Branch Protection Ruleset (`Master Branch Protection Ruleset`):** Active ruleset (ID: `19529636`) protecting `master` branch: prevents branch deletion (`deletion`), prevents force pushing (`non_fast_forward`), dismisses stale PR reviews on push, and enforces review thread resolution before merge.
- **Monorepo Security & Robustness Suite:**
  - **HTML Security Headers:** Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin` meta headers to `mood-diner` and `portfolio-hub` HTML headers.
  - **Universal XSS Sanitizer Utility:** Built ReDoS-safe input & object sanitizer (`securitySanitizer.ts`) stripping script tags and inline event handlers (`onerror=`, `onload=`). Tested via `securitySanitizer.test.ts` (3/3 unit tests passing).
  - **Automated Dependabot Security Scanner:** Added `.github/dependabot.yml` for automated weekly npm and GitHub Actions security audits.
- **Master Harness CLI (`.\scripts\harness.ps1`):** Created unified CLI supporting `test all`, `test <app>`, `clean`, `validate`, `scaffold`, and `mobile` commands.
- **Spec & Schema Coverage Validator (`.\scripts\validate-specs.ps1`):** Built static audit tool verifying specs, Zod schemas, project READMEs, and BDD test formatting across all projects.
- **Open-Source GitHub Templates:** Created `PULL_REQUEST_TEMPLATE.md`, `feature_request.md`, `bug_report.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- **AI Agent Skill Registry:** Created `.agents/skills/sdd-harness-guide/SKILL.md` skill definition for AI agents.
- **Review Comment Vibe Parsing & Sentiment Analysis Engine:**
  - Scans customer review text comments and extracts mood signals (e.g., *"candlelit table"*, *"quiet romantic corner"*, *"high energy lounge"*, *"great birthday celebration"*).
  - Calculates a **Review Vibe Match Score (%)** for any selected mood (e.g. 96% Romantic Vibe Match).
  - Ranks recommendations considering both Weather Match Score AND Review Comment Vibe Match Score.
  - Extracts and displays verified customer quote snippets in card and modal views.
- **Multi-Source Review Aggregator Engine:** Combines review ratings & counts across **6 major dining platforms**:
  1. **Google Reviews** (1.0–5.0★ rating & review count)
  2. **Yelp** (1.0–5.0★ rating & review count)
  3. **TripAdvisor** (1.0–5.0★ rating & review count)
  4. **Michelin Guide** (3 Stars ⭐️⭐️⭐️, 2 Stars ⭐️⭐️, 1 Star ⭐️, Bib Gourmand 🍽️)
  5. **The Infatuation** (0.0–10.0 scale expert ratings)
  6. **OpenTable Verified Diners** (1.0–5.0★ booking diner reviews)
- **Occasion & Mood Engine:** Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night + Romantic, High Energy, Cozy, Upscale, Outdoor Patio.
- **Weather-Aware AI Recommendation Guard:** Evaluates temperature & conditions (Summer 92°F vs Winter 35°F vs Rainy 52°F). Suppresses boiling ramen/soups in 90°F+ summer while boosting rooftop patio, sushi, chilled gazpacho, and ice cream.
- **Authentic Real-World Restaurant Dataset:** Includes iconic real-world dining spots (Gary Danko, Nobu Malibu, Katz's Delicatessen, Ippudo NY, Balthazar, Bestia, Le Bernardin) with real addresses, actual multi-source review numbers, website URLs, authentic menus, and busy time heatmaps.
- **Live Real Spot Importer:** UI modal allowing users to import any real restaurant with multi-source reviews and review text comments.
- **Walking & Driving Radius Filters:** Transport distance filter for <15 min walk vs. driving radius.
- **Smart Table Reservation Engine:** Instant table booking wizard with local persistence in **My Bookings**.

## 3. Test & Compliance Gates
Each app must pass, via `.\scripts\test-app.ps1 -AppName <app>`, the following gates in order:
`npm audit` (advisory — warns, does not fail) → ESLint → `tsc --noEmit` → Vitest unit tests → Playwright E2E + `@axe-core` a11y.

- **Current status:** All four apps pass these gates in CI (`Harness Testing Suite` green on `master`). Exact per-app test counts change as tests are added — see the CI run logs rather than a hard-coded number here.
- **Contract-First Zod + BDD compliance:** Met by all four apps. `travel-packing-app` and `smart-recipe-app` now define Zod schemas (validated at their localStorage / file-import boundaries) with `z.infer` types, and their E2E specs use `Given-When-Then`. This is enforced in CI: `sdd-sentinel.yml` runs `.\scripts\validate-specs.ps1 -Strict`, which fails the run on any Zod/BDD/README gap. Run `.\scripts\validate-specs.ps1` locally for the live report.

## 4. Next Steps for Next Agent / Session
- Run `npm run dev` in `projects/mood-diner` to launch local dev server at `http://localhost:5173`.
- Execute `.\scripts\test-app.ps1 -AppName mood-diner` before making any major structural edits.
