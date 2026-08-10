# Project Specification: Travel Packing App (PackRight V4)

## 1. Product Overview
**Name:** Travel Packing App (PackRight V4 - Wardrobe Analyzer)
**Description:** An intelligent wardrobe analyzer and outfit scheduler. It calculates valid outfits based on strict pairing rules (color math, material thermals, daily weather/activity constraints). It outputs a "Wearability Report" and "Knapsack Physics Report" and schedules outfits across the trip without consecutive-day repeats.
**Target Audience:** Advanced travelers who want flexible, highly interchangeable capsule wardrobes rather than just piece counts.

## 2. Core Features
- [x] Live Weather integration (Open-Meteo) for dynamic itinerary warmth targets.
- [x] Destination autocomplete — `DestinationAutocomplete` suggests real places as the user types
  (`searchLocations` in `src/services/weatherApi.ts`, Open-Meteo's geocoding search only — never
  Nominatim, whose usage policy explicitly forbids client-side autocomplete). Zip/postal geocoding
  fallback to Nominatim (`geocodeViaNominatim`) already existed for the one-off destination lookup on
  Analyze and now also captures the resolved country code.
- [x] Local Info panel — once a destination resolves to a country, `LocalInfoPanel` shows a few typical
  tourist costs converted to the local currency (`src/services/currency.ts`, Frankfurter exchange-rate
  API, no key required) and a GOV.UK foreign-travel-advisory summary with a link to the full advisory
  (`src/services/advisory.ts`). Both are best-effort: an unmapped country or a failed fetch renders
  nothing rather than a broken panel.
- [x] Complex Wardrobe Engine that enforces garment pairing rules, color matching, and exclusion tags.
- [x] Multi-role garment handling and dynamic Material Thermals (Cashmere vs Linen).
- [x] Per-day activity tagging — a `DailyActivityPicker` lets the user tag each trip day
  (Beach/Hike/Ski/Formal/Business/Night Out/Gym/Transit/Casual) instead of one blanket activity for
  the whole trip. An untagged day shows a destination-guessed activity as its pre-selected pill
  (`guessActivityFromDestination` in `src/utils/activity.ts`, e.g. "Whistler" guesses `ski`), which the
  user can override; `resolveActivity` is what the wardrobe engine's day-by-day scheduling already
  branches on (evening-outfit selection, hot-weather color exclusion) — this closes the gap between
  that per-day engine capability and a UI that previously could only set one activity for every day.
- [x] Wearability Report detailing Flexibility Score, MVP item, Dead Weight, and Smart Swap Suggestions.
- [x] Knapsack Physics Engine (calculates volume/weight limits against specific Airline rules) — the
  suitcase catalog (`src/utils/suitcaseDatabase.ts`) covers 64 real models across 25 brands, and the
  airline catalog (`src/utils/airlineBaggage.ts`) covers 77 carriers across 7 regions. A `SuitcaseFinder`
  component lets a user look a suitcase up by brand/model text search or by pasting a barcode number
  (`lookupByBarcode`), rather than only scrolling a flat dropdown. `src/utils/measurement.ts` ports the
  credit-card-calibrated measurement math (pixel distance -> mm/px scale -> cm dimensions) as pure,
  camera-free functions — a future camera-based photo-tap UI can build on it directly, but that live
  camera/canvas flow itself is out of scope here (see the PR's "Left undone" note: it cannot be
  meaningfully exercised or verified in this harness, which has no camera).
- [x] Digital Closet (IndexedDB + Client-side AI Background Removal) — a manager panel
  (`WardrobeManager`) lets a user build a real custom wardrobe by hand: add a garment (name, role,
  color, evening flag), attach a photo per item with on-device background removal, and delete items.
  Garments built this way go through the same `GarmentSchema` runtime contract as the archetype
  generator and file importer (`buildManualGarment` in `src/utils/wardrobeBuilder.ts`). A low-storage
  warning (`checkStorageQuota` in `src/services/db.ts`) surfaces before a photo save can fail silently,
  per the "binary attachment must not share a storage budget" lesson in `.agents/AGENTS.md` §6 — photos
  live in IndexedDB, never in the same store as the wardrobe/trip data.
