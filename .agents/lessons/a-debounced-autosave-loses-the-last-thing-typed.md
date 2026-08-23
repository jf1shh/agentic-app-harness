# A Debounced Autosave Loses the Last Thing Typed

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Debounced Autosave Loses the Last Thing Typed**: Debouncing writes is right — a burst of
  typing should be one write, not thirty — but a debounce alone silently drops whatever is still
  pending when the page goes away, which is precisely the moment a user expects their work to be
  kept. In `projects/elder-care-planner` a 300ms debounce meant an edit followed by a reload was
  never written, and the symptom was indistinguishable from persistence being broken outright.
  Pair every debounced write with a synchronous flush on `pagehide` **and** on
  `visibilitychange`→`hidden`; the first covers navigation and closing a tab, the second covers a
  phone being backgrounded, where `pagehide` is not dependable. Hold the pending value in a ref so
  the listener is registered once rather than re-subscribed on every keystroke. Two consequences
  worth knowing. (1) *Prove it by reloading in an E2E test*, not by asserting the store was called
  — the bug lives entirely in the gap between "we scheduled a write" and "the write happened".
  (2) *A correct flush will fight a test that seeds corrupt storage and reloads*, because the flush
  overwrites the corruption on the way out; seed such fixtures with `addInitScript` before the
  first navigation instead. Not tagged as a guardrail: whether a given `setTimeout` write has a
  matching lifecycle flush is a whole-component property, not a line a regex can see.
