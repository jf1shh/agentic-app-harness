# Format a Total and Its Parts at the Same Precision

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Format a Total and Its Parts at the Same Precision**: An engine that splits an amount to the exact
  cent still looks broken if the UI renders the parts and the total at different precision. Rounding
  three shares of $1,233.33 to whole dollars displays $1,233 × 3 against a total of $3,700 — arithmetic
  the reader can do in their head, and failing it costs more credibility than the rounding saved. Where
  a total and its components are both on screen, format them identically, and assert it in an E2E test
  by parsing the *rendered* strings rather than the engine output: the unit tests passed throughout
  this bug, because the defect was never in the engine. Not tagged as a guardrail — deciding which
  figures constitute a total-and-parts relationship needs human judgement, and a regex over a line
  cannot see that two `formatX` calls in different components feed the same table.
