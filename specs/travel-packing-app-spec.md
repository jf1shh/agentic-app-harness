# Project Specification: Travel Packing App (PackRight V4)

## 1. Product Overview
**Name:** Travel Packing App (PackRight V4 - Wardrobe Analyzer)
**Description:** An intelligent wardrobe analyzer and outfit scheduler. It calculates valid outfits based on strict pairing rules (color math, material thermals, daily weather/activity constraints). It outputs a "Wearability Report" and "Knapsack Physics Report" and schedules outfits across the trip without consecutive-day repeats.
**Target Audience:** Advanced travelers who want flexible, highly interchangeable capsule wardrobes rather than just piece counts.

## 2. Core Features
- [x] Live Weather integration (Open-Meteo) for dynamic itinerary warmth targets.
- [x] Complex Wardrobe Engine that enforces garment pairing rules, color matching, and exclusion tags.
- [x] Multi-role garment handling and dynamic Material Thermals (Cashmere vs Linen).
- [x] Wearability Report detailing Flexibility Score, MVP item, Dead Weight, and Smart Swap Suggestions.
- [x] Knapsack Physics Engine (calculates volume/weight limits against specific Airline rules).
- [x] Digital Closet (IndexedDB + Client-side AI Background Removal).
- [x] Internationalization: 11 languages (English, Arabic, German, Spanish, French, Hindi, Italian,
      Japanese, Korean, Portuguese, Chinese) with automatic browser-language detection, a persisted
      user override, and right-to-left layout for Arabic.

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
