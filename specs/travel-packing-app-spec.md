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

## 6. Testing & Compliance (Security, Privacy, Optimization)
- **Unit Tests:** Core Logic Engine must have Vitest coverage proving multi-role and consecutive repeat rules.
- **Security & Privacy:** Ensure no PII is logged. Audit dependencies.
- **Accessibility (A11y):** Playwright + Axe-core must pass without violations.

## 7. Acceptance Criteria (V4)
1. The engine successfully filters out combinations based on exclusion tags, color logic, and material heat.
2. The engine schedules outfits such that Day N base != Day N-1 base.
3. Wearability Report correctly identifies items that were never used in any scheduled outfit as "Dead Weight" and suggests swaps.
4. Knapsack Physics accurately alerts users if their packed volume exceeds their airline's carry-on limits.
