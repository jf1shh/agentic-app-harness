# Smart Recipe App - Agent Handoff

## Project Status
Feature-complete against `specs/smart-recipe-app.md`. The app tracks fridge/pantry
inventory, recommends recipes from what's on hand, searches TheMealDB and saves
results as local markdown, and plans meals by day. All user data persists in the
browser via `localStorage` (validated against Zod schemas on read) so the app
ships as a static export with no backend.

## Completed Features
- [x] App specification (`specs/smart-recipe-app.md`) — reconciled to the real
      architecture.
- [x] Next.js (App Router, Vanilla CSS), static export (`output: 'export'`).
- [x] Vitest, Playwright, `@axe-core/playwright` configured.
- [x] Persistence via `localStorage` (`src/lib/data.ts`), Zod-validated
      (`src/lib/schemas.ts`).
- [x] Dashboard with live "Cook with what you have" recommendations.
- [x] Inventory management (add / remove).
- [x] Recipe catalog + TheMealDB search → markdown.
- [x] Meal prep planner (date + meal type, grouped per day).
- [x] **Recipe recommendation engine** (`src/lib/recommend.ts`) — pure,
      dependency-free; parses ingredients/time from recipe markdown, scores by
      pantry coverage, rates difficulty, ranks and omits no-match recipes. Covered
      by `src/lib/recommend.test.ts` and an E2E scenario.

## Architecture & Tech Stack
- **Framework:** Next.js (App Router), static export.
- **Persistence:** `localStorage` only — **no API routes / filesystem backend**.
  This was a deliberate refactor for static-export compatibility (see the
  "Next.js Static Export Server Action Scoping" lesson in `.agents/AGENTS.md`).
- **Data shapes:** inventory + meal plan as JSON objects; recipes as markdown strings.
- **Testing:** verified via `.\scripts\test-app.ps1 -AppName smart-recipe-app`
  (security, lint, type-check, Vitest, Playwright + a11y).

## Known Gaps / Next Steps
1. **Inventory editing:** currently add/remove only; no in-place edit (the spec
   was scoped to add/remove to match reality). Add an update action + UI if edit
   is desired.
2. **Seed data category mismatch:** the add-item form uses `fridge`/`pantry`
   categories, but the seeded inventory in `src/lib/data.ts` uses free-form
   categories (`Herbs`, `Produce`, ...). Harmonize if category filtering is added.
3. **Richer recommendation matching:** matching is token-based on ingredient
   names; a semantic/fuzzy matcher (or synonym list) would improve recall.
4. **Recipe search provider:** TheMealDB is used for its no-key API; Spoonacular
   would offer richer filtering but needs a user-supplied key.

## Agent Instructions
- Treat `specs/smart-recipe-app.md` as the source of truth; if code and spec
  disagree, reconcile and flag it (per `.agents/AGENTS.md` rule 1).
- Run the harness before claiming done: `.\scripts\test-app.ps1 -AppName smart-recipe-app`.
- The pure logic in `src/lib/recommend.ts` can be exercised without a full install
  via Node type-stripping; the Vitest/Playwright suites run in CI.
- `playwright.config.ts` pins a dedicated port to avoid monorepo collisions.
