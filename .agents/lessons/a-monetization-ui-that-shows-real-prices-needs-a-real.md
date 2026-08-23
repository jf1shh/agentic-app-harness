# A Monetization UI That Shows Real Prices Needs a Real Purchase Behind It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Monetization UI That Shows Real Prices Needs a Real Purchase Behind It**: A full Play Store
  readiness audit across all five native apps found `mood-diner`'s `ProPaywallModal.tsx` presenting
  specific currency amounts ("$4.99/mo", "$39.99/yr"), a "Start 7-Day Free Trial" call to action,
  and "Cancel anytime with 1-click in Google Play / Web Settings" — while `upgradeToPro()` in
  `MonetizationContext.tsx` does nothing but flip a `localStorage` flag. Tapping the button grants
  Pro instantly, charges nothing, and starts no trial; the "Cancel... in Google Play" line
  references a Play Billing subscription that was never created. This is exactly the shape Play's
  Monetization and Payments policy exists to catch: a purchase-shaped UI that does not do what it
  visually claims is a rejection/removal risk independent of whether the underlying feature-gating
  logic (free daily credits, Pro-only unlocks) is itself fine — and it was, per §11 of this app's
  spec, which only requires the *gate* to be well-behaved (opt-in, non-interrupting), not that the
  UI behind it be truthful about billing. The store-listing kit's own README had already flagged
  this exact defect and explicitly declined to fix it, reasoning it was "a UX mismatch... I didn't
  change this since it wasn't part of what was asked" — correct scope discipline for a listing-copy
  pass, but the flag sat unresolved through a subsequent full audit pass too. **Resolved**: the
  product decision landed on rewriting the copy rather than wiring up real Play Billing — the
  billing-cycle selector (the whole Annual/Monthly-with-prices toggle) is gone, the CTA is now
  "Unlock Pro Features" with no price or trial period attached, and the footer states plainly
  what actually happens ("No payment, no account — this preview switches your device to the Pro
  feature set at no cost") instead of claiming a cancellable Google Play subscription. Verifying
  this by reading the component alone would have been incomplete: `ProPaywallModal` was fully
  built and wired to `MonetizationContext` but **never mounted anywhere** — `App.tsx` rendered
  `BookingsModal`, `WeatherWidgetModal`, and `AddRealRestaurantModal` but not this one, so
  `openPaywall()` silently did nothing and no user could ever have seen the deceptive copy in the
  first place. A Playwright smoke check against the running dev server (click `#upgrade-pro-btn`,
  wait for `.modal-content`) timed out until `<ProPaywallModal />` was added to `App.tsx`'s render
  tree alongside its sibling modals — the same "assert on the rendered page, not the source" habit
  the other lessons in this section already insist on. Not tagged as a guardrail: distinguishing a
  truthful mock-data label from a deceptive one is a judgment about what copy claims, not a
  line-level pattern, and "is this component actually mounted" requires resolving an import graph
  a regex over one file cannot see.
