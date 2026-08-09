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
- [x] Knapsack Physics Engine (calculates volume/weight limits against specific Airline rules) — the
  suitcase catalog (`src/utils/suitcaseDatabase.ts`) covers 64 real models across 25 brands, and the
  airline catalog (`src/utils/airlineBaggage.ts`) covers 77 carriers across 7 regions. A `SuitcaseFinder`
  component lets a user look a suitcase up by brand/model text search or by pasting a barcode number
  (`lookupByBarcode`), rather than only scrolling a flat dropdown. `src/utils/measurement.ts` ports the
  credit-card-calibrated measurement math (pixel distance -> mm/px scale -> cm dimensions) as pure,
  camera-free functions — a future camera-based photo-tap UI can build on it directly, but that live
  camera/canvas flow itself is out of scope here (see the PR's "Left undone" note: it cannot be
  meaningfully exercised or verified in this harness, which has no camera).
- [x] Digital Closet (IndexedDB + Client-side AI Background Removal).
- [x] 12 fashion archetypes for the style-preset wardrobe source — Quiet Luxury, Gorpcore, Scandi
  Minimalist, Y2K Streetwear, Dark Academia, Athleisure, Bohemian / Resort, Ivy League Prep, Rock
  Chic, Whimsigoth, Coastal Maritime, Cottagecore — each a `tops`/`bottoms`/`outerwear`/`colors`
  palette in `src/utils/generator.ts`'s `PALETTES`, consumed the same way regardless of key.

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
