# Elder Care Planner — Play Console listing kit

Generated the same way as `projects/mood-diner/store-listing/`: assets built from the app's real
brand color and real UI, copy written to only claim what the app actually does, and Q&A answers
cross-checked against `public/privacy.html` rather than guessed.

## Assets

| File | Spec | Notes |
|---|---|---|
| `icon-512.png` | 512×512 | Recreated at full resolution from the real launcher icon (`android/.../mipmap-xxxhdpi/ic_launcher.png`, teal `#0f766e` background, white "EC" monogram) — the app had no existing web-facing icon file to reuse, only the Android mipmap set. |
| `feature-graphic.png` | 1024×500 | Built from the same icon + brand color. No store badges, no fabricated ratings. |
| `screenshots/1-triage-and-answer.png` | 1080×1920 | The five-field triage form filled with realistic figures, plus the resulting "The answer" panel — real engine output, not a mockup. |
| `screenshots/2-break-even.png` | 1080×1920 | The home-vs-facility break-even slider and crossover chart, expanded. |
| `screenshots/3-real-cost.png` | 1080×1920 | The "Make the cost more accurate" refine panel — shows the advertised-vs-real cost gap the app is built around surfacing. |

All three screenshots are real captures from the running app (`npm run dev`), not mockups — no
network calls are involved in generating them, since this app makes none at all (see below).

## Category
**Finance.** The app is a cost/runway calculator and financial planning tool; the Medicare/Medicaid
guidance is advisory content inside that same financial-planning frame, not a health-tracking
feature, so Finance fits better than Medical or Health & Fitness.

## Short description (≤80 chars)
```
What care really costs, how long the money lasts, and how to share it
```
(69 chars)

## Full description (≤4000 chars)
```
Elder Care Planner takes five numbers — state, care type, monthly income, savings, and how many
family members are sharing the cost — and gives a real answer in under a minute: what care
actually costs once the fees beyond the advertised rate are counted, how long savings and income
together cover it, and each family member's share.

BEYOND THE ADVERTISED RATE
Communities rarely charge just the base rent. The app adds the care-level surcharge, move-in fees,
and commonly-billed-separately services (medication management, incontinence care, transport) that
turn a quoted price into the real monthly bill — and states plainly how much higher that real
number is.

HOME CARE VS. A FACILITY
A break-even slider compares paying for help at home against residential care across a range of
hourly rates, and states the crossover as a range, not a false-precision single number.

THE CORRECTION MOST FAMILIES NEED
Medicare does not cover long-term custodial care — one of the most expensive and common
misconceptions in this decision — and this app puts that correction on the results page itself,
not buried in a help article.

EVERY FIGURE SHOWS ITS WORK
Any number on the page can be expanded into its derivation: what was added, what was subtracted,
and where each figure came from — a published survey, or a planning assumption clearly labeled as
such. Nothing is presented as more certain than it is.

SHARE THE COST, TRACK WHAT'S BEEN PAID
Split the monthly gap between contributing family members — equally, by income, or by care hours
contributed instead of money — and log what's actually been paid against what's owed.

BUILT FOR A CRISIS, NOT A SPREADSHEET
There is no sign-up, no account, and nothing to lose to a bad connection: the entire tool runs
without ever contacting a server. Your plan, any facility photos, and any receipts you attach stay
on your device and are saved automatically as you type — reload the page and everything is still
there.

Works as an installed app or straight from your browser.
```
(2,021 chars)

## Content rating questionnaire (IARC) — answers to select
This one is unusually clean — a financial planning tool with no fictional or dynamic content feed:

| Question | Answer | Why |
|---|---|---|
| Violence | None | — |
| Sexual content | None | — |
| Profanity / crude humor | None | — |
| References to alcohol / drugs / tobacco | None | — |
| Gambling / simulated gambling | None | — |
| User-generated content shared with other users | No | Facility notes, photos, and receipts are local-only; there is no sharing or multi-user surface |
| Shares user's location | No | No location permission requested |
| Digital purchases | No | No paywall, plan tier, or purchase flow of any kind in the app |

Every answer here should land the app at the lowest rating tier with no content descriptors at
all — there is no caveat to flag, unlike mood-diner's paywall or smart-recipe's live recipe feed.

## Data safety form — answers to select
Straight from `public/privacy.html`: **"No data collected"** across every category. This app makes
**zero network requests of any kind** — stronger than most of the other five apps, which at least
load an image or call a search API. Everything (`elder-care-planner:plan:v1` in localStorage,
facility photos and receipts in IndexedDB) stays on-device and is never transmitted.

One thing worth knowing before you submit the form, though it doesn't change the answer: the
Android manifest (`android/app/src/main/AndroidManifest.xml`) declares the `INTERNET` permission
even though the app never uses it — it's the unmodified Capacitor scaffold default, not something
added for a feature. Play's Data Safety form asks about data actually collected, not permissions
declared, so this doesn't affect the "No data collected" answer. It's a harmless discrepancy
between the manifest and the privacy policy's "makes no outbound network requests" claim, not a
policy risk, but tightening the manifest to drop the unused permission would make the two agree
outright — flagging it rather than changing it, since it's a manifest edit outside what this
listing pass was asked to do.
