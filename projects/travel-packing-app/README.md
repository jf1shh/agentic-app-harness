# PackRight V4 — Travel Packing App (`travel-packing-app`)

A Next.js wardrobe analyzer and packing optimizer. It pulls a live weather forecast for the trip dates, generates daily warmth targets, schedules non-repeating outfits across the trip, then weighs and dimensions the resulting wardrobe against a real suitcase model and a specific airline's carry-on limits. Ships as a static web app and as a Capacitor Android WebView wrapper.

> Spec: [`specs/travel-packing-app-spec.md`](../../specs/travel-packing-app-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/travel-packing-app/>

---

## What the app actually does

### Trip input (`src/app/page.tsx`)
- Destination string → `DestinationAutocomplete` suggests real places as you type (`searchLocations()`, Open-Meteo geocoding search only) → geocode via Open-Meteo's geocoding API, falling back to Nominatim for zip/postal codes Open-Meteo doesn't recognize (`geocodeViaNominatim()`, which also resolves the destination's country code).
- **Multi-destination trips** — "+ Add Another Destination" appends extra legs beyond the primary
  destination. The trip's total days split across every leg as evenly as possible, remainder to the
  earliest legs (`splitTripDays`/`buildDestinationLegs` in `src/utils/multiDestination.ts`); each leg
  gets its own contiguous date range, geocode, and weather fetch (`fetchLegItinerary()` in
  `src/services/weatherApi.ts`), tagged onto its `DayItinerary`s as `destinationName`. The combined
  itinerary numbers days continuously (1..N) across every leg, and the packing checklist lists one
  adapter per unique plug type across the whole trip rather than only the first destination's.
- Start & end dates → fetch daily forecast → `transformWeatherToItinerary()` produces `DayItinerary[]` with `weatherWarmthTarget` (0–10) and `maxTempC` per day.
- **Local Info** — once Analyze resolves a destination country, `LocalInfoPanel` shows a few typical tourist costs converted to the local currency (`src/services/currency.ts`, Frankfurter API) and a GOV.UK travel-advisory summary with a link to the full advisory (`src/services/advisory.ts`). On a multi-destination trip it renders one labeled section per leg, each tied to that leg's own resolved country.
- **Day-by-Day Activities** — a `DailyActivityPicker` (`src/components/DailyActivityPicker.tsx`) lets you tag each day (Beach/Hike/Ski/Formal/Business/Night Out/Gym/Transit/Casual) instead of one activity for the whole trip; an untagged day pre-selects a destination-guessed activity (`guessActivityFromDestination()` in `src/utils/activity.ts`) that you can override. On a multi-destination trip, each day's guess is made from that day's own leg destination (`buildDayDestinations`/`resolveDayActivity`), not always the primary destination. The resolved per-day activities feed `transformWeatherToItinerary()`'s third argument, so `analyzeWardrobe()`'s existing per-day evening-outfit and hot-weather rules actually vary day to day.

### Wardrobe source — two paths
- **Style archetype preset** — pick one of 12 fashion archetypes (`quiet-luxury`, `gorpcore`, `scandi`, `streetwear`, `dark-academia`, `athleisure`, `bohemian`, `preppy`, `rock`, `whimsigoth`, `coastal`, `cottagecore`), one of three packing strategies (`standard`, `flexible`, `minimalist`), and one default activity (`sightseeing`, `transit`, `formal`, `casual`). `generateWardrobeFromArchetype()` produces a starter `Garment[]` you can immediately analyze.
  - **Laundry-cycle-aware packing** — an "Assume laundry access on longer trips (weekly)" checkbox
    (on by default) caps the trip length used to size the wardrobe at one laundry cycle
    (`LAUNDRY_CYCLE_DAYS = 7`, `src/utils/laundryCycle.ts`) once the trip runs longer than that,
    since the same tops/bottoms get re-worn after washing. A no-op for trips within one cycle;
    unchecking it reverts to scaling with the full trip length (capped only by the archetype's
    palette size, as before this feature existed).
- **Custom upload** — drag in a `.txt` or `.md` wardrobe file; `parseClosetFile()` auto-detects each line's role (`top | bottom | topper | layer`), colors, and thermal score, and produces a `Garment[]` from your real closet.
- **Digital Closet manager** — the "📸 Manage Digital Closet" panel (`WardrobeManager`) lets you build that same `Garment[]` by hand instead of uploading a file: add an item (name, role, color, evening flag) via `buildManualGarment()`, then attach a photo with on-device AI background removal (`@imgly/background-removal`), stored per-item in IndexedDB. A low-storage warning appears before a photo save can fail silently.

### Two reports from one analysis run
1. **Wearability report** (`WardrobeAnalyzer` component, fed by `analyzeWardrobe()`)
   - **Flexibility Score** across the wardrobe.
   - **MVP item** — the one garment that unlocks the most outfits; losing it causes the largest flexibility collapse.
   - **Dead Weight** — items that never appear in any scheduled outfit.
   - **Smart Swap Suggestions** — targeted item replacements that would most reduce dead weight.
2. **Knapsack physics report** (`calculateKnapsackPhysics()`)
   - Total weight and volume vs. the selected suitcase's real capacity (`MODELS` in `src/utils/suitcaseDatabase.ts` — 64 models across 25 brands). `SuitcaseFinder` lets you search by brand/model text or paste a barcode number (`lookupByBarcode`) instead of scrolling the full dropdown.
   - Airline compliance against the chosen airline's carry-on limits (`src/utils/airlineBaggage.ts` — 77 carriers across 7 regions, with `searchAirlines`/`getAllAirlines`/`getRegions` for lookup).
   - **Packed volume by category** — a hand-rolled SVG donut chart (`VolumeDonutChart`, no charting
     library) breaks the packed volume down by each garment's `category` field, driven by a pure
     `computeVolumeBreakdown()` (`src/utils/volumeBreakdown.ts`) over the same packed-garment set the
     physics numbers above come from (`getPackedGarments()`, shared by both so there's one definition
     of "what's actually packed").
   - **3D suitcase packing view** — alongside the donut chart, a Three.js bounding-box view
     (`Volume3DPanel.tsx` / `Volume3DScene.tsx`) shows the selected suitcase as a wireframe box with
     each packed category rendered as a proportionally-sized stacked layer inside it — orbit/zoom via
     `OrbitControls`, no drag-to-repack. The layer geometry (`computeVolumeBlocks()` in
     `src/utils/volumeBlocks.ts`) is pure and reads its cm³ figures straight from the same
     `computeVolumeBreakdown()` slices the donut chart uses (never re-derived), and is sized to the
     same suitcase model (`selectedSuitcase`) the physics numbers above are already computed against.
     Three.js/WebGL is client-only, so `Volume3DScene` is loaded exclusively via
     `next/dynamic(..., { ssr: false })` — this app is a static export (`output: 'export'`), and a
     module that touches `window`/WebGL at eval time fails `next build` outright. Accessibility: the
     canvas is invisible to assistive tech, so the view is wrapped in a `role="img"` region with an
     `aria-label` built from the same slices (never a re-derived figure) and an `aria-describedby`
     text-fallback list repeating the identical breakdown — adapted from the donut chart's own legend
     pattern, so the two visualizations can never disagree.

### Drag-and-drop Outfit Editor (`@dnd-kit/core`)
Drag any item out of the Digital Closet and drop it onto a scheduled day's Top/Bottom/Layer slot to
manually override the auto-scheduler's pick for that one day. A drop only succeeds if
`generateAllValidOutfits()` — the same function the automatic scheduler itself uses — already
recognizes the resulting combination as valid; an invalid drop (wrong role, a color clash) is rejected
with an on-screen message rather than silently accepted (`findValidSwap`/`applyGarmentSwap` in
`src/utils/outfitEditor.ts`). A successful swap re-derives MVP item, dead weight, and the swap
suggestion from the edited schedule via `deriveUsageStats()` — the same function `analyzeWardrobe()`
calls, extracted so the two paths can't drift — and recomputes the knapsack physics so weight/volume
stay consistent with what's actually scheduled. Scoped to swapping an existing role's garment for
another of the same role; there's no drop target for adding a topper to a day that doesn't have one.

### Theme toggle
Light/dark, persisted under `packright_theme` in `localStorage`. Respects `prefers-color-scheme: dark` on first visit.

### Internationalization
A language switcher in the header covers 11 languages — English, Arabic, German, Spanish, French,
Hindi, Italian, Japanese, Korean, Portuguese, and Chinese. The initial language is detected from a
persisted choice (`packright_lang` in `localStorage`), then the browser's `navigator.languages`,
falling back to English. Every non-English dictionary is lazy-loaded on selection so the initial
bundle only ships English. Selecting Arabic flips `document.dir` to `rtl`. See
`src/i18n/translate.ts` (pure resolution/interpolation logic) and `src/i18n/context.tsx` (the
`I18nProvider`/`useT()` React wiring). Translation files under `src/i18n/translations/*.json` are
parity-tested against English (`__tests__/i18n.test.ts`) — every language must carry the same key
set, no empty values, and the same `{placeholder}` tokens per key. The 10 non-English files are a
first-pass, AI-generated translation and would benefit from native-speaker review. Translation
coverage is `page.tsx`, `WardrobeAnalyzer.tsx`, and `PackingChecklist.tsx` only — `DestinationAutocomplete`,
`LocalInfoPanel`, `DailyActivityPicker`, `SuitcaseFinder`, and `WardrobeManager` (each from an
independently-developed phase branch) still render their own hardcoded English strings; extending
`useT()` into them is a natural follow-up.

### Share Trip, Print, and Group Sync
- **Share Trip** — the "🔗 Share Trip" header button compresses the trip's inputs into a `#share=` URL fragment (`src/utils/share.ts`, `lz-string`) and copies it to the clipboard. Opening that link — including pasting it into a tab that already has the app open, a same-document fragment change — restores the same trip. The decoded payload is validated against `TripShareSchema` before it touches app state, since a share link is attacker-controllable input.
- **Print** — the Physical Packing Checklist has its own `@media print` stylesheet (`globals.css`) that hides every other panel and forces light colors regardless of the on-screen theme, plus a "🖨️ Print" button.
- **Group sync** — packing checkmarks sync live across browser tabs on the same origin via `BroadcastChannel` (`src/services/groupSync.ts`); a "🔄 Live sync across tabs" indicator shows when the browser supports it. Deliberately tab-to-tab only, no server, matching the app's 100%-local design.

### Quick wins: travel adapter, Start Over, Delete All My Data
- **Destination-aware travel adapter** — the packing checklist's essentials always include one travel
  adapter. `getAdapterPlugType()` (`src/utils/plugs.ts`) resolves the destination's IEC wall-plug type
  from its country code; the checklist names the specific type (e.g. "Travel Adapter (Type C/F
  outlets)") when known, falling back to "Universal Travel Adapter" otherwise. The essentials list and
  progress-percent calculation are pure functions (`src/utils/checklistEssentials.ts`) the component
  calls, not logic reimplemented inline.
- **Start Over** — once a plan is generated, clears the report/physics/itinerary/garments so you can
  plan again without reloading the page. Leaves the packing checklist's own saved checkmarks alone.
- **Delete All My Data** — a footer button that wipes IndexedDB (wardrobe photos, via the existing
  `clearAllLocalData()`) and every `localStorage` key, then reloads. Confirmed via `window.confirm()`.

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
    WardrobeManager.tsx            # Digital Closet: add/photo/delete real garments
    PackingChecklist.tsx           # interactive checklist, print stylesheet, group sync
    DestinationAutocomplete.tsx    # live destination suggestions (searchLocations)
    LocalInfoPanel.tsx             # typical-cost currency conversion + travel advisory
    DailyActivityPicker.tsx        # per-day activity tagging (Beach/Hike/Ski/Formal/...)
    SuitcaseFinder.tsx             # brand/model text search + barcode lookup
    VolumeDonutChart.tsx           # 2D SVG donut chart of packed volume by category
    Volume3DPanel.tsx              # accessible wrapper: aria-label/description + text fallback
    Volume3DScene.tsx              # the Three.js/WebGL canvas, loaded via next/dynamic({ssr:false})
    LoggerInit.tsx                 # bootstraps src/services/logger
  services/
    weatherApi.ts                  # geocode + autocomplete + Open-Meteo forecast + itinerary transform
    currency.ts                    # Frankfurter exchange rates, typical-cost conversion
    advisory.ts                    # GOV.UK travel advisories
    groupSync.ts                   # BroadcastChannel cross-tab checklist sync
    db.ts                          # IndexedDB layer; wardrobe media, checkStorageQuota()
    logger.ts                      # client logger
  i18n/
    translate.ts                   # pure key resolution/interpolation/language detection
    context.tsx                    # I18nProvider + useT() React context
    translations/*.json            # en (bundled) + 10 lazy-loaded languages
  utils/
    wardrobeEngine.ts              # analyzeWardrobe()
    knapsackEngine.ts              # calculateKnapsackPhysics()
    generator.ts                   # archetype → Garment[]
    fileImporter.ts                # parseClosetFile(.txt | .md)
    share.ts                       # encode/decode a #share= trip link (lz-string)
    activity.ts                    # guessActivityFromDestination(), resolveActivity()
    tripDuration.ts                # inclusive start/end date -> day count
    checklistEssentials.ts         # buildEssentialSpecs(), computeProgressPercent() — pure checklist logic
    plugs.ts                       # getAdapterPlugType() — IEC wall-plug type by destination country
    wardrobeBuilder.ts             # buildManualGarment() — Digital Closet's schema-valid Garment builder
    suitcaseDatabase.ts            # MODELS (64 real-world suitcase specs) + lookupByBarcode()
    airlineBaggage.ts              # AIRLINES (77 real-world carry-on policies)
    measurement.ts                 # credit-card-calibrated measurement math (pure, camera-free)
    volumeBlocks.ts                # computeVolumeBlocks() — 3D box geometry over an existing breakdown
  schemas.ts                       # Zod contracts (Garment, Outfit, DayItinerary, TripShare, ...)
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

Next.js 16 + React 19 + TypeScript, vanilla CSS (glassmorphism + high-contrast), Zod 4. Heavy compute lives client-side. **`@imgly/background-removal`** runs client-side AI for removing backgrounds from uploaded garment photos, **`onnxruntime-web`** is wired up for any future local model, and **`three`** (client-only, dynamically imported) renders the 3D suitcase packing view. Open-Meteo is the only remote dependency, and only for geocoding + forecast.

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
