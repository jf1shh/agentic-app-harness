# Smart Recipe App (`smart-recipe-app`)

A local-first, privacy-focused kitchen assistant. Track your fridge and pantry, get recipe recommendations from what you already have, save markdown recipes from a public recipe search, and plan meals by day. All user data persists in `localStorage` (validated against the contract-first Zod schemas on every read). The only outbound request is the user-initiated recipe search.

> Spec: [`specs/smart-recipe-app.md`](../../specs/smart-recipe-app.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/>

---

## What the app actually does

### Routes
| Route | File | Purpose |
|---|---|---|
| `/` | `src/app/page.tsx` | Dashboard — inventory count + recipes count + top 3 recommendations |
| `/inventory` | `src/app/inventory/page.tsx` + `InventoryClient.tsx` | Add / remove fridge & pantry items |
| `/recipes` | `src/app/recipes/page.tsx` | Saved recipe catalog (with inventory-overlap scoring) |
| `/recipes/search` | Linked from the recipes page | Online recipe search via TheMealDB; each result is normalized into a local markdown recipe |
| `/planner` | `src/app/planner/page.tsx` + `PlannerClient.tsx` | Assign saved recipes to dates and meal types |

### Server actions (`src/app/actions.ts`)
A small set of `async` server actions provides the data layer for the route pages — they ultimately read from `localStorage`-shaped sources on the client during static export, but the actions interface (`getInventory`, `getMealPlan`, `fetchAllRecipes`) is the single seam the routes consume. This is the deliberate design that lets the app ship as a fully static export (`output: 'export'` in `next.config.ts`); there is no Node-filesystem / `'use server'` runtime.

### Recommendation engine (`src/lib/recommend.ts`)
Pure, dependency-free:
- `parseIngredients(markdown)` — extracts the `- ` bullet lines under any `## Ingredients` markdown heading.
- `parseEstimatedMinutes(markdown)` — sums Prep / Cook / Total minutes from `<label> Time: N min` lines, with a `N min` fallback.
- `estimateDifficulty(ingredientCount, minutes)` — heuristic into `Easy | Medium | Hard`.
- `recommendRecipes(inventory, recipes)` — tokenises each pantry item and each ingredient (skipping common stopwords), scores recipes by match count, drops zero-matches, and rank-orders by `matchCount` → `estimatedMinutes` → alphabetical title.

The home page shows the top 3 from this engine.

### Inline RAG corpus + offline embed pipeline
This app carries an offline-built retrieval-augmented generation layer that the recipe routes can use:

- `src/lib/rag/schemas.ts` — Zod schemas for the corpus index entries.
- `src/lib/rag/corpus.json` — the bundled corpus.
- `public/rag-index.json` — the public, fetch-able index mirror.
- `embed-corpus.mjs` (project root) — the offline script that rebuilds the embedded index from the source corpus.

The embed script is a zero-dependency Node ESM script; run it whenever you update `corpus.json` and want the search/build pipeline to pick up the new vector file.

### Persistence boundary (`src/lib/data.ts`)
Every read from `localStorage` is validated against the Zod schemas in `src/lib/schemas.ts` via a `parseStored()` helper. A malformed payload (corruption, hand-edit, an older data shape) falls back to seed data so a typoed entry can never crash the UI. Keys used:

- `smart_recipe_inventory`
- `smart_recipe_meal_plan`
- `smart_recipe_recipes`

Seed data ships in `src/lib/data.ts` as a starting inventory of 5 items, 2 recipes, and 1 meal-plan entry — overwritten only on first user mutation.

## Architecture

```
src/
  app/
    page.tsx                       # dashboard
    inventory/page.tsx, InventoryClient.tsx
    recipes/page.tsx
    planner/page.tsx, PlannerClient.tsx
    actions.ts                     # server actions: getInventory / getMealPlan / fetchAllRecipes
    layout.tsx, globals.css, page.module.css
  lib/
    data.ts                        # localStorage I/O + seed data + parseStored helper
    recommend.ts                   # pure recommendation engine (tokeniser + ranker)
    schemas.ts                     # Zod: InventoryItemSchema, MealPlanEntrySchema, RecipeEntrySchema
    types.ts                       # inferred TypeScript types
    rag/
      corpus.json                  # embedded corpus
      schemas.ts                   # Zod for RAG index entries
    data.test.ts, recommend.test.ts  # Vitest unit coverage
public/
  rag-index.json                   # public mirror of the embedded corpus
  manifest.json, *.svg icons
embed-corpus.mjs                   # offline embedding script
```

## Tech stack

Next.js (App Router) + React 19 + TypeScript, vanilla CSS (glassmorphism, micro-animations), Zod 4. The static export (`output: 'export'`) means no Node-only paths are taken at render time — the app was deliberately refactored off Node filesystem / `'use server'` boundaries (per the Next.js static-export server-action scoping lesson in `.agents/AGENTS.md` §6).

## Development

```bash
cd projects/smart-recipe-app
npm install
npm run dev           # next dev (port 3001)
npm run build         # clean + next build → out/
npm run start         # next start (production-preview only)
npm run lint
npm run embed         # rebuild the embedded RAG corpus from src/lib/rag/corpus.json
npm run test          # Vitest unit
npm run test:e2e      # Playwright + axe a11y
```

## Verification

```bash
node scripts/test-app.mjs smart-recipe-app   # full harness gate (security + lint + tsc + Vitest + Playwright + a11y)
```