- [x] Share Trip — a "🔗 Share Trip" button compresses the trip's inputs (destination, dates,
  archetype/strategy/activity, wardrobe source, suitcase, airline) into a `#share=` URL fragment
  (`src/utils/share.ts`, `lz-string`) and copies it to the clipboard. Opening or pasting that link —
  including into an already-open tab, a same-document fragment navigation — restores the same trip.
  A decoded share payload is attacker-controllable input and is validated against `TripShareSchema`
  (`src/schemas.ts`) before it reaches app state, the same contract-first boundary file imports and
  IndexedDB data already go through.
- [x] Print — the Physical Packing Checklist has a dedicated print stylesheet (`@media print` in
  `globals.css`) that hides every other panel and renders on white paper independent of the
  on-screen light/dark theme, plus a "🖨️ Print" button.
- [x] Group trip sync — packing checkmarks sync live across browser tabs on the same origin via
  `BroadcastChannel` (`src/services/groupSync.ts`), deliberately tab-to-tab only (no server), matching
  the app's 100%-local design. A "🔄 Live sync across tabs" indicator shows when supported.
- [x] Internationalization: 11 languages (English, Arabic, German, Spanish, French, Hindi, Italian,
      Japanese, Korean, Portuguese, Chinese) with automatic browser-language detection, a persisted
      user override, and right-to-left layout for Arabic.
