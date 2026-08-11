# PackRight — Play Console listing kit

Same method as `projects/mood-diner/store-listing/`: assets built from the app's real brand color
and real UI, copy checked against what the app actually does, Q&A answers cross-checked against
`public/privacy.html` — which this pass corrected first (see below).

## A fix made before writing the Q&A below
`public/privacy.html`'s Permissions section said the app "requests no location, storage, contacts,
or other sensitive permission" beyond `INTERNET`, and that adding a wardrobe photo "does not
require a storage or camera permission." That was true when it was written, but
`AndroidManifest.xml` now also declares `android.permission.CAMERA` for the suitcase scanner's
"📷 Scan" button (`SuitcaseScanner.tsx`, a live-camera barcode/tap-to-measure flow) — a feature
added after the policy's last update and never folded back into it. Writing an honest data-safety
answer meant fixing that gap first rather than writing around it: `public/privacy.html` now
documents that the scanner reads the camera stream on-device only, captures at most one still frame
held in memory for the tap-to-measure flow, and never writes anything from the camera to storage or
sends it anywhere. Confirmed by reading `SuitcaseScanner.tsx` — the only camera-related state
(`capturedImage`) is a React `useState` value, never passed to `localStorage`, IndexedDB, or a
network call.

## Assets

| File | Spec | Notes |
|---|---|---|
| `icon-512.png` | 512×512 | Recreated at full resolution from the real launcher icon (blue `#0369a1` background, white "TP" monogram) — no existing web-facing icon file to reuse. |
| `feature-graphic.png` | 1024×500 | Built from the same icon + brand color. No store badges, no fabricated numbers. |
| `screenshots/1-trip-setup.png` | 1080×1920 | Trip details — destination, dates, the day-by-day activity picker, and the archetype-based wardrobe source. |
| `screenshots/2-wearability-report.png` | 1080×1920 | A real analysis run (network stubbed for this sandbox — see below): Flexibility Score, MVP item, Dead Weight, and a Smart Swap suggestion. |
| `screenshots/3-packing-checklist.png` | 1080×1920 | The scheduled outfit-by-day breakdown and the physical packing checklist with live progress tracking. |

Screenshots were captured with the weather/geocoding network calls stubbed to fixture data
(`page.route()`, the same pattern `e2e/travel-app.spec.ts` uses) because this sandbox has no
internet access — this mirrors the "live third-party API" testing lesson in `.agents/AGENTS.md`
§6, not a shortcut specific to this listing kit. The UI and every figure shown are the app's real
output for that fixture weather data, not a mockup; recapture with a live destination if you want
screenshots reflecting an actual place and forecast rather than the Hawaii fixture used here.

## Category
**Travel & Local.** Trip planning, weather-matched packing, and suitcase logistics are the core of
the app.

## Short description (≤80 chars)
```
Weather-matched outfits and a packing list sized to your actual suitcase
```
(72 chars)

## Full description (≤4000 chars)
```
PackRight builds a packing list around your actual trip — the real weather forecast for your
dates, and a real suitcase model's actual capacity — instead of a generic checklist.

WEATHER-MATCHED, DAY BY DAY
Enter your destination and dates and PackRight pulls the live forecast, then schedules a
non-repeating outfit for every day of the trip, tuned to that day's temperature and precipitation.
Multi-destination trips get their own per-leg weather and adapter guidance rather than one
forecast stretched across the whole itinerary.

BUILD YOUR WARDROBE YOUR WAY
Start from one of 15 style archetypes (from Quiet Luxury to Streetwear to Old Money), upload your
own closet as a text file, or build a digital closet by hand — attach a photo to any item and
on-device background removal cleans it up automatically, with nothing ever uploaded anywhere.

KNOW BEFORE YOU CLOSE THE ZIPPER
See your wardrobe's Flexibility Score, its MVP item (the one piece unlocking the most outfit
combinations), and its Dead Weight (items that never make it into a scheduled outfit) — with a
Smart Swap suggestion when one item is quietly costing you options.

WEIGHED AND SIZED TO YOUR REAL BAG
Pick from 64 real suitcase models across 25 brands (or scan a barcode, or tap-measure a bag that
isn't in the catalog using a credit card for scale) and see your packed volume and weight measured
against that bag's actual capacity and your airline's carry-on limit — not a generic "pack light"
suggestion.

A CHECKLIST THAT SYNCS AND PRINTS
The physical packing checklist tracks what's actually in the suitcase as you check items off, syncs
across open tabs, and prints cleanly for a paper backup.

PRIVATE BY DESIGN
No account, no analytics, no ad tracking. Your wardrobe photos, trips, and packing lists stay on
your device. The only network calls are the destination and weather lookups you trigger by
entering a trip, and — if you use it — the barcode/measurement scanner reads your camera locally
and never uploads a frame.

Works as an installed app or straight from your browser.
```
(2,061 chars)

## Content rating questionnaire (IARC) — answers to select
| Question | Answer | Why |
|---|---|---|
| Violence | None | — |
| Sexual content | None | — |
| Profanity / crude humor | None | — |
| References to alcohol / drugs / tobacco | None | — |
| Gambling / simulated gambling | None | — |
| User-generated content shared with other users | No | Wardrobe photos, trips, and packing lists are local-only — no sharing or multi-user surface |
| Shares user's location | No | The destination you type is geocoded, but the app never reads the device's actual GPS/location — no location permission is requested |
| Digital purchases | No | No paywall, tier, or purchase flow anywhere in the app |

Clean across the board — no live third-party content feed here the way smart-recipe-app has, so
no defensive "consider yes" the way that app's alcohol answer needed.

## Data safety form — answers to select
**"No data collected"** for every category except one worth walking through rather than answering
on autopilot: **Photos and videos**, because of the CAMERA permission fixed above.

- **Location**: No. The destination text you type is sent to a geocoding API to resolve
  coordinates for the weather lookup — that's the app acting on text you typed, not the app reading
  your device's actual location, and no location permission is requested.
- **Photos and videos**: The camera stream for the suitcase scanner is processed on-device and,
  for the tap-to-measure flow, one frame is held in memory only — never written to storage, never
  transmitted. Play's Data Safety guidance is about data the app *collects* (persists or sends off
  device), and ephemeral in-memory processing that's discarded on close doesn't meet that bar the
  same way mood-diner's Unsplash image *loading* isn't "collection" either — but this is the
  judgment call in this kit most worth double-checking against Play's current Data Safety help
  article yourself before submitting, since "camera used, nothing saved" is exactly the edge case
  that policy language gets refined around. Wardrobe photos are a separate, unambiguous case: they
  go through the system photo picker (no permission needed) and are stored in IndexedDB, on-device
  only, with on-device background removal (`@imgly/background-removal`) — never uploaded.
- Every other category (Personal info, Financial info, Health and fitness, Messages, Audio,
  Files/docs, Calendar, Contacts, App activity, Web browsing, App info/performance, Device/other
  IDs): **No**, per `public/privacy.html`.
