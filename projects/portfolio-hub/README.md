# Master Portfolio Showcase Hub (`portfolio-hub`)

The central web portal for the **Agentic App Harness** monorepo — a master catalog that links out to each deployed application and surfaces per-app engineering metrics, the source spec, and the GitHub directory in one place.

> Spec: [`specs/portfolio-hub-spec.md`](../../specs/portfolio-hub-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/>

---

## What this app actually ships

- **A live, filterable catalog** of the 5 web apps in the monorepo, sourced from a single Zod-validated data file (`src/data/projectsData.ts`). Each card renders a tagline, full description, tech stack chip list, metrics (unit tests, E2E tests, a11y score, security audit), and badges for `pwaReady`, `capacitorAndroid`, and `monetized`.
- **6 category filter tabs** (`All`, `Legal`, `Dining`, `Utility`, `Kitchen`, `Family Finance`) driven by `useState` in `App.tsx`.
- **Inline spec viewer** — clicking the "View Spec" action on a card opens `SpecModal`, which renders the app's markdown specification (`specs/<id>-spec.md`) inside the app. No navigation away.
- **Hero metrics card** with monorepo-wide totals (active apps count, cumulative test pass rate surfacing, accessibility rate, Capacitor Android readiness).
- **GitHub repo link** in the header so a reader can jump directly to source.

## Apps surfaced in the catalog

| App | Category | Demo |
|---|---|---|
| `legal-financial-rag` | Legal | <https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/> |
| `mood-diner` | Dining | <https://jf1shh.github.io/agentic-app-harness/mood-diner/> |
| `travel-packing-app` | Utility | <https://jf1shh.github.io/agentic-app-harness/travel-packing-app/> |
| `smart-recipe-app` | Kitchen | <https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/> |
| `elder-care-planner` | Family Finance | <https://jf1shh.github.io/agentic-app-harness/elder-care-planner/> |

The catalog data is contract-first — `ProjectItemSchema` (in `src/schemas.ts`) is parsed on every load via `ProjectItemSchema.parse(item)`, so a typo or schema drift breaks the build, not the UI.

## Project layout

```
src/
  App.tsx                 # hero, filter tabs, project grid, SpecModal mount
  components/
    ProjectCard.tsx       # one card per project; emits onOpenSpec callback
    SpecModal.tsx         # markdown spec viewer (loads from /specs/*.md)
  data/
    projectsData.ts       # RAW_PROJECTS array, Zod-validated on export
  schemas.ts              # ProjectItemSchema + inferred type
  utils/__tests__/
    portfolioData.test.ts # Vitest coverage of the data file
public/favicon.svg
```

## Architecture

Vite + React 19 + TypeScript, vanilla CSS with `:root` HSL variables and glassmorphism panels. `lucide-react` for the icon set. **No state persistence** beyond React's mount-state for category filtering — the catalog is fully static.

## Development

```bash
cd projects/portfolio-hub
npm install
npm run dev          # vite dev server on port 3009
npm run build        # clean + tsc + vite build  → dist/
npm run lint
npm run test         # Vitest unit
npm run test:e2e     # Playwright + axe a11y
```

## Verification

Run the harness gate from the repo root:

```bash
node scripts/test-app.mjs portfolio-hub   # security audit + lint + tsc + Vitest + Playwright + a11y
```
