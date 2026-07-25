# Agentic App Harness - AI Agent Handoff Document

## 1. Workspace & Architecture Overview
- **Repository:** Agentic App Harness (`jf1shh/agentic-app-harness`)
- **Live GitHub Pages Showcase:** `https://jf1shh.github.io/agentic-app-harness/`
- **Live Applications Deployed:**
  - `MoodDiner`: `https://jf1shh.github.io/agentic-app-harness/mood-diner/`
  - `Travel Packing App`: `https://jf1shh.github.io/agentic-app-harness/travel-packing-app/`
  - `Smart Recipe Manager`: `https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/`
  - `LexiVault Financial RAG`: `https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/`
- **What this repo is:** a spec-driven development (SDD) harness — specs, scripts,
  and CI gates that keep AI-assisted app development rigorous and drift-free. The
  quality bar (Zod contracts, BDD tests, accessibility, spec coverage) is enforced
  in CI, not just documented.

## 2. The Agentic Loop (harness self-improvement)
The harness now closes its own improvement loop **with no embedded LLM and no API
key** — the AI agent is a pluggable actuator, and the repo stays provider-neutral.
The loop is zero-dependency Node ESM, so it runs on the Windows CI and any dev
machine without `pwsh`.

| Stage | Command | What it does |
|---|---|---|
| **Sense** | `node scripts/harness-status.mjs` | Scans every app for missing artifacts, contract/BDD gaps, spec drift, and guardrail violations → `harness-status.json`. |
| **Propose** | `node scripts/emit-tasks.mjs` | Turns each finding into a self-contained work order under `tasks/`. |
| **Act** | (any agent) | An agent claims a task, does the work, opens a PR — never self-merges. |
| **Verify** | `node scripts/harness-status.mjs --gate` | Blocking CI gate: fails on guardrail regressions + missing specs (drift only informs). Guardrails are self-tested (`harness-status.test.mjs`). |
| **Learn** | `node scripts/harness-learn.mjs` | Enforces a closed `Lesson ⇄ Guardrail ⇄ Self-test` loop so new guardrails must trace to a documented lesson. |

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn`
commands. The loop runs in CI via `.github/workflows/sdd-sentinel.yml`. See
`.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent contract.

## 3. Current State / Open Work
- **Active branch:** `claude/play-store-production-readiness-weh4sp` — adds the
  `capacitor-absolute-base` guardrail and fixes the bug it caught (see §6 below).
- **Smart Recipe App:** the loop flagged real spec drift; acting on it added a
  genuine recipe-recommendation engine (`src/lib/recommend.ts`) and reconciled the
  spec to the app's true static-export + `localStorage` architecture. Sense now
  reports **0 findings**. See `projects/smart-recipe-app/AGENT_HANDOFF.md` for
  app-level detail and known gaps.
- **LexiVault Financial RAG:** 100% client-side private RAG (zero-exfiltration CSP,
  PBKDF2 key derivation, auto-lock, ReDoS/prompt-injection shield, tamper-evident
  hash chaining). Passing the full harness suite.

## 4. How to Verify
- Whole-repo sense + gates: `.\scripts\harness.ps1 status`, then `verify` and `learn`.
- A single app: `.\scripts\test-app.ps1 -AppName <AppName>` (security, lint,
  type-check, Vitest, Playwright + a11y).
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.

## 5. Next Steps for the Next Agent
- When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
  guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
- Consider making the Verify gate `--strict` (drift-blocking) once all specs are
  reconciled, and adding guardrails for any new recurring regression.
- Play Store: §6 findings are all cleared. What remains is human work — fill the
  privacy-policy placeholders, get it reviewed, produce store listing screenshots,
  and confirm the first real `gradlew bundleRelease` in CI actually succeeds.

## 6. Play Store Readiness (mood-diner) — every sensed finding cleared
`mood-diner` is the only app with a native container (`android/`, Capacitor). It
started as a stock `npx cap add android` scaffold. The `senseMobileRelease` sensor
now reports **0 findings** and `tasks/` is empty.

**Not the same as "shipped."** Two things still need a human:
1. `public/privacy.html` contains `[DEVELOPER NAME]` and `[CONTACT EMAIL]`
   placeholders and has had no legal review.
2. Nothing here has been built with a real Android SDK — there is none in the dev
   container. The signing and version logic was verified by parse-check and by
   evaluating the real Gradle blocks against stubs, and the CI workflow added
   below is the first thing that will actually run `gradlew bundleRelease`. Treat
   its first run as the real proof.

Store listing metadata and screenshots are also still absent — the sensor never
covered those (`public/playstore-banner.jpg` exists but is unreferenced).

