# A Contract That Exists But Isn't Wired Is Not a Contract

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Contract That Exists But Isn't Wired Is Not a Contract**: A full security audit found
  `mood-diner`'s `src/App.tsx` reading `mood_diner_custom_restaurants` and `mood_diner_reservations`
  from `localStorage` with a bare `JSON.parse` and no schema check — the one boundary in the repo
  that skipped §1's "validate untrusted input at the boundary" rule, while every sibling app
  (`smart-recipe-app`'s `parseStored()`, `elder-care-planner`'s `parsePlan()`) already did it
  correctly. The app's own `src/lib/schemas.ts` had a `RestaurantSchema` that looked like it existed
  for exactly this purpose — but it was imported by nothing except its own test file, and had
  quietly drifted out of sync with the real `Restaurant` shape while sitting unused: it was missing
  four fields the real app writes (`hasFireplace`, `heroImage`, `priceRange`,
  `isRealWorldVerified`) and still declared three fictional ones from an earlier data model
  (`rooftop`, `fireplace`, `hasHeaters`) that nothing produces. Wiring the schema in naively — without
  first checking it against the real shape — would have silently stripped a restaurant's image and
  price badge on every load, since Zod drops unknown keys by default rather than erroring on them.
  Two consequences. (1) *A schema's existence is not evidence it's enforced* — grep for where a
  `Schema.parse`/`safeParse` call site actually sits, not just whether the `z.object()` exists,
  before trusting a "contract-first" claim about a boundary. (2) *The concrete exploit this gap
  admitted*: `websiteUrl` is rendered directly as an `<a href>` in `RestaurantCard`/`RestaurantModal`,
  so an untyped `z.string()` field on that boundary would have let a hand-edited or corrupted
  localStorage payload carry a `javascript:` URI straight into it — closed with a `.refine()`
  requiring the parsed value's `URL.protocol` to be `http:`/`https:`, proven by three rejection
  cases (`javascript:`, `data:`, and a non-URL string) and a mutation test (temporarily replacing the
  per-entry `safeParse` filter with a passthrough cast made the malformed/tampered-row tests fail as
  expected, then the fix was restored). Not tagged as a guardrail: "does an exported Zod schema
  actually gate the boundary it was written for" requires resolving an import graph and comparing a
  schema's fields against a separately hand-written interface — neither is a line-level pattern.
