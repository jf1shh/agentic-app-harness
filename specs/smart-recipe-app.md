# Project Specification: Smart Recipe App

## 1. Product Overview
**Name:** Smart Recipe App
**Description:** A local-first, privacy-focused application that helps users manage their fridge and pantry inventory, provides recipe suggestions based on available ingredients, ranks recipes by difficulty and time, searches for new recipes using a public API, and plans meals.
**Target Audience:** Home cooks and individuals looking to optimize their meal planning and minimize food waste without giving up their data to the cloud.

## 2. Core Features
- [ ] **Inventory Management:** Track items in the fridge and pantry (CRUD).
- [ ] **Recipe Recommendations:** Suggest recipes based on current inventory, estimating cook times and difficulty rankings.
- [ ] **Online Recipe Search & Parsing:** Query a public recipe API (e.g., TheMealDB or Spoonacular) and parse recipes into a local markdown catalog.
- [ ] **Recipe Catalog:** Browse and view locally saved recipes in `.md` format.
- [ ] **Meal Prep Planner:** A calendar-based view to assign recipes to specific days.
- [ ] **100% Local & Private:** All data is saved on the local device filesystem via Node.js local API routes. No external database.

## 3. Architecture & Tech Stack
- **Frontend:** Next.js (App Router) / React
- **Styling:** Vanilla CSS (Focus on modern, premium aesthetics, glassmorphism, micro-animations)
- **Backend/API:** Next.js API Routes (Reading/Writing to local filesystem)
- **Database:** Local JSON files for inventory/meal plan, Markdown files for recipes.
- **Deployment:** Intended to run locally (`npm run dev` or local production build).

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

## 6. Testing & Compliance (Security, Privacy, Optimization)
- **Unit Tests:** Core logic (recommendation matching, time estimation) must have test coverage (Vitest).
- **Security & Privacy:** 100% local operation. No external telemetry.
- **Accessibility (a11y):** Enforced using `@axe-core/playwright`.
- **Optimization:** Image optimization where applicable, fast local file reads.

## 7. Acceptance Criteria
1. User can add, edit, and remove items from their pantry and fridge.
2. User can search a public API for a recipe and save it locally as a `.md` file.
3. User can view their local catalog of saved recipes.
4. App recommends recipes based on what ingredients are available in the inventory.
5. User can assign a saved recipe to a specific day in the meal planner.
6. The application passes all checks in `.\scripts\test-app.ps1`.

## 8. Open Questions / Unresolved Architecture
- For the public API, we will use a free, open API like `TheMealDB` to avoid requiring API keys from the user for the MVP, though it may lack some advanced filtering. If Spoonacular is preferred, an API key input in settings may be needed.
