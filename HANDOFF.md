# HANDOFF — Full audit: bugs, Play Store readiness, security, privacy, robustness

Branch: `claude/full-app-audit-q9266h`

## Why

A full-repo audit across all six apps for bugs, Play Store readiness, security, privacy,
robustness and functionality. The harness's own sense loop was already clean
(`harness-status.mjs --strict`: 0 findings), so everything below is a finding the existing
deterministic gates cannot see — which is the point of doing the pass by hand.

## What was already fine (checked, not assumed)

Worth recording so the next audit doesn't re-litigate it:

- **Android release plumbing** — all five native apps resolve signing credentials from env then a
  git-ignored `keystore.properties`, stay *unsigned* rather than failing when absent, and take
  `versionCode` from `ANDROID_VERSION_CODE`. `minSdk 24 / target+compile 36`.
- **Backup and data extraction** — every native app excludes `app_webview/` from both
  `<cloud-backup>` and `<device-transfer>`, so the WebView's `localStorage`/IndexedDB never
  reaches a Google account. This is what makes each privacy policy's on-device claim true.
- **Permissions match reality** — `elder-care-planner` declares *no* `INTERNET` permission (it
  makes zero network calls, verified by grep); `travel-packing-app`'s `CAMERA` is really used by
  `SuitcaseScanner`/`measurement`. No app over-declares.
- **Network claims match code** — `fetch` appears only in `smart-recipe-app` (TheMealDB) and
  `travel-packing-app` (Nominatim / Open-Meteo / currency / advisory). The other four make none.
- **Store listing assets** — 512×512 icon, 1024×500 feature graphic, screenshots and a privacy
  policy for all five. `mood-diner` deliberately reuses `public/icon-512.png` instead of
  duplicating it into `store-listing/`, which its README documents; that is not a gap.
- **No XSS surface** — zero `dangerouslySetInnerHTML`, zero `innerHTML` assignments, no `eval` in
  app code. Every data-driven `href` traces to a hardcoded constant, a blob URL, or (in
  `mood-diner`) a `websiteUrl` already `.refine()`d to `http(s):`.
- **`npm audit`: 10 advisories, all dev/build-time transitives** (`@capacitor/cli` → `xcode` →
  `uuid`; `promptfoo` → `ai` → `undici`; `next` → `postcss` → `nanoid`). None reach a shipped
  bundle. This is what `test-app.mjs` reports as its one advisory WARN per app.

## What changed

### 1. Error boundaries — coverage closed across all six apps (`.agents/AGENTS.md` §12)

§12 named this as an open backlog: only `travel-packing-app` had a boundary; the other five had
none, so any render throw unmounted the tree to a blank page — on an installed Android build,
indistinguishable from a broken install.

- Next.js: new `src/app/error.tsx` in `elder-care-planner` and `smart-recipe-app`.
- Vite: new `src/components/ErrorBoundary.tsx` in `mood-diner`, `portfolio-hub` and
  `legal-financial-rag`, wired in `src/main.tsx` around the root `<App />`.
- In `mood-diner` the boundary wraps **outside** `MonetizationProvider` on purpose — that provider
  reads `localStorage` while building initial state, so a boundary nested inside it would miss the
  crash most likely to happen at startup.
- The fallback never renders `error.message` or a component stack: either can quote the user data
  the app was holding when it crashed. Details go to `console.error` only.

### 2. `mood-diner` monetization storage boundary

`MonetizationContext.tsx` read `localStorage.getItem(KEY) as PlanTier` and `parseInt(saved, 10)`
with no guard, while the same app's `storage.ts` validated everything. Three defects:

1. `localStorage` **throws** (not returns null) when a browser denies storage. That read happens at
   the root of the tree → blank app instead of degrading to the free tier.
2. Unvalidated `as` cast — a hand-edited `'gold'` propagates as a `PlanTier`.
3. `parseInt('abc')` → `NaN`, which fails every `> 0` check *and* persists back as the string
   `"NaN"`, locking a free user out of their allowance permanently across reloads.

New `src/lib/monetization/monetizationStorage.ts` + 17 unit tests.

### 3. `travel-packing-app` checklist parse

`JSON.parse('null')` succeeds and returns `null`, so the existing `try`/`catch` never fired and
`Object.values(null)` threw during render. Now goes through `parseStoredCheckedItems`, which
validates the parsed *result*. The shared `isCheckedItemsMap` guard is also what
`isChecklistSyncMessage` uses, so the localStorage path and the BroadcastChannel path cannot drift.

### 4. `travel-packing-app` E2E — a vacuous reload synchronization (pre-existing)

`e2e/quick-wins.spec.ts:94` waited for `#dest === 'Hawaii'` as proof the delete-and-reload had
finished — but that test never changes `#dest`, so `'Hawaii'` is already true *before* the reload.
The wait was satisfied by the old document and `page.evaluate` then raced the navigation
(`Execution context was destroyed`). It now stamps the current document and waits for the stamp to
disappear, which is the only signal here that proves a new document exists.

This failed twice under `test-app.mjs`'s single-worker full run and passed when the spec was run
alone — a reminder that "passes in isolation" is not evidence about a suite.

## Verification

`node scripts/test-app.mjs <App>` run for **all six** apps in this session — all report
`ALL HARNESS CHECKS PASSED` (each with the same one advisory `WARN` for the dev-only npm
advisories above). Repo gates: `harness-status.mjs --gate` (0 blocking), `harness-learn.mjs`,
`check-doc-claims.mjs --gate`, `check-loop-stats.mjs`, `check-peer-consistency.mjs`,
`check-secrets.mjs --tree`, `harness-status.test.mjs` — all pass.

Mutation proofs (§9.4), each run and observed:
- Restoring the original unguarded monetization reads → **9 of 17** cases red.
- `getDerivedStateFromError` returning `{ hasError: false }` → **4 of 5** boundary cases red.
- Leaking `error.message` into the fallback DOM → exactly the privacy case red, nothing else.

## Open / next steps

- **A sensor for error-boundary coverage is now justified and unbuilt.** §12's precondition ("gate
  a check once it describes a regression, not a backlog") is met now that all six apps carry a
  boundary — a sensor added today would report zero. It was left unbuilt because it wasn't what
  this audit was asked for. Add it **non-blocking** first, per §8.
- **PBKDF2 is at 100,000 iterations** in both `elder-care-planner/src/lib/share.ts` and
  `legal-financial-rag/src/lib/security/encryption.ts`. That is not a defect — it was a defensible
  figure — but current OWASP guidance for PBKDF2-SHA256 is considerably higher. Raising it is a
  judgement call about the passphrase-unlock latency budget on a low-end phone, and it changes the
  cost of unlocking existing vaults, so it wants a deliberate decision rather than a silent bump.
- **The Next.js `error.tsx` boundaries are verified by build + framework contract, not by a
  forced-crash test.** The three Vite boundaries have real behavioural unit tests
  (`ErrorBoundary.test.tsx`); the two Next.js ones do not, because those apps have no
  `@testing-library/react` and forcing a client render crash from Playwright is fragile. If that
  coverage matters, the honest route is a dedicated throwing route behind a test-only flag.
- **A containment override is needed in the PR body** for `.agents/AGENTS.md` (see the previous
  handoff's note: a single-segment root path like `CLAUDE.md` can *only* be acknowledged with an
  explicit `[containment-override: …]` marker, prose naming is not enough).
