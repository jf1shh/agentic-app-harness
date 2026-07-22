# 🧳 PackRight V4: Travel Packing App

PackRight V4 is an intelligent wardrobe analyzer and packing optimization engine built in Next.js. It merges strict, mathematical packing logic with live weather data, knapsack physics, and modern web architecture.

## 🌟 Core Features

- **Live Weather Integration**: Uses Open-Meteo to dynamically fetch 5-day forecasts based on geolocation and generate a targeted warmth profile for each day.
- **Advanced Wardrobe Permutation**: Generates outfits using strict, mathematically enforced rules:
  - Exclusion Tags (e.g., no clashing patterns)
  - Color Pairing (e.g., Pink and Red are mathematically excluded from pairing)
  - Time-of-Day Shifts (e.g., Evening activities strictly schedule evening-wear)
  - Hot Weather Filter (No exclusively dark-colored outfits on hot days)
  - Dynamic Material Thermals (Cashmere scores highly; Linen scores low)
- **Knapsack Physics Engine**: Calculates the precise volume and weight of your generated wardrobe against real-world airline baggage constraints (e.g., Emirates, Delta) and specific suitcase models (e.g., Away Carry-On).
- **Smart Swaps**: Analyzes failed permutations and "Dead Weight" to recommend highly targeted item swaps to boost your wardrobe's overall Flexibility Score.
- **Physical Packing Checklist**: Provides an interactive checklist with automatically calculated trip essentials ($N$ pairs of underwear/socks) and persistent `localStorage` progress tracking.
- **Digital Closet File Importer**: Allows users to upload custom `.txt` or `.md` wardrobe files. Auto-detects roles, colors, and thermal scores to schedule outfits for their actual physical wardrobe.
- **Digital Closet AI Visuals**: Uses Client-side AI (`@imgly/background-removal`) to automatically remove backgrounds from uploaded garment photos and stores them locally via IndexedDB.

## 🚀 Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

This project is rigorously tested using the Agentic App Harness constraints:
- **Unit Tests**: `npm run test` (Vitest coverage for the Wardrobe and Knapsack engines)
- **E2E & Accessibility**: `npx playwright test` (Axe-Core accessibility scans and UI testing)
- **Linting & Security**: Enforces zero `any` types and strictly audited dependencies.

## 📝 Future Roadmap (TODOs)

- [x] **Physical Packing Checklist**: Interactive checklist with persistent `localStorage` state.
- [x] **Text & Markdown Digital Closet Importer**: Upload custom `.txt` or `.md` files to schedule outfits for real wardrobes.
- [ ] **Non-Clothing Gear Categories**: Expand Knapsack Physics to include tech pouches, toiletry kits, and document organizers.
- [ ] **Multi-City Itineraries**: Expand weather fetcher and itinerary generator to handle complex multi-city trips with varying climates.
- [ ] **Mobile App Port**: Migrate the core logic engine into React Native for iOS/Android distribution.
