# Smart Recipe App

A local-first, privacy-focused kitchen assistant: track your fridge and pantry,
get recipe recommendations from what you already have, search TheMealDB for new
recipes, and plan meals by day. Part of the [Agentic App Harness](../../README.md)
monorepo and held to its enforced quality gates (Zod contracts, BDD tests,
`@axe-core` accessibility).

## Features

- **Inventory Management** — add and remove fridge/pantry items (`src/app/inventory`).
- **Recipe Recommendations** — ranks saved recipes by how many pantry ingredients
  they use, with an estimated total time and a difficulty rating
  (`src/lib/recommend.ts`, surfaced on the dashboard).
- **Online Recipe Search** — query TheMealDB and save each result as a local
  markdown recipe (`src/app/recipes/search`).
- **Recipe Catalog** — browse and view saved recipes stored as markdown
  (`src/app/recipes`).
- **Meal Prep Planner** — assign recipes to specific dates and meal types,
  grouped into a per-day schedule (`src/app/planner`).
- **100% Local & Private** — all user data persists in the browser via
  `localStorage`, validated against Zod schemas on read. No backend database and
  no telemetry; the only outbound request is the user-initiated recipe search.

See [`specs/smart-recipe-app.md`](../../specs/smart-recipe-app.md) for the full
specification — the single source of truth for this app.

## Architecture

- **Framework:** Next.js (App Router) / React, built as a fully static export
  (`output: 'export'` in `next.config.ts`).
- **Persistence:** Client-side `localStorage`, accessed through `src/lib/data.ts`,
  which validates every read against the contract-first Zod schemas in
  `src/lib/schemas.ts`. There is **no server or API-route backend** — the app was
  deliberately refactored off Node filesystem / server actions so it can ship as
  a static export to GitHub Pages.
- **Data shapes:** inventory and meal plan as JSON-serialized objects; recipes as
  markdown strings.
- **Styling:** Vanilla CSS (`src/app/globals.css`) — glassmorphism, micro-animations.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # static export (out/)
npm run lint     # eslint
```

## Testing

Unit tests (Vitest) and E2E + accessibility tests (Playwright + `@axe-core`) run
through the harness verification script from the repo root:

```powershell
.\scripts\test-app.ps1 -AppName smart-recipe-app
```

Key coverage: `src/lib/recommend.test.ts` (recommendation matching, time parsing,
difficulty, ranking) and `e2e/app.spec.ts` (dashboard, recommendations panel,
inventory add flow) — all BDD `Given → When → Then`.

## Live deployment

<https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/>
