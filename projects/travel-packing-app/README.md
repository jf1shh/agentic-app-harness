# PackRight V4 — Travel Packing App (`travel-packing-app`)

A Next.js wardrobe analyzer and packing optimizer. It pulls a live weather forecast for the trip dates, generates daily warmth targets, schedules non-repeating outfits across the trip, then weighs and dimensions the resulting wardrobe against a real suitcase model and a specific airline's carry-on limits.

> Spec: [`specs/travel-packing-app-spec.md`](../../specs/travel-packing-app-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/travel-packing-app/>

---

## What the app actually does

### Trip input (`src/app/page.tsx`)
- Destination string → geocode via Open-Meteo's geocoding API.
- Start & end dates → fetch daily forecast → `transformWeatherToItinerary()` produces `DayItinerary[]` with `weatherWarmthTarget` (0–10) and `maxTempC` per day.

### Wardrobe source — two paths
- **Style archetype preset** — pick one of three (`quiet-luxury`, `gorpcore`, `scandi-minimalist`), one of three packing strategies (`standard`, `flexible`, `minimalist`), and one default activity (`sightseeing`, `transit`, `formal`, `casual`). `generateWardrobeFromArchetype()` produces a starter `Garment[]` you can immediately analyze.
- **Custom upload** — drag in a `.txt` or `.md` wardrobe file; `parseClosetFile()` auto-detects each line's role (`top | bottom | topper | layer`), colors, and thermal score, and produces a `Garment[]` from your real closet.

### Two reports from one analysis run
1. **Wearability report** (`WardrobeAnalyzer` component, fed by `analyzeWardrobe()`)
   - **Flexibility Score** across the wardrobe.
   - **MVP item** — the one garment that unlocks the most outfits; losing it causes the largest flexibility collapse.
   - **Dead Weight** — items that never appear in any scheduled outfit.
   - **Smart Swap Suggestions** — targeted item replacements that would most reduce dead weight.
2. **Knapsack physics report** (`calculateKnapsackPhysics()`)
   - Total weight and volume vs. the selected suitcase's real capacity (`MODELS` in `src/utils/suitcaseDatabase.ts` — including the Away Carry-On).
   - Airline compliance against the chosen airline's carry-on limits (`src/utils/airlineBaggage.ts` — Emirates and Delta are pre-loaded; others are added as needed).

### Theme toggle
Light/dark, persisted under `packright_theme` in `localStorage`. Respects `prefers-color-scheme: dark` on first visit.

### Engine rules enforced by the wardrobe layer
- **Exclusion tags** — items tagged `clash_navy` etc. are never paired.
- **Color math** — Pink and Red, for example, are mathematically excluded from pairing.
- **Time-of-day shifts** — `time: 'evening'` items are only used on evening-scheduled days.
- **Hot-weather filter** — exclusively dark-colored outfits are demoted on hot days.
- **Material thermals** — Cashmere scores high; Linen scores low; the score feeds the per-day warmth target.
- **No consecutive repeats** — Day N's base items != Day N-1's.

## Architecture

```
src/
  app/
    page.tsx                       # main input + analyze flow
    error.tsx, layout.tsx
  components/
    WardrobeAnalyzer.tsx           # wearability report + Dead Weight + Smart Swaps
    PackingChecklist.tsx           # interactive checklist, localStorage progress
    LoggerInit.tsx                 # bootstraps src/services/logger
  services/
    weatherApi.ts                  # geocode + Open-Meteo forecast + itinerary transform
    db.ts                          # IndexedDB layer; wardrobe media, etc.
    logger.ts                      # client logger
  utils/
    wardrobeEngine.ts              # analyzeWardrobe()
    knapsackEngine.ts              # calculateKnapsackPhysics()
    generator.ts                   # archetype → Garment[]
    fileImporter.ts                # parseClosetFile(.txt | .md)
    suitcaseDatabase.ts            # MODELS (real-world suitcase specs)
    airlineBaggage.ts              # AIRLINES (real-world carry-on limits)
  schemas.ts                       # Zod contracts (Garment, Outfit, DayItinerary, ...)
  types.ts
__tests__/                         # Vitest coverage for engines
e2e/                               # Playwright + axe BDD specs
```

The packing checklist is persisted in `localStorage`; the wardrobe *media library* (background-removed garment images) is stored in **IndexedDB** (`src/services/db.ts`). The wardrobe list itself is supplied per-run by the archetype generator or a parsed file upload.

## Tech stack

Next.js 16 + React 19 + TypeScript, vanilla CSS (glassmorphism + high-contrast), Zod 4. Heavy compute lives client-side. **`@imgly/background-removal`** runs client-side AI for removing backgrounds from uploaded garment photos, and **`onnxruntime-web`** is wired up for any future local model. Open-Meteo is the only remote dependency, and only for geocoding + forecast.

## Development

```bash
cd projects/travel-packing-app
npm install
npm run dev           # next dev (port 3000)
npm run build         # clean + next telemetry disable + next build → out/
npm run start         # next start  (production-preview only; static export is via out/)
npm run lint          # eslint
npm run test          # Vitest unit
npm run test:e2e      # Playwright + axe a11y
```

## Verification

```bash
node scripts/test-app.mjs travel-packing-app   # security + lint + tsc + Vitest + Playwright + a11y
```

The pre-existing travel-app E2E spec calls `geocoding-api.open-meteo.com`; in an offline agent sandbox that host is unreachable and the spec will fail, with no relation to the production-bundle / production-readiness work.
