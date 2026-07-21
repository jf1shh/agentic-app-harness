# Project Specification: MoodDiner (Smart Restaurant Recommender & Booking App)

## 1. Product Overview
**Name:** MoodDiner
**Description:** A smart, mood and occasion-driven restaurant discovery, menu inspection, busy-time analysis, weather-aware filtering, and table reservation application. It aggregates Yelp and Google Reviews into a unified scoring model, verifies real-time website open status and authentic current menus from real-world dining institutions (plus live real restaurant search lookup), calculates walking vs. driving distance radii, and intelligently adjusts cuisine suggestions based on real-time weather conditions (e.g., avoiding hot soups in peak summer heat).
**Target Audience:** Diners looking for curated, weather-appropriate, occasion-tailored dining experiences with seamless reservation booking at authentic real-world restaurants.

## 2. Core Features
- [x] **Real-World Authentic Restaurant Catalog & Live Search:** Populated with real-world icon restaurants (e.g., Gary Danko, Nobu Malibu, Katz's Delicatessen, Balthazar NY, Bestia LA, Girl & the Goat, Ippudo NY, Le Bernardin) featuring genuine addresses, real Google + Yelp review counts/ratings, real website links, authentic menus with real prices, and accurate busy time profiles.
- [x] **Live Real Restaurant Search & Adder:** Allows users to search and add any custom real-world restaurant with instant automatic aggregate scoring and website verification.
- [x] **Mood & Occasion Engine:** Filter and rank restaurants by occasion (Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night) and mood (Romantic, High Energy, Cozy, Upscale, Outdoor Patio).
- [x] **Aggregate Review Scoring System:** Combines Yelp score + review count and Google Reviews rating + count into a weighted composite score with visual score breakdown.
- [x] **Website Open Status Verification:** Real-time checking algorithm verifying restaurant open/close hours from restaurant website data.
- [x] **Dynamic Web Menu Extraction:** Displays structured current menu sections (Appetizers, Mains, Desserts, Beverages, Chef Specials) with pricing, dietary tags, and weather pairing notes.
- [x] **Weather-Aware Intelligence:** Automatically integrates current temperature and weather conditions (Hot Summer, Cold Winter, Rainy, Sunny) to boost weather-suitable options (e.g., roof-top/patio/ice cream/sushi in summer; hot soup/hot pot/fireplaces in winter) and filter out mismatched recommendations.
- [x] **Distance & Transport Radius Filter:** Filter by Walking Distance (< 15 mins / < 0.8 mi) or Driving Distance (5-30 mins drive) with walking/driving directions modal.
- [x] **Popular Times & Busy Heatmap:** Interactive hourly traffic breakdown, indicating peak vs. quiet hours and recommending optimal arrival windows for desired vibe.
- [x] **Smart Table Reservation Engine:** Interactive booking modal supporting party size, date/time slot selection, seating preferences (outdoor, window, booth), special occasion requests (anniversary champagne, birthday candle), instant booking confirmation, and reservation management.

## 3. Architecture & Tech Stack
- **Framework:** Vite + React (TypeScript) in `projects/mood-diner`.
- **Styling:** Vanilla CSS design system (dark mode glassmorphism, HSL color system, responsive grid/flexbox, custom animations, custom weather-themed animated backgrounds).
- **State Management:** React Context / Custom Hooks with persistent LocalStorage for saved reservations, custom added real restaurants, & user preference history.
- **Testing Suite:**
  - **Unit Testing:** Vitest for scoring algorithm, weather filter rules, distance calculations, real restaurant search parsing, and open status verification logic.
  - **E2E & Accessibility Testing:** Playwright + `@axe-core/playwright` for full booking flow and accessibility verification.
  - **Harness Compliance:** Must pass `.\scripts\test-app.ps1 -AppName mood-diner`.

## 4. Data Models & Data Structures
```typescript
export interface ReviewSource {
  rating: number; // e.g. 4.8
  reviewCount: number; // e.g. 3200
}

export interface AggregateScore {
  compositeScore: number;
  google: ReviewSource;
  yelp: ReviewSource;
  sentimentSummary: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Appetizers' | 'Mains' | 'Desserts' | 'Drinks' | 'Specials';
  dietary?: ('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Nut-Free')[];
  isHotDish?: boolean;
  isColdDish?: boolean;
}

export interface BusyHourData {
  hour: number;
  occupancyPercent: number;
  label: string;
  vibe: 'Quiet & Intimate' | 'Moderate' | 'Peak & Lively';
}

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  occasions: string[];
  moods: string[];
  aggregateScore: AggregateScore;
  websiteUrl: string;
  verifiedWebsiteStatus: 'Verified Open' | 'Closed Now' | 'Website Check Pending';
  openingHours: { [day: string]: { openHour: number; closeHour: number } };
  menu: MenuItem[];
  busyHours: BusyHourData[];
  address: string;
  distanceMiles: number;
  walkTimeMinutes: number;
  driveTimeMinutes: number;
  outdoorSeating: boolean;
  hasFireplace: boolean;
  heroImage: string;
  priceRange: '$$' | '$$$' | '$$$$';
  isRealWorldVerified?: boolean;
}
```

## 5. Acceptance Criteria
- [x] Application updated with real-world iconic restaurants (Gary Danko, Nobu Malibu, Katz's Delicatessen, Balthazar, Bestia, Ippudo, Le Bernardin, Girl & the Goat).
- [x] Includes real addresses, actual Yelp & Google review numbers, authentic menu dishes with real pricing.
- [x] Live Real Restaurant search & add tool in UI.
- [x] Passes all checks in `.\scripts\test-app.ps1 -AppName mood-diner`.
