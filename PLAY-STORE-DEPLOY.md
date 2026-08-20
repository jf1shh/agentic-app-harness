# Play Store Deployment Guide — All 5 Android Apps

> **Status: last audited 2026-08-20.** Everything that lives in this repository
> is in place and gate-green. The remaining blockers (keystore secrets, Play
> Console intake) are external and covered in [§3 – The CI workflow](#3-the-ci-workflow-the-path-we-chose).

This repo ships **5 Android apps** via Capacitor. Each app has a committed
`android/` Gradle container and its own GitHub Actions workflow that produces an
App Bundle (`.aab`) ready to upload to Google Play. This document records what
is done, what is verified, and the exact end-to-end release workflow.

| App (launcher name) | Package ID | Web framework | Store kit |
|---|---|---|---|
| **MoodDiner** | `com.harness.mooddiner` | Vite + React | `projects/mood-diner/store-listing/README.md` |
| **SmartPack** | `com.jf1shh.travelpacking` | Next.js | `projects/travel-packing-app/store-listing/README.md` |
| **Smart Recipe** | `com.harness.smartrecipe` | Next.js | `projects/smart-recipe-app/store-listing/README.md` |
| **LexiVault** | `com.harness.legalfinancialrag` | Vite + React | `projects/legal-financial-rag/store-listing/README.md` |
| **Elder Care Planner** | `com.harness.eldercareplanner` | Next.js | `projects/elder-care-planner/store-listing/README.md` |

---

## 1. Progress so far (verified ✅)

| Requirement | MoodDiner | SmartPack | Smart Recipe | LexiVault | Elder Care Planner |
|---|---|---|---|---|---|
| Capacitor Android container committed (`android/` + Gradle wrapper) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Unique package ID (see table above) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Launcher name = product name (not repo slug) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Adaptive icons + splash, all densities | ✅ | ✅ | ✅ | ✅ | ✅ |
| minSdk 24, target/compile SDK 36 (64-bit) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Release signing block (env vars or `keystore.properties`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-incrementing `versionCode` in CI (`github.run_number`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Privacy policy hosted on GitHub Pages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Store listing copy + IARC answers (paste-ready) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data Safety form answers (cross-checked vs. policy) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Feature graphic 1024×500 + screenshots 1080×1920 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Android release CI workflow (AAB artifact) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Backup/transfer rules (WebView storage excluded) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Policy mismatches fixed (paywall, INTERNET, CAMERA) | ✅ | ✅ | ✅ | ✅ | ✅ |

**Verified by direct checks on 2026-08-20:**

- `node scripts/harness-status.mjs --gate` → **0 findings** (passes).
- All 5 privacy policies return HTTP 200 at
  `https://jf1shh.github.io/agentic-app-harness/<app>/privacy.html`.
- Every Android Release Bundle workflow run (on PRs) is green — the native
  Gradle build + `bundleRelease` compiles for all 5 apps in CI.
- Every `android/` container is a complete Gradle project: `gradlew`,
  `gradle-wrapper.jar`, `capacitor.settings.gradle`, manifests, icons — all
  committed. (The web assets under `android/app/src/main/assets/public/` are
  git-ignored by design and populated by `cap sync` during the CI build.)

**Known caveats (not blockers once the steps in §3 are done):**

- The release workflows have only ever run on **pull requests** (all green) —
  no push-to-`main` run has produced an artifact yet. The first push or manual
  dispatch will produce the first real AAB.
- **MoodDiner screenshots `1-home.png` and `2-weather-engine.png`** were
  captured in a network-restricted sandbox, so their Unsplash restaurant photos
  render blank. Recapture before upload:
  `node projects/mood-diner/store-listing/capture-screenshots.mjs`
  (needs internet).
- Without the keystore secrets the workflow builds an **unsigned** bundle on
  purpose (so CI verifies the native build on forks too). Unsigned AABs cannot
  be uploaded to Play — the workflow prints a warning saying so.

---

## 2. Two ways to produce a release bundle

1. **CI (recommended — this is the path we chose).** Everything happens on
   GitHub's runners: web build → `cap sync` → signed `bundleRelease` → AAB
   artifact. No local Android SDK, no Android Studio. See §3.
2. **Android Studio (local alternative).** Open `projects/<app>/android` in
   Android Studio. Requires `npm run build` + `npx cap sync android` first,
   plus either a `keystore.properties` (documented in each
   `android/app/build.gradle` header) or the Generate Signed Bundle wizard.
   `versionCode` defaults to 1 locally — must be bumped manually per upload.
   See §5.

---

## 3. The CI workflow (the path we chose)

### 3.0 What each workflow does (no secrets → still builds, unsigned)

For every app, `android-release*.yml` runs:

1. `npm install` (root workspace lockfile)
2. Build the web bundle:
   - Vite apps (MoodDiner, LexiVault): `npx vite build` → `dist/`
   - Next.js apps (SmartPack, Smart Recipe, Elder Care Planner):
     `npm run build:capacitor` → `.next-capacitor/` (matches each
     `capacitor.config.*` `webDir`)
3. `npx cap sync android` — copies the web bundle into
   `android/app/src/main/assets/public/`
4. If `ANDROID_KEYSTORE_BASE64[<SUFFIX>]` is set: decode it to a temp keystore
5. `./gradlew bundleRelease --no-daemon` with
   `ANDROID_VERSION_CODE = github.run_number` (auto-increments every run, so
   Play's "version must strictly increase" rule is always satisfied)
6. Upload the `.aab` as a build artifact
7. Report SIGNED vs UNSIGNED in the run summary

### 3.1 Prereq A — Create one upload keystore per app (5 total)

Run once per app on any machine with a JDK. Keep every `.jks` file safe — it
is the only thing that can publish updates; losing it means Google's
intervention.

```bash
keytool -genkeypair -v -keystore mood-diner-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <PASSWORD> -keypass <PASSWORD> \
  -dname "CN=MoodDiner, OU=Mobile, O=Agentic App Harness, C=US"
```

Then base64-encode it (this becomes the `ANDROID_KEYSTORE_BASE64` secret):

```bash
base64 -w0 mood-diner-upload.jks          # Linux — copy the output
base64 -w0 mood-diner-upload.jks | pbcopy # macOS
```

Repeat for the other 4 apps (change the keystore filename and CN).

### 3.2 Prereq B — Add 4 secrets per app (20 total)

GitHub → **Settings → Secrets and variables → Actions**. I (the agent) cannot
set or read these — the credential is scoped away from the secrets API. Names
(use `upload` as the alias value):

| App | `ANDROID_KEYSTORE_BASE64` | `ANDROID_KEYSTORE_PASSWORD` | `ANDROID_KEY_ALIAS` | `ANDROID_KEY_PASSWORD` |
|---|---|---|---|---|
| MoodDiner | `ANDROID_KEYSTORE_BASE64` | `ANDROID_KEYSTORE_PASSWORD` | `ANDROID_KEY_ALIAS` | `ANDROID_KEY_PASSWORD` |
| SmartPack | `…_TRAVEL_PACKING_APP` | `…_TRAVEL_PACKING_APP` | `…_TRAVEL_PACKING_APP` | `…_TRAVEL_PACKING_APP` |
| Smart Recipe | `…_SMART_RECIPE_APP` | `…_SMART_RECIPE_APP` | `…_SMART_RECIPE_APP` | `…_SMART_RECIPE_APP` |
| LexiVault | `…_LEGAL_FINANCIAL_RAG` | `…_LEGAL_FINANCIAL_RAG` | `…_LEGAL_FINANCIAL_RAG` | `…_LEGAL_FINANCIAL_RAG` |
| Elder Care Planner | `…_ELDER_CARE_PLANNER` | `…_ELDER_CARE_PLANNER` | `…_ELDER_CARE_PLANNER` | `…_ELDER_CARE_PLANNER` |

i.e. the four secret names get the suffix shown, e.g.
`ANDROID_KEYSTORE_BASE64_SMART_RECIPE_APP` etc. Each `…_BASE64` value is the
base64 blob from §3.1.

**Verify signing works:** run the workflow (§3.3) and check the run summary —
it must print "Built a SIGNED release bundle." If it prints UNSIGNED, one of
the four secrets is missing or empty.

### 3.3 Prereq C — Play Console intake (one-time, per app)

Requires a Google Play Developer account ($25 one-time). For each of the 5
apps:

1. **Create the app** in Play Console with the package ID from the table above.
2. **Store listing** — paste the copy from the app's
   `store-listing/README.md` (short/full description, etc.).
3. **IARC questionnaire** — use the answers and reasoning already written in
   the same README.
4. **Data Safety form** — use the pre-answered form content (cross-checked
   against the app's own privacy policy).
5. **Privacy policy URL** — the hosted page:
   `https://jf1shh.github.io/agentic-app-harness/<app>/privacy.html`
6. **Graphic assets** — feature graphic 1024×500 and screenshots 1080×1920
   live in each app's `store-listing/` folder.
7. **Set up Play App Signing** (accept the defaults) — this is where your
   upload key (the keystore from §3.1) gets bound to the app.

### 3.4 Trigger a build & upload

1. Push to `main` (touching the app's files) — **or** go to
   **Actions → Android Release Bundle (<app>) → Run workflow** (uses
   `workflow_dispatch`; no push needed).
2. Wait for the run to finish; download the `.aab` from the run's **Artifacts**
   section (artifact names: `<app>-release-aab`).
3. Play Console → the app → **Production** (or **Internal testing** first) →
   **Create new release** → upload the `.aab` → review → roll out.

### 3.5 Subsequent releases

Just trigger the workflow again. `versionCode` comes from
`github.run_number`, which strictly increases across runs, so consecutive
uploads always satisfy Play's version check. Bump the visible version name if
desired by setting `ANDROID_VERSION_NAME` — otherwise it stays `1.0.0` until
you change the workflow.

---

## 4. Per-app release reference

| App | Workflow file | Web build step | Artifact | Privacy policy URL |
|---|---|---|---|---|
| MoodDiner | `android-release.yml` | `npx vite build` | `mood-diner-release-aab` | `https://jf1shh.github.io/agentic-app-harness/mood-diner/privacy.html` |
| SmartPack | `android-release-travel-packing-app.yml` | `npm run build:capacitor` | `travel-packing-app-release-aab` | `…/travel-packing-app/privacy.html` |
| Smart Recipe | `android-release-smart-recipe-app.yml` | `npm run build:capacitor` | `smart-recipe-app-release-aab` | `…/smart-recipe-app/privacy.html` |
| LexiVault | `android-release-legal-financial-rag.yml` | `npx vite build` | `legal-financial-rag-release-aab` | `…/legal-financial-rag/privacy.html` |
| Elder Care Planner | `android-release-elder-care-planner.yml` | `npm run build:capacitor` | `elder-care-planner-release-aab` | `…/elder-care-planner/privacy.html` |

(`…` = `https://jf1shh.github.io/agentic-app-harness`)

Signing credential resolution (identical in all 5 `android/app/build.gradle`):
env vars first (`ANDROID_KEYSTORE_FILE/PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`), then a git-ignored `android/keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Local builds default
to `versionCode 1`, `versionName 1.0.0`.

---

## 5. Android Studio alternative (if you ever prefer local builds)

```bash
cd projects/<app>
npm install
npm run build          # Vite apps — or `npm run build:capacitor` for Next.js apps
npx cap sync android   # populates android/app/src/main/assets/public/
```

Then open `projects/<app>/android` in Android Studio and either:

- create `android/keystore.properties` (auto-signs the `bundleRelease` task),
  or
- use **Build → Generate Signed Bundle / APK** with the keystore from §3.1.

Remember to bump `versionCode` for every upload (local default is 1). The CI
path (§3) does all of this automatically and is the recommended route.
