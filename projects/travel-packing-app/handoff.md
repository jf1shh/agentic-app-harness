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
_Last updated 2026-08-10 (Phase 17)._ The app has successfully ported all legacy V3 rules into
Next.js V4, **and** closed out every gap identified in the source-repo audit
(github.com/jf1shh/Travel-Packing-Optimizer vs. this monorepo app). Phases 11–15 and 19 are merged
to `master`; Phase 17 (3D luggage visualization) ships in the PR that added this line — see that
PR for its own verification output before treating it as merged:

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
- **Phase 17 — 3D luggage volume visualization**: `src/utils/volumeBlocks.ts`
  (`computeVolumeBlocks()`) turns the *existing* `computeVolumeBreakdown()` slices (Phase 11, never
  re-derived) plus the selected suitcase's own dimensions into stacked 3D box geometry;
  `Volume3DScene.tsx` renders it with Three.js/`OrbitControls`, loaded exclusively via
  `next/dynamic(..., { ssr: false })` from `Volume3DPanel.tsx` so the WebGL-touching module never
  reaches server-rendered code in this static export. Accessible via a `role="img"`
  aria-label/aria-describedby built from the same slices, plus a visible text-fallback list.
  Supplements the Phase 11 donut chart rather than replacing it — both read one
  `computeVolumeBreakdown()` call so they can't disagree.
- Phases 9–10 (weather-reactive packing essentials, Travel Mode preference) landed earlier in the
  same audit effort — see PRs #161/#162.
- **Phase 15 — SuitcaseLayout**: `src/utils/suitcaseLayout.ts` (`buildSuitcaseLayout`/
  `reorderSuitcaseLayout`) orders the same packed-garment set `getPackedGarments()` already derives
  into a decorative, drag-to-reorder tile view (`SuitcaseLayout.tsx`, `@dnd-kit/core`), wired into
  the Knapsack Engine panel below the volume donut chart. Deliberately unvalidated — every drop
  succeeds, since this only changes how a plan is arranged, not what's packed, unlike the
  rule-validated Outfit Editor. This was the follow-up the Phase 14 PR split out and left explicitly
  undone; see this phase's own PR body.
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
- **Phase 19 — Per-leg Local Info and activity guessing**: `LocalInfoPanel` now shows typical
  costs/travel-advisory info for **every** destination leg on a multi-destination trip, clearly
  labeled by leg, instead of only the primary destination; `DailyActivityPicker`'s pre-selected
  pill guess uses each day's own leg destination (`buildDayDestinations` in
  `src/utils/multiDestination.ts`, `resolveDayActivity` in `src/utils/activity.ts`) rather than
  always guessing from the trip's primary destination, so a day in a later leg no longer inherits
  an earlier leg's guess.
- **Phase 18 — Broader light-theme WCAG AA contrast audit**: swept every major page state (trip
  form, error/success messages, Knapsack Engine cards, dead-weight/swap-suggestion callouts,
  Digital Closet "+ Photo" placeholder, Packing Checklist checked-off rows) in forced light theme
  with `@axe-core/playwright`, fixing every hardcoded color that resolved to a sub-4.5:1 contrast
  ratio. Introduced themed `--danger-text`/`--warning-text`/`--success-text`/`--checked-item-text`
  CSS custom properties (`globals.css`) distinct from the existing `--secondary`/`--success`
  background-tint variables, since the same bright hue that's fine for a border or a background
  tint often fails AA when used as the text color itself. Also fixed a real gap in the existing
  a11y suite: axe-core cannot compute contrast through this app's `radial-gradient` body
  background, so it silently reported the gradient-covered majority of the page as "incomplete"
  rather than a violation — `e2e/light-theme-contrast.spec.ts` neutralizes the gradient with an
  injected test-only stylesheet so axe can actually evaluate it. No follow-up item.

All Phase 11–20 branches were deliberately opened independently off `master` (not
stacked) per this session's pattern, since GitHub auto-merge was enabled and landed them in an
unpredictable order — each required at least one conflict-resolution merge
(`git merge origin/master --no-edit`) against the others before it could land clean.
`specs/travel-packing-app-spec.md` now carries every feature bullet checked off, including 3D
luggage and the native Android shell (Phase 20, below). (The 3D suitcase view built in Phase 17 is a
read-only visualization of an already-computed pack, distinct from Phase 15's drag-to-reorder
`SuitcaseLayout` editor.)

**Phase 20 — Native Android shell (Capacitor), spec + E2E-proof closure**: the actual Capacitor
wrap — `capacitor.config.ts`, the committed `android/` native container, the two-export
`build`/`build:capacitor` split, and `.github/workflows/android-release-travel-packing-app.yml` —
already shipped in PR #84 ("Play Store readiness: Capacitor Android shells for the remaining 4
apps"), before this handoff.md's 2026-08-10 pass was even written; that pass's "Mobile Port (React
Native) — not started" line was stale the day it was written, describing a rewrite that was never
the plan rather than the shell that had already landed. This phase closes two real gaps left behind
by #84: the feature had **no spec coverage** (`specs/travel-packing-app-spec.md` §3a is new) and
**no E2E proof that the built output resolves at the WebView origin** — `e2e/capacitor-bundle.spec.ts`
serves the real `.next-capacitor` export at a bare origin root (the shape `https://localhost/`
presents inside the WebView, never the Pages subpath) and fails on any failed asset request or a
Pages-subpath URL baked into the bundle; this is the E2E-level proof behind
`[guardrail: capacitor-absolute-base]`, mutation-verified by temporarily forcing the Pages basePath
into the Capacitor build and confirming the new spec goes red (see PR body). No app code changed.

**Known follow-ups explicitly left undone (see each PR body for the full reasoning):** none — the
prior list (SuitcaseLayout, Mobile Port, Expanded Archetypes, 3D Luggage, per-leg LocalInfo/activity
guessing, and the light-theme contrast audit) is now fully closed across Phases 15–20 above.

Good luck! Read `specs/travel-packing-app-spec.md` for formal requirements.
