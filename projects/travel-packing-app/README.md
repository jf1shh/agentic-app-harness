# PackRight V4 — Travel Packing App (`travel-packing-app`)

A Next.js wardrobe analyzer and packing optimizer. It pulls a live weather forecast for the trip dates, generates daily warmth targets, schedules non-repeating outfits across the trip, then weighs and dimensions the resulting wardrobe against a real suitcase model and a specific airline's carry-on limits. Ships as a static web app and as a Capacitor Android WebView wrapper.

> Spec: [`specs/travel-packing-app-spec.md`](../../specs/travel-packing-app-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/travel-packing-app/>

---

## What the app actually does

### Trip input (`src/app/page.tsx`)
- Destination string → geocode via Open-Meteo's geocoding API.
- Start & end dates → fetch daily forecast → `transformWeatherToItinerary()` produces `DayItinerary[]` with `weatherWarmthTarget` (0–10) and `maxTempC` per day.
- **Day-by-Day Activities** — a `DailyActivityPicker` (`src/components/DailyActivityPicker.tsx`) lets you tag each day (Beach/Hike/Ski/Formal/Business/Night Out/Gym/Transit/Casual) instead of one activity for the whole trip; an untagged day pre-selects a destination-guessed activity (`guessActivityFromDestination()` in `src/utils/activity.ts`) that you can override. The resolved per-day activities feed `transformWeatherToItinerary()`'s third argument, so `analyzeWardrobe()`'s existing per-day evening-outfit and hot-weather rules actually vary day to day.

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
    DailyActivityPicker.tsx        # per-day activity tagging (Beach/Hike/Ski/Formal/...)
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
    activity.ts                    # guessActivityFromDestination(), resolveActivity()
    tripDuration.ts                # inclusive start/end date -> day count
    suitcaseDatabase.ts            # MODELS (real-world suitcase specs)
    airlineBaggage.ts              # AIRLINES (real-world carry-on limits)
  schemas.ts                       # Zod contracts (Garment, Outfit, DayItinerary, ...)
  types.ts
__tests__/                         # Vitest coverage for engines
e2e/                               # Playwright + axe BDD specs
public/
  privacy.html                     # Play Store privacy policy
android/                           # Capacitor-generated native container
capacitor.config.ts
deploy.config.ts                   # GitHub Pages basePath, kept out of next.config.ts
                                    # so it never appears as a literal there — see
                                    # [guardrail: capacitor-absolute-base]
```

The packing checklist is persisted in `localStorage`; the wardrobe *media library* (background-removed garment images) is stored in **IndexedDB** (`src/services/db.ts`). The wardrobe list itself is supplied per-run by the archetype generator or a parsed file upload.

## Tech stack

Next.js 16 + React 19 + TypeScript, vanilla CSS (glassmorphism + high-contrast), Zod 4. Heavy compute lives client-side. **`@imgly/background-removal`** runs client-side AI for removing backgrounds from uploaded garment photos, and **`onnxruntime-web`** is wired up for any future local model. Open-Meteo is the only remote dependency, and only for geocoding + forecast.

## Persistence and privacy

- Storage: IndexedDB (`src/services/db.ts`) for wardrobe photos and packing/trip data; `localStorage` for the theme choice and checklist state.
- Privacy policy at `public/privacy.html` — published at the Pages URL once built.
- The only remote calls are to `nominatim.openstreetmap.org` and `geocoding-api.open-meteo.com`, for the destination text and dates you enter — no wardrobe photos or packing data ever leave the device.

## Android release signing

Play only accepts an App Bundle signed with an upload key. `android/app/build.gradle` reads credentials from environment first, then from a git-ignored `android/keystore.properties`. **Neither the keystore nor its passwords are ever committed** — `*.jks`, `*.keystore`, and `keystore.properties` are in `android/.gitignore`.

### Required env vars (native only — not needed for web preview)

| Variable | Meaning |
|---|---|
| `ANDROID_KEYSTORE_FILE` | Absolute path to the decoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (`upload` by convention) |
| `ANDROID_KEY_PASSWORD` | Key password |

Missing any of the four leaves the build **unsigned** (warning) rather than failing, so `assembleRelease` still works for local smoke checks — but an unsigned artifact cannot be uploaded to Play.

### Two separate exports, not one

Next's `basePath` (unlike Vite's `base`) cannot be a relative value, so — unlike a Vite app — this app cannot ship one universal bundle to both origins. `npm run build` produces the GitHub Pages export (`basePath` set to the Pages subpath, from `deploy.config.ts`); `npm run build:capacitor` produces a second export at `.next-capacitor` with an empty (root) `basePath`, because Capacitor serves the bundle from `https://localhost/` inside the Android WebView. `capacitor.config.ts` points `webDir` at `.next-capacitor`, so `npx cap sync android` always syncs the Capacitor-target build, never the Pages one.

## Development

```bash
cd projects/travel-packing-app
npm install
npm run dev              # next dev (port 3000)
npm run build            # clean + next build → GitHub Pages export (.next, basePath set)
npm run build:capacitor  # clean + next build → Capacitor export (.next-capacitor, basePath empty)
npm run start             # next start  (production-preview only; static export is via next build)
npm run lint              # eslint
npm run test               # Vitest unit
npm run test:e2e           # Playwright + axe a11y
npx cap sync android        # after build:capacitor, sync the web bundle into the native project
```

## Verification

```bash
node scripts/test-app.mjs travel-packing-app   # security + lint + tsc + Vitest + Playwright + a11y
```

The pre-existing travel-app E2E spec calls `geocoding-api.open-meteo.com`; in an offline agent sandbox that host is unreachable and the spec will fail, with no relation to the production-bundle / production-readiness work.
