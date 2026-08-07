# Master Portfolio Showcase Hub (`portfolio-hub`)

The central web portal for the **Agentic App Harness** monorepo — a master catalog that links out to each deployed application and surfaces per-app engineering metrics, the source spec, and the GitHub directory in one place.

> Spec: [`specs/portfolio-hub-spec.md`](../../specs/portfolio-hub-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/>

---

## What this app actually ships

- **A live, filterable catalog** of the 5 web apps in the monorepo, sourced from a single Zod-validated data file (`src/data/projectsData.ts`). Each card renders a tagline, full description, tech stack chip list, metrics (unit tests, E2E tests, a11y score, security audit), and badges for `pwaReady`, `capacitorAndroid`, and `monetized`. Cards lift on hover/focus with a glow shadow (`.project-card-interactive`), disabled under `prefers-reduced-motion`.
- **A real code snippet per card** — an expandable "View Code Snippet" disclosure showing a short excerpt pulled directly from that app's own shipped source, captioned with its exact `projects/<app>/...` path. Not a mockup: `portfolioData.test.ts` asserts every snippet's cited path actually lives inside that project's directory.
- **An Engineering Skills showcase** (`SkillsGrid`, sourced from `src/data/skillsData.ts`) — expandable cards naming cross-cutting engineering skills demonstrated across the monorepo, each backed by evidence that is either grep-able in this repo or computed live from `PROJECTS_DATA`.
- **6 category filter tabs** (`All`, `Legal`, `Dining`, `Utility`, `Kitchen`, `Family Finance`) driven by `useState` in `App.tsx`.
- **Inline spec viewer** — clicking the "View Spec" action on a card opens `SpecModal`, which renders the app's markdown specification (`specs/<id>-spec.md`) inside the app. No navigation away.
- **Animated hero metrics** with monorepo-wide totals (active apps count, cumulative unit + E2E test count, accessibility rate, Capacitor Android readiness) — numbers count up from 0 via `useCountUp`, computed live from `PROJECTS_DATA` rather than hand-typed, and jump straight to their final value under `prefers-reduced-motion`.
- **Case Studies** (`CaseStudySection`, sourced from `src/data/caseStudiesData.ts`) — four real incidents from this repo's history, each citing a real guardrail id or script rather than a generic claim; `caseStudiesData.test.ts` verifies each citation against `scripts/harness-status.mjs` and the filesystem.
- **Loop Dashboard** stats panel (`src/data/loopStats.generated.ts`) generated from `.agents/AGENTS.md` and `scripts/harness-status.mjs` rather than hand-typed — `loopStats.generated.test.ts` recomputes it and fails the build on drift.
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
  App.tsx                        # hero (animated stats), filter tabs, project grid, SkillsGrid, CaseStudySection, SpecModal mount
  components/
    CaseStudySection.tsx         # four real incidents, each citing a real guardrail id / script
    ProjectCard.tsx              # one card per project; emits onOpenSpec callback; code snippet disclosure
    SkillsGrid.tsx               # expandable Engineering Skills showcase, sourced from skillsData.ts
    SpecModal.tsx                # markdown spec viewer (loads from /specs/*.md)
  data/
    caseStudiesData.ts           # CASE_STUDIES array (+ caseStudiesData.test.ts verifying each citation)
    loopStats.generated.ts       # Loop Dashboard stats, generated from AGENTS.md + harness-status.mjs (+ .test.ts drift check)
    projectsData.ts              # RAW_PROJECTS array (incl. per-app code snippet), Zod-validated on export
    skillsData.ts                # SKILLS_DATA array, evidence derived live from PROJECTS_DATA
  hooks/
    useCountUp.ts                # animated 0→target number, skipped under prefers-reduced-motion (+ .test.ts)
  schemas.ts                     # ProjectItemSchema / SkillSchema + inferred types (+ schemas.test.ts)
  utils/
    countUp.ts                   # pure count-up progress math (+ countUp.test.ts, unit-tested in isolation)
    __tests__/
      portfolioData.test.ts      # Vitest coverage of the data file
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
