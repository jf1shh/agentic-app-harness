# A Drag-and-Drop Library's Auto-Scroll Invalidates Coordinates Measured Before the Drag Started

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Drag-and-Drop Library's Auto-Scroll Invalidates Coordinates Measured Before the Drag
  Started**: `travel-packing-app`'s outfit-editor E2E spec (`e2e/outfit-editor.spec.ts`) measures a
  drop target's `boundingBox()` once, before the drag sequence starts, and replays those
  coordinates through a manual `mouse.move/down/move/up` sequence — dnd-kit's `DndContext` listens
  for pointer events, not the native HTML5 drag events Playwright's own `dragTo()` fires, so the
  manual sequence is required in the first place. That test passed in isolation and then started
  landing drops on "Day 3" instead of "Day 1" the moment an unrelated sibling PR (a new donut
  chart, merged via this session's independent-branch pattern) pushed the page's height past the
  test viewport: dnd-kit's built-in auto-scroll — a real, desirable feature, not a bug — engaged
  mid-drag once the cursor neared the bottom of a scrollable viewport, and the resulting scroll
  offset made the pre-measured `targetBox` describe a position the drop slot no longer occupied.
  Diagnosed with a temporary debug spec logging `targetBox` before and after the drag sequence
  (showed a -483px shift) and `document.elementFromPoint` at the drop coordinate (returned an
  unrelated `H2` heading, not the drop slot) — the failure otherwise looked identical to a broken
  drop handler. The fix that holds up under future, unrelated page growth is not "re-measure right
  before the drop" — that still races the auto-scroll's own animation timing — but sizing the test
  viewport tall enough to contain the *whole* page (`setViewportSize({ height: 5000 })`, safely
  above the ~4207px the page reached once every sibling phase had merged) so nothing is scrollable
  and auto-scroll never has a reason to engage. Not tagged as a guardrail: whether a given page's
  height will later outgrow a fixed test viewport is a property of future, unrelated changes to
  that same page, not something a line-level regex can see coming.
