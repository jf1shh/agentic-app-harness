# Project Specification: Smart Recipe App

## 1. Product Overview
**Name:** Smart Recipe App
**Description:** A local-first, privacy-focused application that helps users manage their fridge and pantry inventory, provides recipe suggestions based on available ingredients, ranks recipes by difficulty and time, searches for new recipes using a public API, and plans meals.
**Target Audience:** Home cooks and individuals looking to optimize their meal planning and minimize food waste without giving up their data to the cloud.

## 2. Core Features
- [x] **Inventory Management:** Add and remove fridge/pantry items, each validated against a Zod schema on read (`src/app/inventory`, `src/app/actions.ts`).
- [x] **Recipe Recommendations:** Rank saved recipes by how many pantry ingredients they use, with an estimated total time and a difficulty rating (`src/lib/recommend.ts`, surfaced on the home page).
- [x] **Online Recipe Search & Parsing:** Query TheMealDB and parse each result into a local markdown recipe entry (`src/app/recipes/search`).
- [x] **Recipe Catalog:** Browse and view saved recipes stored as markdown (`src/app/recipes`).
- [x] **Meal Prep Planner:** Assign saved recipes to specific dates and meal types, grouped into a per-day schedule (`src/app/planner`).
- [x] **100% Local & Private:** All user data (inventory, meal plan, saved recipes) persists in the browser via `localStorage`, validated against Zod schemas on read. No backend database and no telemetry; the only outbound request is the user-initiated TheMealDB recipe search.

## 3. Architecture & Tech Stack
- **Frontend:** Next.js (App Router) / React, exported as a fully static site (`output: 'export'`).
- **Styling:** Vanilla CSS (Focus on modern, premium aesthetics, glassmorphism, micro-animations).
- **State/Persistence:** Client-side `localStorage`, accessed through `src/lib/data.ts`, which validates every read against the Zod schemas in `src/lib/schemas.ts`. There is **no server or API-route backend** — the app was deliberately refactored off Node filesystem/server actions so it can ship as a static export (see the "Next.js Static Export Server Action Scoping" lesson in `.agents/AGENTS.md`).
- **Data shapes:** Inventory and meal plan as JSON-serialized objects; recipes as markdown strings.
- **Deployment:** Static export to GitHub Pages under `/agentic-app-harness/smart-recipe-app` (also runnable locally via `npm run dev`).

## 4. Data Models
```typescript
interface InventoryItem {
  id: string;
  name: string;
  category: 'fridge' | 'pantry';
  quantity?: string;
  addedAt: string;
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  sourceUrl?: string;
  imageUrl?: string;
}

interface MealPlan {
  date: string; // YYYY-MM-DD
  recipeId: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
}
```

## 5. UI/UX Design System
- **Color Palette:**
  - Primary: Rich Emerald Green (e.g., `#10b981`)
  - Secondary: Warm Amber (e.g., `#f59e0b`)
  - Background: Dark Mode default (e.g., `#0f172a` Slate 900)
  - Surface: Translucent panels (Glassmorphism effect)
  - Text: Off-white (`#f8fafc`) for primary text, `#cbd5e1` for secondary.
- **Typography:** Inter or Outfit for clean, modern readability.
- **Micro-interactions:** Smooth hover scaling for cards (`transform: translateY(-2px)`), subtle glowing box-shadows on active states.
- **Navbar and grid layouts are already responsive** (`.navbar`/`.nav-links` wrap under 768px; `.grid-cols-2/3/4` use
  `repeat(auto-fit, minmax(min(N,100%),1fr))`; `.grid-sidebar` collapses to one column under 768px) — a full sweep
  of every page at 320px/375px against the app's real seed data found no horizontal overflow anywhere in that
  structural layer.
- **List rows need `min-width: 0` + `overflow-wrap: anywhere` on their text, not just `flex-wrap`:** the inventory
  and meal-plan list rows (`InventoryClient.tsx`, `PlannerClient.tsx`) are a `flex justify-between` row with a text
  child and a "Remove" button. Item names and recipe titles are free text with no guaranteed spaces to wrap on —
  the sweep above used the app's short seed names and missed this, but a single long unbroken word (a brand name,
  a hyphenated SKU) forced the row 538px wide in a 320px viewport, because a flex item's default `min-width: auto`
  refuses to shrink it below its own unbreakable content. `flex-wrap` alone would not have fixed this: it moves
  the text to its own line but doesn't let a single long word break. The text wrapper needs both `min-width: 0`
  (so the flex item can shrink past its intrinsic content width) and `overflow-wrap: anywhere` (so a word that
  doesn't fit gets broken instead of overflowing); the button gets `flex-shrink: 0` so it never gets squeezed.

## 6. Testing & Compliance (Security, Privacy, Optimization)
- **Unit Tests:** Core logic (recommendation matching, time estimation) must have test coverage (Vitest).
- **Security & Privacy:** 100% local operation. No external telemetry.
- **Accessibility (a11y):** Enforced using `@axe-core/playwright`.
- **Optimization:** Image optimization where applicable, fast local file reads.

## 7. Acceptance Criteria
1. User can add and remove items from their pantry and fridge.
2. User can search TheMealDB for a recipe and save it locally as a markdown entry.
3. User can view their local catalog of saved recipes.
4. App recommends recipes based on what ingredients are available in the inventory, ranked with an estimated time and difficulty.
5. User can assign a saved recipe to a specific day in the meal planner.
6. The application passes all checks in `.\scripts\test-app.ps1`.

## 8. Open Questions / Unresolved Architecture
- For the public API, we will use a free, open API like `TheMealDB` to avoid requiring API keys from the user for the MVP, though it may lack some advanced filtering. If Spoonacular is preferred, an API key input in settings may be needed.