**Fixed + guarded:** the production bundle hardcoded `base:
'/agentic-app-harness/mood-diner/'`. Capacitor serves from `https://localhost/` in
the WebView, so every asset 404'd and the app booted blank — while the identical
build was correct on Pages, so web CI, Playwright and the live deploy all stayed
green. Now `base: './'`, enforced by `[guardrail: capacitor-absolute-base]`.
Verified by serving `dist/` at both origins: old base → `404`, new base → `200`.

**All seven sensed findings, and what closed each.** The `senseMobileRelease`
sensor reports these as non-blocking `mobile-readiness` findings; all are now
resolved and their work orders pruned:
- **Release signing** — `android/app/build.gradle` now resolves
  credentials from `ANDROID_KEYSTORE_*` env vars, then a git-ignored
  `android/keystore.properties`. All four values required; missing/empty leaves
  the build unsigned with a warning rather than failing; a configured-but-absent
  keystore fails fast. `*.jks`, `*.keystore` and `keystore.properties` are now
  git-ignored (they were **not** before — the template lines were commented out).
  Setup is documented in `projects/mood-diner/README.md`. Note: no Android SDK in
  the dev container, so this was verified by Groovy parse-check plus evaluating
  the real resolution block against stubs across 7 cases — **not** by running an
  actual `gradlew bundleRelease`. That still needs a machine with the SDK.
- **Launcher icons** — all densities regenerated from the app's own artwork
  (`public/icon-512.jpg`, a 1024×1024 fork/knife/sun/snowflake mark). Cropped
  *inside* the mockup's rounded corners so no light background bleeds in; legacy
  square, circular `_round`, and full-bleed adaptive foreground. The adaptive
  background `#2B3A50` is averaged from three corner patches — a whole-image mean
  gives a muddy grey because the bright glyph drags it. The adaptive foreground is
  full-bleed rather than inset to the 72dp safe zone: the artwork's own background
  is a gradient, so an inset would leave a visible square seam against any flat
  colour. Splash screens (11 files, not a sensed finding) were also stock Capacitor
  and are regenerated on `#0f172a`, matching the app's theme-color so launch does
  not flash.
- **versionCode** — now `ANDROID_VERSION_CODE` (the CI run number), falling back
  to 1 locally. `versionName` likewise via `ANDROID_VERSION_NAME`.
- **app_name** — `MoodDiner`, not the raw slug.
- **manifest icons** — `icon-192.png`/`icon-512.png` generated. Paths also changed
  from root-absolute to relative (`./icon-192.png`, `start_url`/`scope` `./`),
  which was the same origin-pinning bug as the base path: `/icon-192.png` resolves
  to the domain root and 404s under the Pages subpath.
- **Android CI** — `.github/workflows/android-release.yml` builds the AAB on every
  mood-diner change and uploads it. Runs without secrets (unsigned, still verifies
  the native build); signs when `ANDROID_KEYSTORE_*` secrets exist. Note the
  keystore gate uses `env.KEYSTORE_BASE64`, not `secrets.*` — the `secrets` context
  is not available in a step `if:` and would silently never match.
- `index.html` had a dead `href="/vite.svg"` favicon; now `icon-512.jpg`.
- **Privacy policy** — `public/privacy.html`, so it ships with the
  build and gets a public URL on Pages for the listing. Written from a code audit,
  which corrected an earlier wrong assumption: the app makes **no** weather API
  call and has **no** `fetch()` anywhere; weather is hardcoded presets. The only
  real third-party request is the Unsplash image CDN. Data safety mapping is in
  `projects/mood-diner/README.md`. **Still needs `[DEVELOPER NAME]` and
  `[CONTACT EMAIL]` filled in, and a human/legal review, before publishing.**

**Gate blind spot — CLOSED.** E2E previously ran only against the dev server
(base `/`), so no test ever loaded the shipped artifact; that is structurally why
the base-path bug survived. `e2e/production-bundle.spec.ts` now loads the real
`dist/` bundle and fails on any request that 404s. `e2e/serve-dist.mjs` serves it
on **two separate ports** — root (`:5179`, the Capacitor WebView origin) and the
Pages subpath (`:5180`) — because a single port answering both would resolve a
subpath-pinned asset URL at the root mount and pass on a broken app. Verified by
mutation: restoring the absolute base fails the WebView boot test and the
asset-URL test, while the Pages test correctly still passes.

**Verify the sensor:** `node scripts/harness-status.test.mjs` covers it against
fixture trees — it asserts every check fires on an unprepared app, none fire on a
release-ready one, nothing fires on a web-only app, and no finding is blocking.
