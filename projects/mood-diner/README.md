# MoodDiner (`mood-diner`)

A weather-, mood-, and occasion-aware restaurant recommender with a real-time reservation engine, a Pro monetization paywall, a website open-status checker, and an add-anywhere importer for the user's own favourite spots. Ships as a PWA and as a Capacitor Android WebView wrapper.

> Spec: [`specs/mood-diner-spec.md`](../../specs/mood-diner-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/mood-diner/>

---

## What the app actually does

### Five composable filter dimensions (`App.tsx`)
1. **Occasion** — Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night (plus `All`).
2. **Mood** — Romantic, High Energy, Cozy, Upscale, Outdoor Patio (plus `All`).
3. **Transport radius** — Walking (< 15 min), Driving (≤ 10 min), `All`.
4. **Open-now toggle** — calls `isRestaurantOpenNow(r)` against the restaurant's published opening hours.
5. **Weather preset** — drives `evaluateWeatherSuitability()` against four hard-coded presets, see below.

The filtered list is re-sorted by a composite score of `weatherSuitability × 0.5 + vibeMatchScore × 0.5`.

### Four weather presets (`src/utils/weatherEngine.ts`)
- **Hot Summer 92°F** — suppresses hot soups / heavy stews; boosts rooftop, sushi, ice cream, chilled cocktails.
- **Cold Winter 35°F** — boosts hot soups, hot pot, steakhouse fireplaces, and braises.
- **Rainy Fall 52°F** — recommends warm indoor bistro comfort dining; nudges down outdoor-only spots.
- **Mild Spring 68°F** — neutral baseline.

`evaluateWeatherSuitability()` returns a `WeatherRecommendationResult` (`weatherMatchScore`, `weatherNote`, `isWeatherDiscouraged`, `suggestedMenuItems`). The score is clamped to `[10, 100]`.

### Review-comment vibe parser (`src/utils/reviewVibeParser.ts`)
Parses customer review text for mood signals ("candlelit", "romantic", "cozy fireplace", "high energy", "date night") and computes a `vibeMatchScore` for the active mood — feeds the composite sort.

### Other engines
- `aggregateScoring.ts` — combines Google, Yelp, TripAdvisor, Michelin (`stars`), The Infatuation (0–10), and OpenTable scores into a single composite.
- `openStatus.ts` — real-time website open/close from `restaurant.openingHours`.
- `securitySanitizer.ts` — strips script / XSS vectors from user-provided review text and free-text special requests.

### Reservation engine
- `BookingsModal` lists every saved reservation.
- `RestaurantModal` (tabbed: `overview`, `menu`, `busy`, `book`) collects date / time / guests / special request, calls `onBookReservation`, persists to `localStorage` under `mood_diner_reservations`, and supports cancel-from-list.

### Pro paywall
`src/lib/monetization/MonetizationContext.tsx` exposes a `<ProPaywallModal>` and plans/credits counters in `localStorage`. Reserve plans proxy through credit costs.

### Add real restaurant anywhere
`AddRealRestaurantModal` accepts a real venue with multi-source reviews and writes it to `localStorage` under `mood_diner_custom_restaurants`; on next load it is prepended to `INITIAL_RESTAURANTS`.

## Architecture

```
src/
  App.tsx                            # state + filter pipeline + modal mount
  components/
    Header.tsx, FilterBar.tsx, RestaurantCard.tsx, RestaurantModal.tsx,
    BookingsModal.tsx, WeatherWidget.tsx, AddRealRestaurantModal.tsx,
    ProPaywallModal.tsx
  data/restaurantsData.ts            # INITIAL_RESTAURANTS (real-world dataset)
  lib/
    monetization/MonetizationContext.tsx
    schemas.ts                       # Zod contracts (Restaurant, BookingDetails, ...)
    types.ts
  utils/
    aggregateScoring.ts, openStatus.ts, reviewVibeParser.ts,
    securitySanitizer.ts, weatherEngine.ts
  utils/__tests__/                   # Vitest unit coverage for each engine
public/
  manifest.json, sw.js               # PWA shell
  privacy.html                       # Play Store privacy policy
  icon-192.png, icon-512.{jpg,png}   # app icons
  playstore-banner.jpg
android/                             # Capacitor-generated native container
capacitor.config.ts
```

## Persistence and privacy

- Storage keys: `mood_diner_reservations`, `mood_diner_custom_restaurants`, and plans/credit counters.
- Privacy policy at `public/privacy.html` — published at the Pages URL once built.
- The privacy audit confirmed: **no `fetch()` anywhere in `src/`**, no analytics SDK, no accounts, no payments. The only genuine third-party request is the Unsplash image CDN for restaurant photos.

## Android release signing

Play only accepts an App Bundle signed with an upload key. `android/app/build.gradle` reads credentials from environment first, then from a git-ignored `android/keystore.properties`. **Neither the keystore nor its passwords are ever committed** — `*.jks`, `*.keystore`, and `keystore.properties` are in `android/.gitignore`.

### Required env vars (native only — not needed for web preview)

| Variable | Meaning |
|---|---|
| `ANDROID_KEYSTORE_FILE` | Absolute path to the decoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (`upload` by convention) |
| `ANDROID_KEY_PASSWORD` | Key password |

Missing any of the four leaves the build **unsigned** (warning) rather than failing, so `assembleRelease` still works for local smoke checks — but an unsigned artifact cannot be uploaded to Play.

## Development

```bash
cd projects/mood-diner
npm install
npm run dev           # vite dev server (default port 5173)
npm run build         # clean + tsc + vite build → dist/
npm run lint
npm run test          # Vitest unit (5 engine tests)
npm run test:e2e      # Playwright + axe a11y, incl. production-bundle smoke test
```

`e2e/production-bundle.spec.ts` is the only suite that loads the built `dist/` rather than the dev server, and it serves the bundle on **two separate ports** (`:5179` at root for the Capacitor WebView, `:5180` under the Pages subpath) because this app ships to both origins and a bundle correct at one origin can be broken at the other.

## Verification

```bash
node scripts/test-app.mjs mood-diner   # security + lint + tsc + Vitest + Playwright + a11y
```