- [x] 15 fashion archetypes for the style-preset wardrobe source — Quiet Luxury, Gorpcore, Scandi
  Minimalist, Y2K Streetwear, Dark Academia, Athleisure, Bohemian / Resort, Ivy League Prep, Rock
  Chic, Whimsigoth, Coastal Maritime, Cottagecore, Corporate Power, Old Money, Balletcore — each a
  `tops`/`bottoms`/`outerwear`/`colors` palette in `src/utils/generator.ts`'s `PALETTES`, consumed
  the same way regardless of key. Phase 16 added the last three, chosen to be genuinely distinct
  from every existing archetype rather than a restyled duplicate: Corporate Power is
  business/boardroom formal (structured shirting, suit trousers, wool overcoats — distinct from
  Quiet Luxury's softer off-duty cashmere); Old Money is heritage/equestrian-adjacent (hunter
  green quilting, camel wool, cashmere, houndstooth — distinct from Ivy League Prep's collegiate
  stripes-and-chinos and from Dark Academia's tweed-and-plaid); Balletcore is soft pastel
  (blush/lilac/ivory satin, silk and tulle — distinct from Bohemian/Resort's earthy linen palette
  and Cottagecore's cream/olive prairie palette). Each new archetype carries the same data shape as
  the original twelve (no `exclusionTags` on any archetype-generated garment, matching existing
  behaviour), colours drawn only from `COLOR_MATCHES`' known key set so colour-clash and hot-weather
  exclusion behave identically without special-casing, and at least one `time: 'evening'` top or
  bottom so a formal/night-out day is always schedulable. The dropdown in `src/app/page.tsx` lists
  archetypes as individual `<option>`s (not auto-enumerated from `PALETTES`, matching the existing
  nine non-i18n'd archetypes' convention) — the three new options are i18n'd via
  `archetype.corporate`/`archetype.oldMoney`/`archetype.balletcore` across all 11 languages.
- [x] Destination-aware travel adapter — the packing checklist's essentials always include one travel
  adapter; `getAdapterPlugType` (`src/utils/plugs.ts`) resolves the destination's IEC wall-plug type
  from its resolved country code (e.g. Germany → "Type C/F"), and the checklist names the specific
  adapter instead of a generic one when it's known. Falls back to "Universal Travel Adapter" for an
  unresolved or unmapped country. The essentials list itself (`buildEssentialSpecs` in
  `src/utils/checklistEssentials.ts`) and the progress-percent calculation (`computeProgressPercent`)
  are pure, unit-tested functions the checklist component calls — not logic reimplemented inline.
- [x] Start Over — once a plan is generated, a "Start Over" button clears the report, knapsack physics,
  itinerary, and active garments so the trip form is ready to plan again without a page reload. Does
  not touch the packing checklist's own saved checkmarks (a separate concern, matching the app's
  existing per-feature persistence boundaries).
- [x] Delete All My Data — a footer button wipes every piece of this app's on-device state: IndexedDB
  (wardrobe photos, via the already-existing `clearAllLocalData` in `src/services/db.ts`) and every
  `localStorage` key (theme, language, checklist, saved trip), then reloads. Gated behind a native
  confirmation (`window.confirm`) describing the action as irreversible.
- [x] Packed volume by category — the Knapsack Engine panel includes a hand-rolled SVG donut chart
  (`VolumeDonutChart`, no charting library, matching this app's existing no-dependency precedent)
  breaking down packed volume by each garment's existing `category` field, driven by a pure
  `computeVolumeBreakdown` (`src/utils/volumeBreakdown.ts`) over the same packed-garment set the
  physics engine already derives (`getPackedGarments`, extracted from `calculateKnapsackPhysics` so
  both consumers share one definition of "what's actually packed"). The source app's cube-based
  packing-list categories (plane/main/base/liquid/dry/tech) have no equivalent in this app's data
  model, so the chart groups by the categories this app actually tracks rather than inventing them.
- [x] Multi-destination trips — a user can add extra destinations (`+ Add Another Destination`) beyond
  the primary one; the trip's total day count is split across every leg in order, as evenly as possible
  with the remainder going to the earliest legs (`splitTripDays`/`buildDestinationLegs` in
  `src/utils/multiDestination.ts`), and each leg gets its own contiguous date range, its own geocode +
  weather fetch (`fetchLegItinerary` in `src/services/weatherApi.ts`), and its own `DayItinerary.destinationName`
  tag. The combined itinerary numbers days continuously across the whole trip (day 1..N), never
  restarting per leg, since the wardrobe engine's scheduling already reasons about the trip as one
  continuous day sequence. The packing checklist's adapter essential becomes one-per-unique-plug-type
  across every leg (`buildEssentialSpecs` now takes `(string | null)[]`), falling back to a shared
  universal adapter for any leg whose country didn't resolve. Deliberately scoped: `LocalInfoPanel`
  (typical costs / travel advisory) stays tied to the primary destination only — extending it to every
  leg is a natural follow-up, not built here to keep this phase's blast radius achievable. Share Trip
  carries `additionalDestinations` through the share-link payload so a shared multi-destination trip
  restores completely rather than silently dropping legs.
- [x] Drag-and-drop Outfit Editor — any garment in the Digital Closet can be dragged onto a scheduled
  day's Top/Bottom/Layer slot to manually override the auto-scheduler's choice for that one day
  (`@dnd-kit/core`). A drop is only accepted if it produces a combination `generateAllValidOutfits()` —
  the wardrobe engine's own source of truth for valid pairings — already recognizes as valid
  (`findValidSwap`/`applyGarmentSwap` in `src/utils/outfitEditor.ts`); an invalid drop (a role
  mismatch, a color clash) is rejected with an on-screen message and the day is left unchanged, so a
  manual override can never introduce a combination the automatic scheduler itself would reject. A
  successful swap re-derives MVP item, dead weight, and the swap suggestion from the edited schedule
  (`deriveUsageStats`, shared with `analyzeWardrobe()` so the two never drift), and recomputes the
  knapsack physics (weight/volume) so the packed-garment set stays consistent with what's now
  scheduled. Deliberately scoped to swapping an existing role's garment for another of the same
  role — adding a topper to a day that has none is not supported (there is no drop target for a role
  the outfit doesn't already have).
- [x] SuitcaseLayout — a visual, drag-to-reorder packing-cube layout view showing every packed
  garment as a draggable tile the user can reorder by priority within the suitcase, purely
  decorative/organizational (unlike the rule-validated Outfit Editor above, a drop here always
  succeeds — there is no combination to invalidate). Built on the same packed-garment set the
  Knapsack Engine panel already derives (`getPackedGarments` from `src/utils/knapsackEngine.ts`)
  and each tile's own `category`/`volumeCm3` fields; `src/utils/suitcaseLayout.ts`
  (`buildSuitcaseLayout`/`reorderSuitcaseLayout`) only orders that existing data — it never
  recomputes weight or volume, per the "Explain the Arithmetic Without Re-implementing It" lesson
  in `.agents/AGENTS.md` §6. `SuitcaseLayout.tsx` renders the ordered tiles with `@dnd-kit/core`,
  following the same `DndContext`/`useDraggable`/`useDroppable` idiom as the Outfit Editor
  (`WardrobeAnalyzer.tsx`). The order lives in component state for the current analysis run only —
  it is not persisted across a reload or a new Analyze — since this view is about arranging an
  already-computed plan, not a second source of truth for it.
- [x] Laundry-cycle-aware packing math — a "Assume laundry access on longer trips (weekly)" checkbox
  (on by default) caps the trip length actually used to size the wardrobe at one laundry cycle
  (`LAUNDRY_CYCLE_DAYS = 7` in `src/utils/laundryCycle.ts`) once the trip runs longer than that, since
  the same tops/bottoms get re-worn after washing rather than needing a fresh item for every remaining
  day. A no-op for any trip within one cycle — `effectiveDurationForPacking()` returns the trip length
  unchanged — so this only changes behavior for genuinely long trips. Unchecking the box (no laundry
  access assumed, e.g. an off-grid trip) reverts to the pre-existing behavior of scaling with the full
  trip length, capped only by the archetype's palette size as before.
- [x] Per-leg Local Info and activity guessing — closes the "deliberately scoped" gap the
  multi-destination bullet above left open. `LocalInfoPanel` now renders a labeled section per
  destination leg (typical costs + travel advisory), each tied to that leg's own resolved country,
  never one leg's figures under another leg's heading. `DailyActivityPicker`'s pre-selected pill
  guess is made from each day's own leg destination (`buildDayDestinations` in
  `src/utils/multiDestination.ts`, consumed by `resolveDayActivity` in `src/utils/activity.ts`)
  rather than always the trip's primary destination, so a day belonging to a later leg no longer
  inherits an earlier leg's guess (e.g. a Maui-then-Whistler trip no longer guesses "beach" for
  every Whistler day).

## 3. Architecture & Tech Stack
- **Frontend:** Next.js (App Router)
- **Styling:** Vanilla CSS (Glassmorphism, High Contrast)
- **Backend/API:** Next.js API Routes (Logic Engine operates on client for MVP)
- **Database:** LocalStorage
- **Deployment:** Vercel

## 4. Data Models
```typescript
interface Garment {
  id: string;
  name: string; // e.g., "White Linen Buttondown"
  category: string; 
  roles: ('top' | 'bottom' | 'topper' | 'layer')[];
  colors: string[];
  warmth: number; // Dynamically computed based on fabric
  exclusionTags: string[]; // e.g., ['clash_navy', 'formal_only']
  weightGrams: number;
  volumeCm3: number;
  time?: 'day' | 'evening';
}

interface Outfit {
  id: string;
  top: Garment;
  bottom: Garment;
  topper?: Garment;
  totalWarmth: number;
}

interface DayItinerary {
  dayNumber: number;
  weatherWarmthTarget: number;
  activity: string;
  maxTempC?: number;
}
```

## 5. UI/UX Design System
- **Color Palette:** Clean, vibrant travel theme. Primary: #0369a1 (Dark Blue for high a11y contrast), Secondary: #f59e0b (Amber).
- **Typography:** Inter (Google Fonts).
- **Micro-interactions:** Smooth checkboxes, slide-in animations for reports.
- **Light/dark toggle — decided, not spread:** this is the only app in the monorepo with a live
  light/dark theme toggle (`data-theme`, persisted to `localStorage`, defaulting to
  `prefers-color-scheme`). Per the per-app-domain-appropriate design philosophy this repo already
  commits to (see `elder-care-planner` spec §5 and `mood-diner` spec §4.1), the toggle stays contained
  to this app rather than becoming a monorepo-wide pattern — a packing/travel planner is
  light-appropriate content in either theme, unlike `elder-care-planner`'s deliberately-fixed calm
  palette or `mood-diner`'s fixed dark identity, and there's no user need driving the other apps toward
  a toggle they don't currently have. This closes the open question, it isn't a default to revisit per
  app.

## 5a. Internationalization (i18n)
- **Coverage:** English (fallback), Arabic, German, Spanish, French, Hindi, Italian, Japanese,
  Korean, Portuguese, and Chinese — one flat, dot-path-keyed JSON dictionary per language under
  `src/i18n/translations/`. English is bundled statically since it also serves as the runtime
  fallback for any key missing from an active language; every other language is lazy-loaded via
  dynamic `import()` on selection, so a user who never switches never downloads translations they
  won't use.
- **Resolution:** `translate(activeDict, fallbackDict, key, params)` resolves a dotted key path,
  falls back to English on a miss, then interpolates `{placeholder}` tokens — a missing key
  renders the key itself rather than a blank string, so a translation gap is visible instead of
  silent.
- **Language selection:** detected once, in priority order — a previously persisted choice
  (`localStorage`), then the browser's `navigator.languages` list matched against the supported
  codes, then English. The user can override it at any time via the language switcher in the page
  header; the override persists across reloads.
- **RTL layout:** Arabic is flagged `rtl` in the language catalog; selecting it sets
  `document.documentElement.dir = 'rtl'` (and `lang` to the active code) so the browser's native
  bidi layout takes over — no per-component RTL styling is maintained separately.
- **Parity is enforced, not assumed:** a unit test suite asserts every shipped language's key set
  is identical to English's, that no value is empty, and that every `{placeholder}` set in a
  localized string exactly matches the English source's placeholder set for that key — a
  translation file that silently drops a key or a placeholder fails the suite rather than shipping
  a broken interpolation.
- **First-pass translations:** the 10 non-English translation files were produced in this session
  without native-speaker review. They are structurally correct (parity-tested) and semantically
  reasonable, but would benefit from a native-speaker pass before being treated as
  production-quality copy.

## 6. Testing & Compliance (Security, Privacy, Optimization)
- **Unit Tests:** Core Logic Engine must have Vitest coverage proving multi-role and consecutive repeat rules.
- **Security & Privacy:** Ensure no PII is logged. Audit dependencies.
- **Accessibility (A11y):** Playwright + Axe-core must pass without violations.
- **E2E network determinism:** `handleAnalyze()` calls the real Open-Meteo geocoding/forecast APIs (with
  a Nominatim fallback). The main "runs Analyze" E2E scenario stubs both endpoints via `page.route()`
  with fixture data — per the "live third-party API" lesson in `.agents/AGENTS.md` §6, the deterministic
  gate must not depend on a third party's uptime or a network-restricted environment's ability to reach
  it. A separate, clearly-labelled opt-in spec (`e2e/live-weather-integration.spec.ts`, skipped unless
  `RUN_LIVE_E2E=1`) covers the real, un-stubbed integration as an independent signal that can fail
  without blocking a merge.

## 7. Acceptance Criteria (V4)
1. The engine successfully filters out combinations based on exclusion tags, color logic, and material heat.
2. The engine schedules outfits such that Day N base != Day N-1 base.
3. Wearability Report correctly identifies items that were never used in any scheduled outfit as "Dead Weight" and suggests swaps.
4. Knapsack Physics accurately alerts users if their packed volume exceeds their airline's carry-on limits.
5. Switching the language re-renders the trip-details form, wearability report, and packing
   checklist in the selected language, persists the choice across a reload, and — for Arabic —
   flips the document to right-to-left layout without breaking accessibility.
