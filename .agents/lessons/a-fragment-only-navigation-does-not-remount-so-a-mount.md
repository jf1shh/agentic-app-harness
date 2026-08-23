# A Fragment-Only Navigation Does Not Remount, So a Mount Effect Alone Misses It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Fragment-Only Navigation Does Not Remount, So a Mount Effect Alone Misses It**: The shared
  family link (spec §11.6) checks `location.hash` in a `useEffect(() => {...}, [])` to detect a
  `#share=...` link, following the same "read nothing from storage during render" pattern the
  existing plan-restore effect already uses. It worked for a fresh page load and failed silently
  for the case that matters most: a recipient who already has the app open in a tab and then opens
  or pastes a share link. Per the URL spec, a navigation that differs only in its fragment is a
  same-document navigation in every browser — no reload, no remount — so a mount-only effect simply
  never runs again to see the new hash. The symptom in Playwright was a `page.goto('#share=...')`
  that silently never rendered the passphrase gate, timing out on a locator that was correctly
  written but for a screen that never appeared; nothing in the component itself looked broken. The
  fix is to also listen for `hashchange` and re-run the same check, which is real behavior a
  fragment-based deep link needs, not a test-only workaround — the identical case happens in
  production the moment someone shares a link with a family member who already has the site open.
  Any future feature that reads `location.hash`, a query string, or anything else the browser can
  change without a full navigation needs the same two-part check: once on mount, and again on the
  event that fires when only that part of the URL changes.
