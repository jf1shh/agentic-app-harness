# Smart Recipe — Play Console listing kit

Same method as `projects/mood-diner/store-listing/`: assets built from the app's real brand color
and real UI, copy checked against what the app actually does, Q&A answers cross-checked against
`public/privacy.html`.

## Assets

| File | Spec | Notes |
|---|---|---|
| `icon-512.png` | 512×512 | Recreated at full resolution from the real launcher icon (rust/orange `#c2410c` background, white "SR" monogram) — no existing web-facing icon file to reuse (`public/` only had the default `create-next-app` placeholder SVGs). |
| `feature-graphic.png` | 1024×500 | Built from the same icon + brand color. No store badges, no fabricated ratings. |
| `screenshots/1-dashboard.png` | 1080×1920 | The dashboard's default state — a stocked pantry (basil, garlic, olive oil, parmesan, pine nuts) driving a real "Cook with what you have" recommendation. |
| `screenshots/2-inventory.png` | 1080×1920 | The fridge/pantry tracker, add-item form and current stock list. |
| `screenshots/3-recipes.png` | 1080×1920 | The saved recipe catalog, showing the inventory-overlap match line on a recipe that's cookable right now. |
| `screenshots/4-planner.png` | 1080×1920 | The meal planner, with a recipe scheduled against a real date. |

All four screenshots are real captures from the running app's default seed data, not mockups.

## Category
**Food & Drink.** Recipe management, pantry tracking, and meal planning are squarely in this
category — there's no better fit among Play's options.

## Short description (≤80 chars)
```
Cook from what's in your fridge: pantry tracking, recipe matching, meal planning
```
(80 chars — fits exactly at the limit)

## Full description (≤4000 chars)
```
Smart Recipe answers the question everyone asks standing in front of an open fridge: what can I
actually make with what I already have?

TRACK YOUR FRIDGE AND PANTRY
Log what's in your kitchen by name, category, and quantity — fridge, pantry, whatever you're
tracking — and keep it current as you use things up or restock.

GET MATCHED, NOT JUST LISTED
The recommendation engine scores your saved recipes against your current inventory and surfaces
the ones you can cook right now, ranked by how many ingredients you already have, then by how fast
they are to make.

SEARCH AND SAVE REAL RECIPES
Look up recipes from a public recipe database and save the ones you like — each one is normalized
into your own local recipe catalog, so it's yours to keep, edit, or reference offline afterward.

PLAN MEALS BY DAY
Assign your saved recipes to specific dates and meal types, so "what's for dinner" is answered
before you're standing in the kitchen trying to decide.

PRIVATE BY DESIGN
No account, no sign-in, no analytics, no ad tracking. Your inventory, saved recipes, and meal plan
all stay in local storage on your device. The only thing that ever reaches the network is the
search text you type when you look up a recipe — no inventory or meal-plan data goes with it.

Works as an installed app or straight from your browser.
```
(1,324 chars)

## Content rating questionnaire (IARC) — answers to select
| Question | Answer | Why |
|---|---|---|
| Violence | None | — |
| Sexual content | None | — |
| Profanity / crude humor | None | — |
| **References to alcohol** | **Consider Yes** | The two bundled sample recipes don't reference alcohol, but recipe search pulls live from TheMealDB's full public catalog (see below) — dishes like coq au vin, beer-battered fish, or a wine reduction are a normal, foreseeable search result, not bundled content the app curated |
| Controlled substances (drugs, tobacco) | None | — |
| Gambling / simulated gambling | None | — |
| User-generated content shared with other users | No | Inventory, saved recipes, and meal plan are local-only — no sharing or multi-user surface |
| Shares user's location | No | No location permission requested |
| Digital purchases | No | No paywall, plan tier, or purchase flow anywhere in the app |

The alcohol question is the one judgment call here, and it's the same shape as mood-diner's: the
app's own bundled data is clean, but a live, uncurated third-party feed (TheMealDB's full recipe
catalog, not just the two seeded recipes) can surface content the app didn't author. Better to
disclose defensively than have the rating challenged later over a search result.

## Data safety form — answers to select
**"No data collected"** across every category. `public/privacy.html` documents this precisely: no
accounts, no analytics or ad SDK, and the only outbound request is the search text you type,
triggered only when you run a recipe search — no inventory, saved-recipe, or meal-plan data
travels with it. `smart_recipe_inventory`, `smart_recipe_recipes`, and `smart_recipe_meal_plan`
all stay in local storage on-device.

Worth naming for the reviewer, same as the content-rating caveat above: the recipe *search*
endpoint (`www.themealdb.com`) is a live third-party API outside this app's control, so while the
app itself sends nothing but search text, what comes back is not curated by this app's own team.
