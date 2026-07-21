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
- **Digital Closet**: Uses Client-side AI (`@imgly/background-removal`) to automatically remove backgrounds from uploaded garment photos and stores them locally via IndexedDB.

## 🚀 Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

This project is rigorously tested using the AI Building Harness constraints:
- **Unit Tests**: `npm run test` (Vitest coverage for the Wardrobe and Knapsack engines)
- **E2E & Accessibility**: `npx playwright test` (Axe-Core accessibility scans and UI testing)
- **Linting & Security**: Enforces zero `any` types and strictly audited dependencies.

## 📝 Future Roadmap (TODOs)

- [ ] **Mobile App Port**: Migrate the core logic engine into React Native for iOS/Android distribution.
- [ ] **Multi-City Itineraries**: Expand the weather fetcher and itinerary generator to handle complex trips with varying climates (e.g., 2 days in London, 3 days in Rome).
- [ ] **Expanded Archetypes**: Add more default packing palettes (e.g., "Boho Chic", "Business Casual", "Athleisure").
- [ ] **Luggage 3D Visualization**: Use Three.js to visually display how much space is left in the suitcase.
- [ ] **Community Sharing**: Allow users to export their `WearabilityReport` and share their packing lists via a unique URL.
