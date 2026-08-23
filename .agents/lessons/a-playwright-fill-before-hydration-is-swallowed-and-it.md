# A Playwright `fill()` Before Hydration Is Swallowed, and It Looks Like a Broken Control

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Playwright `fill()` Before Hydration Is Swallowed, and It Looks Like a Broken Control**: In a
  server-rendered React app (Next.js, Remix), the markup is interactive-looking long before React
  attaches its listeners. A `fill()` that lands in that window sets the DOM value, dispatches an
  input event nobody is listening for, and is then reverted by the first client render — leaving no
  error and no console warning. The symptom is maddeningly indirect: a *later* assertion fails,
  usually on a submit button that never enables, and the obvious reading is that the app is broken.
  Diagnosing it cost a full debug cycle on `projects/elder-care-planner`, where the first field
  filled after `goto` was the one silently lost while every subsequent field worked. Two rules.
  (1) *Wait for a signal that client effects have run* before the first interaction — this app sets
  `document.documentElement.dataset.textsize` from a `useEffect`, so `waitForFunction` on it proves
  hydration; any app-owned post-hydration marker will do, but `waitForLoadState('networkidle')` will
  not, because hydration is not a network event. (2) *Assert the value stuck* immediately after
  filling it (`expect(field).toHaveValue(x)`), so a swallowed fill fails at the line that caused it
  rather than three actions later. Tests that fill a single field often pass by luck and hide this;
  a multi-field form whose submit depends on all of them is where it surfaces. Not tagged as a
  guardrail: "is this the first interaction after a navigation, in a hydrating app" is a
  cross-statement property that a per-line regex cannot see.
