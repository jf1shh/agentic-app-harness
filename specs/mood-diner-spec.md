# Project Specification: MoodDiner (Smart Restaurant Recommender & Booking App)

## 1. Product Overview
**Name:** MoodDiner
**Description:** A smart, mood and occasion-driven restaurant discovery, menu inspection, busy-time analysis, weather-aware filtering, review comment vibe sentiment parser, and table reservation application. It aggregates reviews across **Google Reviews**, **Yelp**, **TripAdvisor**, **Michelin Guide**, **The Infatuation**, and **OpenTable Verified Diners** into a unified multi-source scoring model and parses review text comments to extract ambiance keywords (*candlelit*, *romantic*, *cozy fireplace*, *high energy*, *date night*) to calculate a **Review Vibe Match Score**.

## 2. Core Features
- [x] **Review Comment Vibe & Ambiance Parser:** Scans customer review text comments and extracts mood signals (e.g., *"candlelit table"*, *"quiet romantic corner"*, *"high energy lounge"*, *"great birthday celebration"*) to compute a Review Vibe Confidence Score (%) and highlight supporting reviewer quotes.
- [x] **Multi-Source Review Aggregator Engine:** Combines review data across 6 top dining sources:
  1. **Google Reviews** (Rating 1.0–5.0 & review count)
  2. **Yelp** (Rating 1.0–5.0 & review count)
  3. **TripAdvisor** (Rating 1.0–5.0 & review count)
  4. **Michelin Guide** (3 Stars ⭐️⭐️⭐️, 2 Stars ⭐️⭐️, 1 Star ⭐️, Bib Gourmand 🍽️)
  5. **The Infatuation** (Rating 1.0–10.0 scale)
  6. **OpenTable Verified Diners** (Rating 1.0–5.0 from verified diner bookings)
- [x] **Real-World Authentic Restaurant Catalog & Live Search:** Populated with real-world icon restaurants (Gary Danko, Nobu Malibu, Katz's Delicatessen, Balthazar NY, Bestia LA, Ippudo NY, Le Bernardin) featuring genuine addresses, real multi-source ratings, real review text comments, authentic menus with real prices, and accurate busy time profiles.
- [x] **Live Real Restaurant Search & Multi-Source Importer:** Allows users to search and add any custom real-world restaurant with review comment text input.
- [x] **Mood & Occasion Engine:** Filter and rank restaurants by occasion (Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night) and mood (Romantic, High Energy, Cozy, Upscale, Outdoor Patio).
- [x] **Website Open Status Verification:** Real-time checking algorithm verifying restaurant open/close hours from restaurant website data.
- [x] **Dynamic Web Menu Extraction:** Displays structured current menu sections with pricing, dietary tags, and weather pairing notes.
- [x] **Weather-Aware Intelligence:** Automatically integrates current temperature and weather conditions to boost weather-suitable options and filter out mismatched recommendations.
- [x] **Distance & Transport Radius Filter:** Filter by Walking Distance (< 15 mins / < 0.8 mi) or Driving Distance (5-30 mins drive).
- [x] **Popular Times & Busy Heatmap:** Interactive hourly traffic breakdown.
- [x] **Smart Table Reservation Engine:** Interactive booking modal with date/time slot selection, seating preferences, and special requests.

## 3. Data Models
```typescript
export interface ReviewCommentSnippet {
  id: string;
  source: 'Google' | 'Yelp' | 'TripAdvisor' | 'OpenTable';
  author: string;
  rating: number;
  date: string;
  commentText: string;
  detectedMoods: string[];
}

export interface ReviewVibeAnalysis {
  matchScore: number; // 0 - 100%
  topKeywords: string[];
  quotes: ReviewCommentSnippet[];
}
```
