# 🤝 PackRight V4 - Agent Handoff Document

Welcome, fellow Agent! This document will quickly get you up to speed on the **PackRight V4** repository. This is an intelligent travel packing optimizer that enforces strict mathematical rules for styling, weather, and luggage physics.

## 📁 Repository Context
- **Path**: `projects/travel-packing-app`
- **Framework**: Next.js (App Router, Client-side logic for MVP)
- **Language**: TypeScript (Strict mode, no `any` types permitted)
- **Styling**: Vanilla CSS (No Tailwind)

## 🏗️ Architecture & Key Systems
1. **Wardrobe Permutation Engine (`src/utils/wardrobeEngine.ts`)**: 
   - The heart of the app. Generates all possible outfit combinations based on `Garment` arrays.
   - Enforces color pairing (`doColorsMatch`), exclusion tags, and hot weather dark-color filtering.
   - Schedules outfits to ensure no consecutive-day base repeats.
   - Analyzes permutations to suggest "Smart Swaps" for dead weight.

2. **Knapsack Physics (`src/utils/knapsackEngine.ts`)**:
   - Calculates the volume (cm³) and weight (grams) of packed garments.
   - Cross-references totals against `src/utils/airlineBaggage.ts` limits to flag compliance issues.

3. **Generator & Thermals (`src/utils/generator.ts`)**:
   - Holds `PALETTES` — 15 fashion archetypes (e.g. "Quiet Luxury", "Gorpcore", and Phase 16's
     "Corporate Power", "Old Money", "Balletcore").
   - `getThermalValue(name)` dynamically assigns warmth scores (1-10) by parsing string names for fabrics (Cashmere, Linen, Wool).

4. **Digital Closet (`src/services/db.ts` & `@imgly/background-removal`)**:
   - Allows users to upload photos of their generated garments.
   - AI background removal runs entirely client-side.
   - Base64 image strings are cached in the browser's IndexedDB.

5. **Weather API (`src/services/weatherApi.ts`)**:
   - Uses Open-Meteo to fetch a 5-day forecast.
   - Computes a `weatherWarmthTarget` to guide the Wardrobe Engine.

6. **Physical Interactive Checklist (`src/components/PackingChecklist.tsx`)**:
   - Renders a checkable list of all garments and auto-calculated essentials ($N$ pairs of underwear/socks).
   - Persists state in browser `localStorage`.
   - Features real-time percentage progress bar and reset functionality.

7. **Text & Markdown Closet Importer (`src/utils/fileImporter.ts`)**:
   - Intelligent parser for plain text lines, Markdown bullet lists, or pipe-delimited files.
   - Auto-detects garment roles (`top`, `bottom`, `topper`), color tags, and fabric warmth.
   - Allows users to upload their actual personal clothes to schedule outfits and compute luggage physics.

8. **Error Handling (`src/components/LoggerInit.tsx` & `error.tsx`)**:
   - Global interceptor caches fatal errors in IndexedDB.
   - React Error Boundary allows users to export the crash log to a `.txt` file.

## 🧪 Testing & Verification
You MUST run the master harness check before finalizing any feature phase:
```bash
# Run from the monorepo root (C:\Harness)
powershell -ExecutionPolicy Bypass -File .\scripts\test-app.ps1 -AppName travel-packing-app
```
This script runs:
1. `npm audit` (Security)
2. `eslint` (No warnings allowed)
3. `tsc` (Strict Type Checking)
4. `vitest` (Unit tests in `__tests__/`)
5. `playwright` (E2E & Axe-core A11y scans in `e2e/`)

## 📝 Current Status & TODOs
_Last updated 2026-08-10._ The app has successfully ported all legacy V3 rules into Next.js V4,
**and** closed out every gap identified in the source-repo audit
(github.com/jf1shh/Travel-Packing-Optimizer vs. this monorepo app), including the four large
architectural items that were the last of that backlog — all merged to `master`:

