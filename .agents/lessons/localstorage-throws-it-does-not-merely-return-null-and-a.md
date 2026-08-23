# `localStorage` Throws — It Does Not Merely Return Null — and a Root Provider Is the Worst Place to Learn That

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **`localStorage` Throws — It Does Not Merely Return Null — and a Root Provider Is the Worst
  Place to Learn That**: `mood-diner`'s own `src/lib/storage.ts` already wrapped every `getItem` in
  a `try`/`catch` and validated the result through Zod, exactly as §1 requires. Its
  `MonetizationContext.tsx`, in the same app, did neither: `localStorage.getItem(KEY) as PlanTier`
  and `parseInt(saved, 10)`, both bare. The same shape as §11's *Contract That Exists But Isn't
  Wired* — one hardened path, one unhardened path, same app, same data class — and it had three
  separate failure modes stacked on it. (1) *Access throws when the browser denies storage* (a
  private window, site data blocked, an Android WebView with DOM storage off). Not "returns null" —
  a `SecurityError`. This read happens while the provider builds its initial state at the **root of
  the tree**, so the throw is not caught by anything and the entire app renders as a blank page,
  the exact failure §12's boundaries exist to stop. A hardened storage module three files away does
  not help if the crashing read isn't going through it. (2) *An unvalidated `as` cast is a lie about
  the type*, and a hand-edited `'gold'` propagates as a `PlanTier` everywhere downstream. (3) *A
  corrupt count poisons itself permanently*: `parseInt('abc')` is `NaN`, `NaN > 0` is false so the
  user is locked out of the free allowance, and — because the provider writes state back on change —
  `NaN.toString()` persists `"NaN"`, so the lockout **survives every future reload**. Three rules.
  *Guard the access, not just the parse.* *A corrupt count must fail toward the generous side* —
  resetting to the full allowance hands a free user one extra day, resetting to zero silently
  withholds what the app promised, and only one of those is recoverable by the user. *Don't reach
  for `z.coerce` on a stored number*: it turns `null` and `''` into `0`, converting "nothing stored"
  into "nothing left", which is the lockout wearing a Zod schema. Verified by mutation — restoring
  the original unguarded reads turns 9 of the 17 cases in `monetizationStorage.test.ts` red,
  including both the storage-denied and the persisted-`NaN` cases. Not tagged as a guardrail:
  whether a given `getItem` sits on a path that can crash the root of the tree is a cross-file
  property, and the hardened sibling module is what makes the gap invisible to a line-level read.
