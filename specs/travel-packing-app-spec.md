# Project Specification: Travel Packing App (PackRight V3)

## 1. Product Overview
**Name:** Travel Packing App (PackRight V3 - Wardrobe Analyzer)
**Description:** An intelligent wardrobe analyzer and outfit scheduler. It calculates valid outfits based on strict pairing rules, multi-role garments, fabric warmth, and daily weather/activity constraints. It outputs a "Wearability Report" and schedules outfits across the trip without consecutive-day repeats.
**Target Audience:** Advanced travelers who want flexible, highly interchangeable capsule wardrobes rather than just piece counts.

## 2. Core Features
- [ ] Mock 3-day default itinerary representing different weather/activity contexts (e.g. Day 1: Hot/Sightseeing, Day 2: Cool/Transit, Day 3: Warm/Casual).
- [ ] Complex Wardrobe Engine that enforces garment pairing rules and exclusion tags (e.g. "this top doesn't pair with these pants").
- [ ] Multi-role garment handling (e.g. a buttondown acts as a top OR a topper).
- [ ] Consecutive-day base outfit repeat prevention.
- [ ] Wearability Report detailing Flexibility Score, MVP item, and Dead Weight (unused items).

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
  warmth: number; // 1 (Silk) to 10 (Heavy Wool)
  exclusionTags: string[]; // e.g., ['clash_navy', 'formal_only']
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
  weatherWarmthTarget: number; // Max warmth allowed for hot days, Min for cold days
  activity: string; // e.g., "sightseeing", "transit"
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

## 7. Acceptance Criteria
1. The engine successfully filters out combinations based on exclusion tags.
2. The engine schedules outfits such that Day N base != Day N-1 base.
3. Wearability Report correctly identifies items that were never used in any scheduled outfit as "Dead Weight".
