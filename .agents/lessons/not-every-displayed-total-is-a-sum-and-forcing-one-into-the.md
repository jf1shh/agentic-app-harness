# Not Every Displayed Total Is a Sum, and Forcing One Into the Sum Check Breaks Both

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Not Every Displayed Total Is a Sum, and Forcing One Into the Sum Check Breaks Both**: The
  §6.10 arithmetic-integrity rule — displayed parts must add to the displayed total, in cents —
  is right for every derivation in `explain/` that states a sum, and wrong for one that states a
  **weighted mean**. The facility score's parts add to a *points total* which is then divided by
  the total weight, so a literal reading of "the parts sum to the composite" is false. The
  approved spec said exactly that, and implementing it faithfully would have meant either a test
  asserting something untrue or dressing 1-to-5 scores up as `valueCents` so `isBalanced` had
  something to check — the second is worse, because it would make a currency-formatted "$19.00"
  appear where a score belongs and quietly satisfy the invariant while meaning nothing. The
  resolution is to **correct the criterion in the spec, in writing, before building against it**,
  and to follow the existing non-money precedent (`sensitivity` uses `reference` steps with
  `valueText` and a `valueText` result, so `hasArithmetic()` is false and the cents invariant
  holds vacuously *and* correctly). The real check is then stated in the form the figure actually
  takes: products sum to the stated points total, and that total over the stated weight equals the
  displayed score — asserted on the engine in the unit tests and on the **rendered strings** in
  the E2E spec, as the total-and-parts lesson above already requires. Not tagged as a guardrail:
  deciding whether a given figure is a sum or a quotient is exactly the judgement no regex has.
