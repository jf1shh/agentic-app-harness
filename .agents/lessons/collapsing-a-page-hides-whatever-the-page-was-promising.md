# Collapsing a Page Hides Whatever the Page Was Promising

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Collapsing a Page Hides Whatever the Page Was Promising**: Turning a twelve-card scroll into
  disclosure sections is the right call for `projects/elder-care-planner`, and it silently
  demoted three separate guarantees on the way. (1) *A closed section says nothing*, so the
  Medicare correction — the most expensive misconception in the domain, deliberately placed on the
  results page rather than in a help article — went behind a click, and the E2E spec that guarded
  it still passed because `toContainText` does not assert visibility. The fix is a **status line**
  on every collapsed section, carrying the figure or the correction the reader came for, derived
  from engine output rather than recomputed beside it; and the two panels whose status lines carry
  editorial constraints must respect them — the facility shortlist counts communities and must not
  rank them, because §11.2 declines to name a best one on purpose. (2) *A collapsed `<details>`
  prints collapsed*, so the Family Meeting Summary would have reached the meeting as a heading. No
  stylesheet reliably reveals a closed `details` across browsers, so this is behaviour: open every
  printable section on `beforeprint` **and** synchronously around the in-app print button, then
  close only the ones you opened — printing must not rearrange the page someone was reading.
  (3) *An a11y audit of a collapsed page audits almost nothing*, because the controls are not in
  the accessibility tree; the axe sweep and the 200%-zoom overflow check both have to run against
  the expanded page or they quietly stop covering what they were written for. Two mechanical
  notes. `<details open={x}>` as a React prop is wrong on a page that re-renders per keystroke —
  it slams the section shut mid-typing; leave `open` out of props entirely and let the DOM hold
  it. And `locator('summary')` inside a section that contains its own nested `<details>` matches
  two elements, which surfaces as a strict-mode violation reading like a duplicated component.
  Not tagged as a guardrail: whether a given collapsed section has hidden something load-bearing
  is a judgement about what that panel was for, and the failing E2E assertion is usually in a
  different file from the component that collapsed.
