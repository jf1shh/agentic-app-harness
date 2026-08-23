# A "Wait for the Save to Land" Helper Returns on ANY Save, So a Before/After Payload Measurement Must First Wait for the Entity That Makes the Baseline Meaningful

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A "Wait for the Save to Land" Helper Returns on ANY Save, So a Before/After Payload
  Measurement Must First Wait for the Entity That Makes the Baseline Meaningful**: Both
  `elder-care-planner` payload-size specs (`receipts.spec.ts` and `facilities.spec.ts`,
  guarding spec §11.14/§11.2.4's "the plan grows by an id, not an image" claim) snapshot the
  baseline right after `waitForEncryptedSave` — which returns on the *first* encrypted envelope
  in storage. Under 4–8 parallel workers that can be the page-load save, taken before the
  just-logged ledger entry (or just-added tour) has landed, so the measured delta then includes
  the whole entry on top of the receipt id: `235 > 200` bytes, on an app provably storing only
  the id (clean-run delta: 48 bytes). The failure reads as "the app leaked image bytes into the
  plan" and is actually the baseline racing the debounced write. Two rules. (1) *Wait for the
  entity, not the envelope* — poll the *decoded* state (`readStoredPlannerState`) until the
  entry/tour is present, then snapshot the baseline; the envelope's random IV proves a save
  landed, not which state it carries. (2) *A poll function that can throw is not a poll* —
  `readStoredPlannerState` throws when no envelope exists yet, and `expect.poll` propagates
  throws instead of retrying, so the first draft of this fix (poll without a catch) failed the
  very next full-suite run on the first evaluation; wrap it in a catch that returns a sentinel
  (`0`) and keep polling. Proven by hammering the fixed specs at `--workers=8` (3× receipts, all
  green) after the single-worker isolation pass; the full-suite re-run is what caught the
  no-catch draft. Not tagged as a guardrail: whether a given save carries the state a
  measurement depends on is a timing property, invisible to any line-level regex.
