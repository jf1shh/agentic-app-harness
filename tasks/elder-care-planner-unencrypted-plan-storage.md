# Work Order: elder-care-planner writes the plan to localStorage unencrypted

> **Hand-authored, not harness-generated.** This finding is a `manual-review`
> item per `.agents/AGENTS.md` §11 — it is deliberately *not* a sensed
> guardrail, because "does this write path handle data as sensitively as
> another path in the same app handles the same data" is a cross-file,
> judgement-dependent property no regex over a line can see. Any AI coding
> agent may still claim it. Follow `.agents/AGENTS.md` while you work.
> Do **not** silently implement a fix — this needs a spec decision first
> (see Definition of done, step 2).

- **Finding ID:** `elder-care-planner-unencrypted-plan-storage`
- **App:** `elder-care-planner`
- **Type:** `manual-review`
- **Severity:** `medium`
- **Acceptance gate:** `manual-review`
- **Spec:** [`specs/elder-care-planner-spec.md`](../specs/elder-care-planner-spec.md)

## Context

`savePlan()` in `src/lib/storage.ts:55` writes the full plan — income, savings,
and monthly care costs — to `localStorage` as plain `JSON.stringify(plan)` on
every autosave:

```ts
export function savePlan(storage: StorageLike, plan: Plan): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(plan));
}
```

The same app already has an encrypted-at-rest treatment for this exact data,
on a different path: `src/lib/share.ts` encrypts a plan with AES-GCM-256
under a PBKDF2-derived key (100,000 iterations, `src/lib/share.ts:24`) before
it ever leaves the device for the family-sharing link feature. The far more
common code path — routine local persistence, hit on every keystroke via the
debounced autosave — doesn't use the same treatment at all. This is a real,
open gap, confirmed present as of a full security audit on 2026-08-14 (see
PR #214 and the linked audit report:
https://claude.ai/code/artifact/2a5b5e3d-9503-4fef-bc39-86c33c292940), and it
is documented, not new, in `.agents/AGENTS.md` §11:

> Encrypting local persistence needs a key-management decision (a
> device-bound key with no user friction, versus a passphrase gate like
> `legal-financial-rag`'s) that changes the app's UX and belongs in a spec
> update and a proposed work order, not a silent implementation choice.

## Evidence

- `projects/elder-care-planner/src/lib/storage.ts:55` — `savePlan()`, plaintext write
- `projects/elder-care-planner/src/lib/share.ts:24` — the encrypted-at-rest precedent that already exists in this app for the same data
- `.agents/AGENTS.md` §11 (Security & Privacy Baseline) — the bullet that first named this gap

## Definition of done

This is a **decide-then-build** task, not a straight fix — do not jump to an
implementation before step 2 is resolved and recorded.

1. Read `.agents/AGENTS.md` (§1, §11) and `specs/elder-care-planner-spec.md` before changing code.
2. **Pick a key-management model and record the decision in the spec** before writing any implementation. Two options the existing codebase already demonstrates the shape of:
   - A device-bound key (e.g. derived via WebCrypto and held in IndexedDB, no passphrase prompt, no user friction) — protects against another app or process reading raw `localStorage`, but not against someone with access to the same browser profile.
   - A passphrase gate, following `legal-financial-rag`'s `VaultLockModal` pattern (PBKDF2 + AES-GCM, unlocked once per session) — stronger, but adds a UX step this app has never asked for before and changes the "no accounts, no friction" character the spec currently promises.
   Either choice is legitimate; an unrecorded choice is not. If the request contradicts the spec's current promises, flag that per `.agents/AGENTS.md` §1 rather than silently diverging.
3. Implement the chosen model in `projects/elder-care-planner`, keeping `savePlan`/`loadPlan`'s existing `StorageLike`-based testability (`src/lib/storage.ts`) and validation-at-the-boundary discipline (`parsePlan`/`parsePlanJson`) intact — encryption wraps the existing contract, it doesn't replace it.
4. Cover the new behavior with unit tests (TDD red-first, per `.agents/AGENTS.md` §5): a plan written to storage should not be recoverable as plaintext JSON without the key/passphrase, and a plan round-tripped through save→load should still equal the original after decryption.
5. Update `README.md` and `HANDOFF.md` for `elder-care-planner` to describe the new persistence model, and remove/update the `.agents/AGENTS.md` §11 bullet that names this as an open gap once it's closed.
6. Re-run `node scripts/emit-tasks.mjs --prune` to retire this work order (it has no sensed finding to key off, so also delete `tasks/elder-care-planner-unencrypted-plan-storage.md` by hand once merged).
7. Open a PR — never self-merge; a human reviews.

_If fixing this teaches a reusable rule, add it to `.agents/AGENTS.md` and,
if it is mechanically detectable, add a guardrail to `scripts/harness-status.mjs`
so the harness catches it automatically next time. Given the judgement this
finding already required, the resulting lesson will likely stay prose-only,
same as the §11 bullet it grew out of._
