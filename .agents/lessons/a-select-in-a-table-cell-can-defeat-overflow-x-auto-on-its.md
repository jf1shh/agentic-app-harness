# A `<select>` in a Table Cell Can Defeat `overflow-x: auto` on Its Own Wrapper

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A `<select>` in a Table Cell Can Defeat `overflow-x: auto` on Its Own Wrapper**: Every table in
  `elder-care-planner` sits inside a `.table-wrap { overflow-x: auto }` container specifically so a
  wide table scrolls within itself rather than the page (`.agents/AGENTS.md`'s own responsive
  discipline). The weekly care-coverage grid (spec §11.15) put a `<select>` — not plain text — in
  every cell, and the whole page started scrolling sideways at a narrow phone viewport, 163px worse
  than every other table on the same page using the identical wrapper. The cause: `select { width:
  100% }` is a global base rule, and in a table using the browser default auto layout, a
  `width: 100%` on a form control inside a cell is a *minimum*, not a cap — the browser will still
  grow the table past that 100% to fit the `<select>`'s intrinsic content width (its widest
  `<option>`, here a contributor's name), and an ancestor `overflow-x: auto` does not stop a
  descendant table from growing itself in the first place, it only stops the *already-grown* table
  from pushing the page. Plain-text table cells never hit this because text simply wraps or is
  clipped by the cell; a form control's minimum content width is enforced by the browser in a way
  ordinary content is not. The fix is `table-layout: fixed` on that specific table (scoped by class,
  not the global `table` rule, since other tables' content-driven column widths are intentional and
  correct) — fixed layout makes the specified widths authoritative, so `width: 100%` on the select
  is honoured exactly instead of treated as a floor. Diagnosed by binary-searching the DOM
  (`element.remove()` in `page.evaluate`, confirm `scrollWidth` drops) rather than reading CSS,
  because the failing assertion (`e2e/a11y.spec.ts`'s whole-page overflow check) was several
  components away from the actual cause and every individual `.table-wrap` measured as correctly
  containing its own content when inspected in isolation — the leak was in the *table's own* growth
  past its wrapper's constraint, not in the wrapper failing to constrain it. Not tagged as a
  guardrail: whether a given table cell holds a form control versus plain text is not visible to a
  line-level regex, and the fix lives in a CSS file nowhere near the component that triggers it.
