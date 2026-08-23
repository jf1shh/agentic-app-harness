# `JSON.parse('null')` Succeeds, So a `try`/`catch` Around the Parse Is Not a Validation

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **`JSON.parse('null')` Succeeds, So a `try`/`catch` Around the Parse Is Not a Validation**:
  `travel-packing-app`'s packing checklist restored its checked-items map with `saved ?
  JSON.parse(saved) : {}` inside a `try`/`catch`, which looks like a guarded read and is not one.
  The string `"null"` is *valid JSON*: it parses without throwing, the catch never fires, and
  `checkedItems` becomes `null` — then `Object.values(checkedItems)` throws during render, several
  lines and one component away from the read that caused it. The same hole passes an array, a bare
  number, and an object whose values aren't booleans. **Validate the parsed result, not just the
  act of parsing**; a `catch` only covers syntactically invalid JSON, which is the *easier* half of
  the problem. What made the gap conspicuous once found: the same file already validated the *other*
  untrusted source of the identical shape — `isChecklistSyncMessage`, guarding messages arriving over
  `BroadcastChannel` from another tab — so the app was strict about a message from a sibling tab and
  credulous about its own `localStorage`. Both now resolve through one exported `isCheckedItemsMap`,
  per §6's *one definition, consumed twice* rule, so the two paths cannot drift into disagreeing
  about what a valid map is. General shape worth carrying: when a value can arrive from two
  untrusted sources, check that **both** go through the guard, and be suspicious of the one that
  looks too routine to need it. Not tagged as a guardrail: "was the result of this parse validated"
  needs the data flow from the parse to its first use, which a per-line regex cannot follow.
