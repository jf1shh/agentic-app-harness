# Elder Care Planner — Play Console listing kit

Status (2026-10-06): draft only. Public launch is blocked on the cost-dataset reuse decision,
signed release bundle, native acceptance checks, and Play Console declarations. See
[PLAY-RELEASE.md](../PLAY-RELEASE.md). Nothing in this kit has been submitted. Pricing suggestion:
$2.99 USD once, awaiting Jared's choice; no subscription or in-app billing is implemented.

Generated the same way as `projects/mood-diner/store-listing/`: assets built from the app's real
brand color and real UI, copy reviewed against the implemented app and `public/privacy.html`. Console questionnaire
answers below are preparation notes; confirm the actual wording before submitting.

## Assets

| File | Spec | Notes |
|---|---|---|
| `icon-512.png` | 512×512 | Recreated at full resolution from the real launcher icon (`android/.../mipmap-xxxhdpi/ic_launcher.png`, teal `#0f766e` background, white "EC" monogram) — the app had no existing web-facing icon file to reuse, only the Android mipmap set. |
| `feature-graphic.png` | 1024×500 | Built from the same icon + brand color. No store badges, no fabricated ratings. |
| `screenshots/1-triage-and-answer.png` | 1080×1920 | The five-field triage form filled with realistic figures, plus the resulting "The answer" panel — real engine output, not a mockup. |
| `screenshots/2-break-even.png` | 1080×1920 | The home-vs-facility break-even slider and crossover chart, expanded. |
| `screenshots/3-real-cost.png` | 1080×1920 | The "Make the cost more accurate" refine panel — shows the advertised-vs-real cost gap the app is built around surfacing. |

All three screenshots are real captures from the running app (`npm run dev`), not mockups — no
plan data is sent to a server by the application. These are web captures; replace them with
captures from the tested Android release before submission.

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
family members are sharing the cost — and gives a planning estimate: what care
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
offline in the installed app. Your entries, facility photos, and receipts are stored locally,
with no analytics or advertising. Autosave encrypts the planner form when a device key is
available; a closing-page save can use plaintext to preserve your last edit. Photos and receipts
are not separately encrypted.

OPTIONAL FAMILY SNAPSHOTS
Create an encrypted snapshot link for a family member and send the passphrase separately.
The snapshot is read-only, not live syncing, and excludes facility and receipt photos.
JSON exports and printed copies are not encrypted by the app.

Works as an installed app or straight from your browser. Estimates are for planning and are
not medical, legal, or individualized financial advice. Confirm actual provider quotes and
benefit eligibility before making decisions.
```
(2554 characters, under 4,000)

## Content rating questionnaire (IARC) — draft notes

Confirm the questions as shown in Play Console. Built-in content contains no violence,
sexual content, profanity, gambling, or substance-use depictions. There are no ads, location
sharing, public feeds, or in-app purchases. An upfront download price is separate from in-app
purchases. Do not assume or promise a particular rating before completing IARC.

**Optional user sharing exists.** Families can send an encrypted plan snapshot to a chosen
recipient. Photos and receipts remain outside that snapshot. Evaluate any user-interaction
or user-generated-content questions against their exact definitions; the previous blanket
"no sharing or multi-user surface" answer was inaccurate.

## Data safety form — draft notes

The installed app has no backend, analytics, ad SDK, crash-reporting SDK, or INTERNET permission.
Calculations and persistence run locally. The actual form key is
`elder-care-planner:state:v1`; photos, receipts, and the device key are held in IndexedDB.
Normal form autosave uses AES-GCM; key-unavailable and closing-page saves can be plaintext.
Photos and receipts are not separately encrypted.

The developer does not receive these entries through the app. Proposed declaration:
**no developer collection or sharing through the application**. Confirm Google's definitions
and user-initiated-sharing exceptions against the current Console questionnaire before saving.
Do not characterize local financial/health entries as collected merely because they exist
on-device, and do not claim no information can ever leave the device: users can send links,
export JSON, print, or open external resource links. Support email is a separate communication.

Android backup XML excludes `root/app_webview/` for legacy backup, cloud backup, and device
transfer. Directory-resolution regression tests pass; an actual backup/restore exercise on
Android remains pending. The manifest references both XML files. External resource links are
handed to the system browser, whose network behavior has its own privacy policy.

## Other declarations to complete

- Financial features: inspect the cost planning, family contributions, and benefits guidance
  against the current form. Finance store category alone does not answer every declaration.
- Health features: inspect whether care-planning content and the weekly coverage grid fall under
  the current care coordination/management definitions. Do not select "none" without checking.
- App access: no account or login required; review the actual form before submission.
- Target audience: intended for adult family caregivers; Jared must confirm the intended ages.
- Privacy policy: the local updated source is `public/privacy.html`. Its intended hosted URL is
  `https://jf1shh.github.io/agentic-app-harness/elder-care-planner/privacy.html`; deployment and
  the live policy matching this revision must be verified before submission.
- Support email: `xjaredfisher@gmail.com`, as already recorded in the app's policy/package metadata.
