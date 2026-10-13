# Threat model

## What this project does and where untrusted input enters
An npm-workspace monorepo of six client-side web apps (`projects/*`) plus the Node scripts and CI
workflows that govern how AI coding agents change them (`scripts/`, `.github/workflows/`, `.agents/`).
The apps are static builds (Vite or Next.js static export) deployed to GitHub Pages and wrapped as
Android apps with Capacitor. There is no project-owned server or database: state lives in the browser
(localStorage / IndexedDB / memory).

- `elder-care-planner` (Next.js): care plans; shareable links (`src/lib/share.ts`, read from the URL
  in `src/app/page.tsx`) and passphrase-based plan encryption with WebCrypto (`src/lib/planEncryption.ts`).
- `travel-packing-app` (Next.js): packing lists; share links compressed with lz-string
  (`src/utils/share.ts`), calls to public APIs (Open-Meteo geocoding/forecast in
  `src/services/weatherApi.ts`, `currency.ts`, `advisory.ts`), in-browser background removal
  (onnxruntime-web), three.js suitcase view.
- `legal-financial-rag` ("LexiVault", Vite/React): session-only client-side retrieval over documents the
  user pastes or uploads; PII masking, role-based "privilege" filters (demo state, not real identity),
  a SHA-256 chained audit ledger, and a session passphrase (`src/lib/security/encryption.ts`) that
  gates the view but does not encrypt the corpus (documented in its README).
- `smart-recipe-app` (Next.js): recipe search (`src/lib/mealSearch.ts`) over a bundled corpus.
- `mood-diner` (Vite/React): restaurant suggestions; bookings are simulated.
- `portfolio-hub` (Vite/React): static portfolio page with bundled data.

Untrusted input: URL parameters/fragments (share links), uploaded or pasted documents and images,
responses from third-party public APIs, and data previously stored in localStorage/IndexedDB (which
may be stale, corrupted or crafted). For the scripts, untrusted input is pull-request content
(diffs, file names, commit messages) processed by `scripts/check-*.mjs` in CI.

## Components that matter most / least
Most important:
- Share-link decoding in `elder-care-planner` and `travel-packing-app`: XSS or script execution from a
  crafted link, prototype pollution, unbounded decompression, or schema-validation (zod) bypass.
- Any rendering of untrusted text as HTML.
- `planEncryption.ts` and LexiVault's `encryption.ts` / audit ledger: misuse of WebCrypto (salt/IV
  reuse, weak KDF parameters, comparison flaws) relative to what each README claims.
- LexiVault PII masking and privilege filters, only where they fail at what the code claims to enforce.
- CI and scripts: command injection from PR-controlled data in `.github/workflows/*.yml` or
  `scripts/*.mjs`, secrets exposure in workflows (`scripts/check-secrets.mjs` is the guard).

Less important / out of scope:
- `projects/*/android/` generated Capacitor projects, `store-listing/`, `public/` assets.
- `.agents/`, `.claude/`, `.cursor/`, `docs/`, `specs/`, `stages/`, `tasks/`: agent instructions and
  documentation, not executed by the apps.
- Stryker mutation configs, Playwright E2E specs, test fixtures.
- Availability or correctness of third-party APIs.

## How to exercise it
- `npm ci` at the root installs everything (done in the image).
- Unit tests: `cd projects/<app> && npx vitest run`. Harness self-tests: `node --test scripts/*.test.mjs`.
- Per-app gate used by CI: `node scripts/test-app.mjs <app>` (also runs lint, type check and Playwright
  E2E, which needs browsers and is not available offline in the image).
- Built output is in each app's `dist/` (Vite apps) or `.next/` (Next.js apps) after `npm run build`; the image builds every app.

## How you rate severity
These are client-only demos holding the user's own data, so impact is bounded by the browser origin.
- High: XSS or script execution triggered by opening a crafted share link or document; command
  injection or secret exposure in CI reachable from a fork pull request.
- Medium: a crypto weakness that defeats the stated protection of `planEncryption.ts` (e.g. recovering a
  plan without the passphrase); a share link that corrupts or overwrites a victim's stored data;
  PII masking bypass for a pattern the code claims to detect.
- Low: denial of service in the user's own tab (large input, decompression), data-validation gaps with no
  security impact, missing hardening headers on GitHub Pages.

## Anything to leave alone
- Documented non-goals: LexiVault is not a persistent encrypted vault, its roles are not real
  authorization, the audit ledger is not a signature, and MoodDiner bookings are simulated.
- Dependency CVEs without a reachable path in these apps.
- Please include a minimal reproduction (a crafted share link or a Vitest case) and a patch with a test.
