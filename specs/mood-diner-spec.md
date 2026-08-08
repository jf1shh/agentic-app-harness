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

## 4. UI/UX Design System

### 4.1 Information architecture: Discover → Decide → Commit
Single page, no route changes. Three stages, one screen each:

1. **Discover** — filter bar (occasion, mood, transport radius, "open now") above a card grid, always
   visible, never behind a disclosure control. The filter set is deliberately flat: 7 occasion pills, 6
   mood pills, a 3-way transport toggle, one checkbox — small enough that flattening it costs nothing
   and grouping it would cost a click for no gain. **If a future filter dimension is added, it goes
   behind a "More filters" disclosure rather than growing this bar again** — the bar's current flatness
   is a fit to today's filter count, not a permanent guarantee.
2. **Decide** — the restaurant card is the primary decision surface, not a teaser for the modal (§4.2).
   A card's two CTAs — "Menu & Times" and "Book Table" — open the detail modal directly on the relevant
   tab, so choosing to book from the grid never detours through the overview tab first.
3. **Commit** — the booking tab, converted to step-by-step disclosure per §4.4.

No account creation, login, or onboarding carousel gates any of the three stages (§4.5).

### 4.2 The card carries the decision, the modal carries the depth
A card must let a user decide "is this worth opening" without opening it. Today's card already does
this and the bar stays here: composite multi-source score with the per-source breakdown
(Google/Yelp/TripAdvisor/OpenTable/Infatuation/Michelin), the review-vibe-match badge when a mood
filter is active, the weather-suitability badge, occasion/mood tags, price tier, open-now status,
walk/drive time, and a link to the restaurant's own site. Nothing in the modal's Overview tab restates
information the card didn't already show — the modal exists for menu detail, busy-time detail, and
booking, not for a second pass at the same summary.

### 4.3 Tabs are earned here, and now have to say so structurally
Overview / Menu / Popular Times / Reserve are four independently browsable views of the same
restaurant — nothing in one panel is a live consequence of an edit in another, which is the bar this
monorepo sets for when a tab bar is the right control (`.agents/AGENTS.md` §6's "no tab bar" guidance
rejects tabs specifically where an edit's consequence lives on another tab; that reasoning argues *for*
tabs here, not against them).

What's missing is the accessible structure. The current implementation is four plain `<button>`s with a
manually-drawn active underline and no ARIA at all. **Required:**
- The tab row carries `role="tablist"`.
- Each tab button carries `role="tab"`, `aria-selected`, and `aria-controls` pointing at its panel.
- Each panel carries `role="tabpanel"` and `aria-labelledby` pointing at its tab.
- Arrow-key roving `tabindex` between tabs, per the standard tabs pattern — only one tab is ever in the
  natural tab order at a time.

**Acceptance criteria (BDD).**
- *Given* the restaurant detail modal is open, *When* it is audited, *Then* `@axe-core/playwright`
  reports no violations on the tab region (`aria-required-parent`).
- *Given* a tab has focus, *When* the right or left arrow key is pressed, *Then* focus moves to the
  next or previous tab and that tab activates.
- *Given* a card's "Book Table" button is clicked, *When* the modal opens, *Then* the Reserve tab is
  both visually active and `aria-selected="true"`.

### 4.4 Booking is a decision, not a form
The Reserve tab is currently one form with six fields exposed at once (date, time, party size,
occasion, seating preference, notes) submitted in a single step — the one place in the app where
progressive disclosure is missing rather than already present. **Required:** split it into sequential
steps inside the same tab:

1. **Date & time** — the existing date input and time-slot select, each slot labelled with its crowd
   level (already true: "5:00 PM (Quiet & Intimate)"…).
2. **Party & occasion** — party size and occasion selects.
3. **Seating & notes** — seating-preference pills and the special-requests field.
4. **Review & confirm** — a plain-language summary of the previous three steps and the existing
   "Confirm Instant Booking" action.

Confirmation stays inside the modal — no route change. The booking flow has no sharing or deep-link
requirement, so a dedicated confirmation screen would add navigation state for no benefit. Each step
keeps the values already entered if the user steps back; nothing resets on going backward.

**Acceptance criteria (BDD).**
- *Given* the Reserve tab, *When* it first opens, *Then* only the Date & time step is visible.
- *Given* a value entered on an earlier step, *When* the user advances and then returns to that step,
  *Then* the value is still there.
- *Given* the Review & confirm step, *When* "Confirm Instant Booking" is pressed, *Then* the existing
  confirmation view renders in place, inside the same modal.

### 4.5 No account gate, no onboarding carousel
Browsing, filtering, opening a restaurant, and completing a booking require no signup, login, or
account of any kind — this is a binding rule, not an artifact of the current build, matching the same
commitment `elder-care-planner` makes explicitly in its own spec. The Pro upgrade path
(`MonetizationContext`, `ProPaywallModal`) is a separate, opt-in feature-tier upsell reachable only
from the header's own "Upgrade" control — it must never interrupt browsing, filtering, opening a
restaurant detail, or completing a booking. If a future feature is gated behind Pro, the gate fires
only when that specific feature is invoked, never on page load or mid-flow.

### 4.6 Visual system (documenting what already ships)
- **Color palette:** Background `#0b0f19` (near-black navy), card surface `rgba(18, 24, 38, 0.75)`
  glass over a radial atmosphere gradient that shifts with the selected weather preset. Accents: gold
  `#f59e0b` (primary — active states, price, CTAs), emerald `#10b981` (positive/open/weather-boost),
  crimson `#f43f5e` (warnings, closed, weather-discouraged), violet `#8b5cf6` (review-vibe parsing),
  cyan `#06b6d4` (reserved). Text: primary `#f8fafc`, secondary `#94a3b8`, muted `#64748b`.
- **Typography:** system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, …`), not a webfont —
  deliberate for a Capacitor/Android shell, where a shipped web font adds load weight the OS font stack
  doesn't need.
- **Layout:** grids use `repeat(auto-fit, minmax(min(N, 100%), 1fr))` throughout (`responsive-grid`
  guardrail); the tab row and filter pills use `flexWrap: 'wrap'`.
- **Motion:** glass hover/active transitions (`--transition-smooth`, 0.25s) throughout.
  `prefers-reduced-motion` is not yet checked anywhere in the app — **gap**, to close alongside the
  tab-a11y work in §4.3 since both land in the same review pass.
- **Tone:** plain, upbeat, feature-forward copy ("Website Verified Open," "AI Weather Suitability") —
  consistent with a discovery/booking app rather than a decision-support tool under stress, which is
  why this app's voice does not follow `elder-care-planner`'s neutral third-party register.
