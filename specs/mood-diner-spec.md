# Project Specification: MoodDiner (Smart Restaurant Recommender & Booking App)

## 1. Product Overview
**Name:** MoodDiner
**Description:** A smart, mood and occasion-driven restaurant discovery, menu inspection, busy-time analysis, weather-aware filtering, and table reservation application. It aggregates reviews across **Google Reviews**, **Yelp**, **TripAdvisor**, **Michelin Guide**, **The Infatuation**, and **OpenTable Verified Diners** into a unified multi-source scoring model, verifies real-time website open status and authentic current menus from real-world dining institutions (plus live real restaurant search lookup), calculates walking vs. driving distance radii, and intelligently adjusts cuisine suggestions based on real-time weather conditions.
**Target Audience:** Diners looking for curated, weather-appropriate, occasion-tailored dining experiences with multi-platform review consensus and seamless reservation booking.

## 2. Core Features
- [x] **Multi-Source Review Aggregator Engine:** Combines review data across 6 top dining sources:
  1. **Google Reviews** (Rating 1.0–5.0 & review count)
  2. **Yelp** (Rating 1.0–5.0 & review count)
  3. **TripAdvisor** (Rating 1.0–5.0 & review count)
  4. **Michelin Guide** (3 Stars ⭐️⭐️⭐️, 2 Stars ⭐️⭐️, 1 Star ⭐️, Bib Gourmand 🍽️, or Recommended)
  5. **The Infatuation** (Rating 1.0–10.0 scale)
  6. **OpenTable Verified Diners** (Rating 1.0–5.0 from verified diner bookings)
- [x] **Real-World Authentic Restaurant Catalog & Live Search:** Populated with real-world icon restaurants (Gary Danko, Nobu Malibu, Katz's Delicatessen, Balthazar NY, Bestia LA, Ippudo NY, Le Bernardin) featuring genuine addresses, real multi-source ratings, real website links, authentic menus with real prices, and accurate busy time profiles.
- [x] **Live Real Restaurant Search & Multi-Source Importer:** Allows users to search and add any custom real-world restaurant with Google, Yelp, TripAdvisor, Michelin, Infatuation, and OpenTable ratings.
- [x] **Mood & Occasion Engine:** Filter and rank restaurants by occasion (Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night) and mood (Romantic, High Energy, Cozy, Upscale, Outdoor Patio).
- [x] **Website Open Status Verification:** Real-time checking algorithm verifying restaurant open/close hours from restaurant website data.
- [x] **Dynamic Web Menu Extraction:** Displays structured current menu sections (Appetizers, Mains, Desserts, Beverages, Chef Specials) with pricing, dietary tags, and weather pairing notes.
- [x] **Weather-Aware Intelligence:** Automatically integrates current temperature and weather conditions (Hot Summer, Cold Winter, Rainy, Sunny) to boost weather-suitable options and filter out mismatched recommendations.
- [x] **Distance & Transport Radius Filter:** Filter by Walking Distance (< 15 mins / < 0.8 mi) or Driving Distance (5-30 mins drive).
- [x] **Popular Times & Busy Heatmap:** Interactive hourly traffic breakdown, indicating peak vs. quiet hours and recommending optimal arrival windows.
- [x] **Smart Table Reservation Engine:** Interactive booking modal with date/time slot selection, seating preferences, special occasion requests, and instant confirmation.

## 3. Architecture & Tech Stack
- **Framework:** Vite + React (TypeScript) in `projects/mood-diner`.
- **Styling:** Vanilla CSS design system (dark mode glassmorphism, HSL color system, responsive grid/flexbox, custom animations, custom weather-themed animated backgrounds).
- **State Management:** React Context / Custom Hooks with persistent LocalStorage for saved reservations & custom added real restaurants.
- **Testing Suite:**
  - **Unit Testing:** Vitest for multi-source scoring algorithm, weather filter rules, distance calculations, and open status verification logic.
  - **E2E & Accessibility Testing:** Playwright + `@axe-core/playwright` for full booking flow and accessibility verification.
  - **Harness Compliance:** Must pass `.\scripts\test-app.ps1 -AppName mood-diner`.

## 4. Data Models & Data Structures
```typescript
export interface ReviewSource {
  rating: number; // e.g. 4.8
  reviewCount: number; // e.g. 3200
}

export interface MichelinStatus {
  stars?: 1 | 2 | 3;
  bibGourmand?: boolean;
  recommended?: boolean;
  description?: string;
}

export interface AggregateScore {
  compositeScore: number; // 0 - 5.0 scale
  google: ReviewSource;
  yelp: ReviewSource;
  tripAdvisor?: ReviewSource;
  michelin?: MichelinStatus;
  infatuationScore?: number; // 0 - 10.0 scale
  openTable?: ReviewSource;
  sentimentSummary: string;
}
```

## 5. Acceptance Criteria
- [x] Multi-source review engine integrated for Google, Yelp, TripAdvisor, Michelin Guide, The Infatuation, and OpenTable.
- [x] Multi-source breakdown visualizer rendered in card and detailed modal views.
- [x] Custom restaurant importer updated with multi-source review fields.
- [x] Passes all checks in `.\scripts\test-app.ps1 -AppName mood-diner`.