- **Phase 11 — Packed volume by category (donut chart)**: `src/utils/volumeBreakdown.ts` +
  `VolumeDonutChart.tsx`, wired into the Knapsack Engine panel. PR #163.
- **Phase 12 — Multi-destination trips**: `src/utils/multiDestination.ts` splits trip days across
  legs and builds contiguous date ranges; `weatherApi.ts`'s `fetchLegItinerary` geocodes/fetches
  weather per leg with continuous day numbering; checklist adapters and Share Trip both handle
  multiple legs. PR #164.
- **Phase 13 — Laundry-cycle-aware packing math**: `src/utils/laundryCycle.ts`
  (`effectiveDurationForPacking`) caps how many tops/bottoms `generateWardrobeFromArchetype` packs
  once a trip outlasts one weekly laundry cycle, gated by a per-trip "assume laundry access"
  checkbox (default on). PR #165.
- **Phase 14 — Drag-and-drop outfit editor**: `src/utils/outfitEditor.ts`
  (`findValidSwap`/`applyGarmentSwap`) lets a user drag a Digital Closet garment onto a scheduled
  day's Top/Bottom/Layer slot; a drop only succeeds if the wardrobe engine's own
  `generateAllValidOutfits()` already recognizes the resulting combo, so manual overrides can never
  diverge from the automatic scheduler's own rules. Uses `@dnd-kit/core`. PR #166.
- Phases 9–10 (weather-reactive packing essentials, Travel Mode preference) landed earlier in the
  same audit effort — see PRs #161/#162.
- **Phase 16 — Expanded style archetypes**: three new fashion archetypes join the original twelve in
  `src/utils/generator.ts`'s `PALETTES` — `corporate` (Corporate Power, business/boardroom formal),
  `old-money` (heritage/equestrian-adjacent), and `balletcore` (soft pastel) — each chosen for
  genuine distinctiveness from its nearest existing neighbour rather than a restyled duplicate, and
  each matching the existing data shape exactly (no `exclusionTags` on archetype-generated garments,
  colours drawn only from `COLOR_MATCHES`'s known keys, at least one `time: 'evening'` piece). The
  dropdown in `src/app/page.tsx` gained three `<option>`s (i18n'd across all 11 languages via new
  `archetype.corporate`/`archetype.oldMoney`/`archetype.balletcore` keys); `generator.test.ts` gained
  a dedicated sweep proving `generateAllValidOutfits()` finds real schedulable (including
  evening-appropriate) outfits for each new archetype, not just that the data exists.

All four Phase 11–14 branches were deliberately opened independently off `master` (not stacked) per
this session's pattern, since GitHub auto-merge was enabled and landed them in an unpredictable
order — each required at least one conflict-resolution merge (`git merge origin/master --no-edit`)
against the others before it could land clean. `specs/travel-packing-app-spec.md` now carries all
21 feature bullets checked off.

**Known follow-ups explicitly left undone (see each PR body for the full reasoning):**
- **`SuitcaseLayout`** — a visual, drag-to-reorder packing-cube layout view — was bundled with the
  outfit editor in the original audit but deliberately split out as a separate, undelivered
  feature; it's a materially different (decorative/organizational) surface from the rule-validated
  outfit editor that *was* built.
- **Mobile Port** (React Native) — not started.
- **3D Luggage** (Three.js volume visualization) — not started; the 2D SVG donut chart (Phase 11)
  covers the "where does my volume go" question without this.
- A broader light-theme color-contrast audit — Phase 14 fixed two contrast bugs it happened to
  surface via the app's first post-Analyze a11y scan, but didn't audit the rest of the app.
- `LocalInfoPanel` (typical costs / travel advisory) and `DailyActivityPicker`'s pre-selected pill
  guess still scope to the *primary* destination only on a multi-destination trip — the itinerary
  and packing math themselves are correctly per-leg, but these two secondary panels are not.

Good luck! Read `specs/travel-packing-app-spec.md` for formal requirements.
