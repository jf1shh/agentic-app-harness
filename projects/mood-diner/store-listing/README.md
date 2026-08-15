# MoodDiner — Play Console listing kit

Everything here is copy/assets to paste into Play Console, generated from the app's real UI, real
brand tokens (`src/index.css`, `src/components/Header.tsx`), and the privacy policy at
`public/privacy.html` — nothing below states anything the app doesn't actually do. Where the app's
UI currently overclaims (the paywall), that's called out rather than smoothed over.

## Assets

| File | Spec | Status |
|---|---|---|
| `public/icon-512.png` | 512×512 PNG | Already meets spec, already on-brand — reuse as-is |
| `store-listing/feature-graphic.png` | 1024×500 | New — built from the real icon + header gradient/tagline. It replaces the old `public/playstore-banner.jpg` (now deleted), which baked in a "GET IT ON Google Play" badge (Play's feature-graphic policy prohibits store badges in the image itself) and fabricated review counts ("Yelp: 4.7★ (1.2k Reviews)", "Google Maps: 4.8★ (2.5k Reviews)") that the app has no basis for claiming. Don't re-add the old banner. |
| `store-listing/screenshots/1-home.png` … `5-confirmed.png` | 1080×1920 | Real captures from the running app (filters, weather engine, a restaurant's live-extracted menu, the booking flow, and confirmation) — not mockups |

**Screenshots were captured in a network-restricted sandbox**, so the Unsplash-hosted restaurant
photos (`images.unsplash.com`, see the privacy policy's third-party section) didn't load and show
as blank space in the restaurant cards. Recapture `1-home.png` and `2-weather-engine.png` with
normal internet access before uploading — everything else in them is real. I can hand you the exact
capture script if you want to rerun it yourself rather than trusting a re-run from me.

## Category
**Food & Drink** — matches the app's own description and dataset (restaurant discovery + a personal
reservation tracker).

## Short description (≤80 chars)
```
Mood-, occasion- & weather-matched restaurant picks, with reservation tracking
```
(78 chars)

## Full description (≤4000 chars)
```
MoodDiner turns "where should we eat?" into a filtered shortlist in seconds — matched to your
occasion, your mood, and the weather outside.

HOW IT PICKS
• Occasion — Anniversary, Birthday, First Date, Business Dinner, Casual, Late Night
• Mood — Romantic, High Energy, Cozy, Upscale, Outdoor Patio
• Weather-aware — a live weather engine boosts hot soups and fireplace seating on cold nights,
  rooftop patios and chilled cocktails on hot ones, and warm indoor comfort food when it's raining
• Walking or driving radius, and an "open now" filter checked against each restaurant's real
  published hours

REAL RESTAURANTS, REAL RATINGS
Every listing is a real, named restaurant with its own address, menu, and pricing — not a
generated placeholder. Ratings are aggregated across Google, Yelp, TripAdvisor, and (where
applicable) Michelin stars and The Infatuation, so you're seeing a consensus, not one score.
Don't see your own favorite spot? Add it yourself — MoodDiner will pull in its rating and menu
signals the same way.

TRACK YOUR OWN RESERVATIONS
MoodDiner isn't a live booking service — it doesn't contact restaurants or hold a real table for
you. It's a reservation planner: log the date, time, party size, occasion, and any special
requests, and it stays organized on your device so you can reference or edit it later.

PRIVATE BY DESIGN
No account, no sign-in, no analytics, no ad tracking. Everything you enter — reservations, added
restaurants — stays in local storage on your device. The only network calls MoodDiner makes are
to load restaurant photos. Full details in the in-app privacy policy.

Works as an installed app or straight from your browser.
```
(1,696 chars)

## Content rating questionnaire (IARC) — answers to select
Standard category: **Restaurant / Lifestyle utility**, so most sections are "None":

| Question | Answer | Why |
|---|---|---|
| Violence | None | No violent content anywhere in the app |
| Sexual content | None | — |
| Profanity / crude humor | None | — |
| **References to alcohol** | **Yes** | Menu/vibe data recommends items like "chilled cocktails" and wine pairings for some restaurants — this is a reference, not depicted use, but answer honestly rather than picking "None" to get a cleaner rating |
| Controlled substances (drugs, tobacco) | None | — |
| Gambling / simulated gambling | None | — |
| User-generated content shared with other users | No | Custom-added restaurants and reservation notes are local-only, never shared or published — there is no multi-user or social surface at all |
| Shares user's location | No | App requests no location permission (`AndroidManifest.xml` declares only `INTERNET`) |
| Digital purchases | **No** | No Play Billing / real payment integration exists in the codebase |

A reference to alcohol alone typically keeps the app in the lowest tier (e.g., PEGI 3 / Everyone
with an alcohol-reference note) rather than pushing it into a restricted bracket, but let the
questionnaire's own scoring decide rather than assuming.

**Resolved:** `ProPaywallModal.tsx` previously showed real-looking pricing ("$4.99/mo", "$39.99/yr",
"Start 7-Day Free Trial"), which would have been a Play Monetization policy mismatch — a purchase-
shaped UI with no real billing behind it. The modal has since been rewritten: no currency amounts,
no trial claim, CTA reads "Unlock Pro Features" with an explicit "No payment, no account — this
preview switches your device to the Pro feature set at no cost" disclosure. Answering "No" on
Digital purchases is now accurate to both the code and the UI a reviewer or user actually sees.

## Data safety form — answers to select
Straight from `public/privacy.html`, which already states this precisely:

**"Does your app collect or share any of the required user data types?"** → **No** for every category
(Location, Personal info, Financial info, Health and fitness, Messages, Photos/videos, Audio,
Files/docs, Calendar, Contacts, App activity, Web browsing, App info/performance, Device/other IDs).
Nothing is transmitted to the developer or any third party for any of these categories — no
accounts, no analytics SDK, no ad SDK, no crash reporter.

Two things to know going into the form, not because they change any answer, but because a reviewer
might ask:
- **Restaurant images load from `images.unsplash.com`.** That's a network request (it necessarily
  sends the device's IP and user-agent to Unsplash), but it's not the app *collecting* user data in
  Play's Data Safety sense — no personal or app-activity data is attached to that request, and
  Unsplash isn't receiving anything MoodDiner itself collected. Play's own guidance treats "loading
  a remote image with no data attached" as outside the data-collection categories the form asks
  about, but if asked to justify a "No" for Device/other IDs, this is the network activity to point to.
- **Data deletion**: since nothing is collected server-side, there's no "request data deletion"
  flow to build — the in-app equivalent (uninstall, or Android Settings → Apps → MoodDiner → Storage
  → Clear data) is already documented in `privacy.html`'s "Keeping and deleting your data" section,
  which is what Play expects you to link to for that requirement.

Submit the form with **"No data collected"** and it'll match the privacy policy word for word,
which is the thing Play's review actually checks.
