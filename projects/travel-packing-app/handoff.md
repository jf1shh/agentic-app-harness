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
   - Holds the legacy `PALETTES` (e.g. "Quiet Luxury", "Gorpcore").
   - `getThermalValue(name)` dynamically assigns warmth scores (1-10) by parsing string names for fabrics (Cashmere, Linen, Wool).

4. **Digital Closet (`src/services/db.ts` & `@imgly/background-removal`)**:
   - Allows users to upload photos of their generated garments.
   - AI background removal runs entirely client-side.
   - Base64 image strings are cached in the browser's IndexedDB.

5. **Weather API (`src/services/weatherApi.ts`)**:
   - Uses Open-Meteo to fetch a 5-day forecast.
   - Computes a `weatherWarmthTarget` to guide the Wardrobe Engine.

6. **Error Handling (`src/components/LoggerInit.tsx` & `error.tsx`)**:
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
The app has successfully ported all legacy V3 rules into Next.js V4. The codebase is clean, tests are green.
**Future Roadmap (Where you should pick up):**
- **Mobile Port**: Migrate core logic to React Native.
- **Multi-City Itineraries**: Expand the weather fetcher to handle variable climates.
- **Expanded Archetypes**: Add more default packing palettes (e.g., "Boho Chic", "Business").
- **3D Luggage**: Implement Three.js to visually map volume usage inside the suitcase.

Good luck! Read the `specs/travel-packing-app-spec.md` for formal requirements.
