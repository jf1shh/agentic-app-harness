# Play Store Deployment Guide — All 5 Android Apps

> **Status: Smart Recipe re-audited 2026-11-02 and chosen to ship first** (see §0 and §6). The
> other four apps were last audited 2026-08-20. The remaining blockers (keystore, secrets, Play
> Console, testers) are owner-only.

## 0. Smart Recipe first release — owner-only checklist

Agents must not do any of these steps: they create or handle signing keys, GitHub secrets, or the
Play Console account. Do them in order. Commands assume a shell in a folder outside the repo, so the
keystore never lands in the working tree.

1. **Create the upload keystore** (any machine with a JDK; it prompts for a password — use one
   password for both prompts and store it in your password manager). Back up the `.jks` file
   somewhere safe; it is the only key that can sign Smart Recipe updates.
   ```bash
   keytool -genkeypair -v -keystore smart-recipe-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Smart Recipe, OU=Mobile, O=Agentic App Harness, C=US"
   ```
2. **Add the 4 GitHub secrets** (the two password commands prompt; paste the keystore password):
   ```bash
   base64 -w0 smart-recipe-upload.jks | gh secret set ANDROID_KEYSTORE_BASE64_SMART_RECIPE_APP --repo jf1shh/agentic-app-harness
   ```
   ```bash
   gh secret set ANDROID_KEYSTORE_PASSWORD_SMART_RECIPE_APP --repo jf1shh/agentic-app-harness
   ```
   ```bash
   gh secret set ANDROID_KEY_PASSWORD_SMART_RECIPE_APP --repo jf1shh/agentic-app-harness
   ```
   ```bash
   gh secret set ANDROID_KEY_ALIAS_SMART_RECIPE_APP --repo jf1shh/agentic-app-harness --body upload
   ```
   Then build a signed bundle and check the run summary says **"Built a SIGNED release bundle."**:
   ```bash
   gh workflow run android-release-smart-recipe-app.yml --repo jf1shh/agentic-app-harness --ref master
   ```
   Download the `.aab` from that run (`gh run list --workflow android-release-smart-recipe-app.yml
   --repo jf1shh/agentic-app-harness -L 1` gives the run id):
   ```bash
   gh run download RUN_ID --repo jf1shh/agentic-app-harness -n smart-recipe-app-release-aab
   ```
3. **Play Console intake** (play.google.com/console). Every answer is in
   `projects/smart-recipe-app/store-listing/README.md`.
   - **Home → Create app**: name *Smart Recipe*, default language English (US), App, Free.
   - **Grow users → Store presence → Main store listing**: short + full description, icon
     (`icon-512.png`), feature graphic, the 5 phone screenshots. Category: **Food & Drink**.
   - **Policy and programs → App content**: Privacy policy
     `https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/privacy.html`; App access →
     *All functionality is available without special access*; Ads → *No*; Content rating → the IARC
     answers; Target audience → 13+ (not designed for children); Data safety → the README's
     **option 1** (declares in-app search text) unless you prefer option 2.
   - **Test and release → Setup → App signing**: accept Play App Signing (Google holds the app
     signing key; your keystore from step 1 is the *upload* key).
4. **Upload to closed testing**: **Test and release → Testing → Closed testing → Create track** (or
   use the default *Closed testing - Alpha*) → **Testers** tab → add an email list → **Create new
   release** → upload the `.aab` → **Next → Save → Start rollout**. Choose countries on the
   **Countries / regions** tab.
5. **Recruit 12 testers**: copy the opt-in link from the **Testers** tab and send it to 12+ real
   people with Android phones. Each one opens the link, taps *Become a tester*, then installs from
   Play. Recruit 15–20 so one dropout does not reset the count.
6. **Wait 14 days**: the 12 must stay opted in for 14 days in a row. Ask them to use all four
   screens (inventory, recipes, search, planner) and send feedback — the production application
   asks about both. Meanwhile, read **Test and release → Testing → Pre-launch report** and fix
   anything it flags.
7. **Apply for production**: **Dashboard → Apply for production** (shows once step 6 is met).
   Answer the three parts (closed test, the app, production readiness). Google says review "usually
   takes seven days or less". After approval: **Test and release → Production → Create new release**.

---

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

- *(Updated 2026-11-02.)* Smart Recipe's workflow has now run on a push to
  `master` (2026-10-20, green) and produced an AAB artifact — **unsigned**,
  because no keystore secrets exist yet. (Recent failing runs of the same
  workflow on 2026-10-20/26 and 2026-11-02 were all on Dependabot PRs for
  `elder-care-planner`, failing at `npm install` with
  `Cannot read properties of null (reading 'edgesOut')` — a lockfile problem
  in those PRs, not in Smart Recipe.)
- *(Found 2026-11-02.)* The backup-exclusion row above was wrong for four
  apps: their rules excluded `domain="file" path="app_webview/"`, which is
  `files/app_webview/`, while the WebView keeps its storage under the app root
  (`root/app_webview/`). Elder Care Planner was already fixed; Smart Recipe is
  fixed in the 2026-11-02 PR. MoodDiner, SmartPack and LexiVault still carry
  the wrong domain.
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

> **2026-11-02:** since the 2026-10-14 consolidation into the shared
> `_android-bundle.yml`, the suffix is applied only when the app's trigger
> workflow passes `secret_suffix:`. Smart Recipe's does
> (`secret_suffix: _SMART_RECIPE_APP`); MoodDiner needs none. **SmartPack,
> LexiVault and Elder Care Planner do not pass it yet**, so today they would
> read MoodDiner's unsuffixed secrets — add the one `secret_suffix:` line to
> each trigger before setting their secrets.

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

1. Push to `master` (touching the app's files) — **or** go to
   **Actions → Android Release Bundle (<app>) → Run workflow** (uses
   `workflow_dispatch`; no push needed).
2. Wait for the run to finish; download the `.aab` from the run's **Artifacts**
   section (artifact names: `<app>-release-aab`).
3. Play Console → the app → **Production** (or **Internal testing** first) →
   **Create new release** → upload the `.aab` → review → roll out. A new
   *personal* developer account cannot use Production until it passes the
   closed-test rule in §6.2.

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

---

## 6. Smart Recipe release audit (2026-11-02)

### 6.1 Checks rerun

| Check | Result on 2026-11-02 |
|---|---|
| `node scripts/harness-status.mjs --gate` | PASSED — 0 blocking, 1 informational finding |
| `node scripts/test-app.mjs smart-recipe-app` | ALL PASSED — lint, type-check, Vitest 56/56, Playwright + axe 7/7 |
| `npm run build:capacitor` (in `projects/smart-recipe-app`) | exit 0, static export to `.next-capacitor/` |
| Privacy policy URL | HTTP 200 |
| Latest push run of `android-release-smart-recipe-app.yml` | green (2026-10-20, `master`), AAB artifact uploaded, **unsigned** |
| `AndroidManifest.xml` permissions | `INTERNET` only |
| Network calls in the app | TheMealDB search (`search.php?s=<text>`) on Search only, plus result photos from TheMealDB while results are shown |
| On-device storage | three `localStorage` keys (inventory, recipes, meal plan) |

Fixed in the same PR: the WebView backup exclusion (wrong domain, §1), the per-app secret names
(§3.2 note), listing copy that claimed recipes can be edited (they cannot), the privacy policy's
"recipes you write yourself" (no such feature) and its missing line about result photos, and the
screenshots (recaptured; see the store-listing README).

### 6.2 Google Play testing rule for new personal accounts

**Checked 2026-11-02** on Google's page *App testing requirements for new personal developer
accounts* (support.google.com/googleplay/android-developer/answer/14151465). It says:

- It applies to **personal** developer accounts **created after November 13, 2023**. Production
  (and pre-registration) stay locked until the requirement is met.
- You must run a **closed test** with **at least 12 testers** who have been **opted in continuously
  for at least 14 days**. At least 12 must be opted in when you apply; a tester who opts out before
  14 days does not count.
- You then **apply for production** from the Dashboard. The form has three parts: about your closed
  test (recruiting, engagement, feedback), about your app (audience, value, expected installs), and
  production readiness (what changed after testing). Review "usually takes seven days or less".
- The page does **not** mention organization accounts. The exemption for organization (D-U-N-S
  verified) accounts is our understanding from Google's wider account-type guidance, not something
  this page states — check the account type in Play Console before counting on it.
- The page does not say "real people" in those words, but testers join through a Google account
  opt-in link and install through Play, and the production form asks how they engaged and what
  feedback they gave. **Treat testers as 12+ real people on real phones.** Agents can do testing
  *work* — Play's pre-launch report (automated crawls on Google's devices), the Playwright suite,
  scripted UI runs — but none of that counts toward the 12. Do not use bot or emulator accounts to
  pad the number.

### 6.3 Review risk: "minimum functionality" / "just a web wrapper"

**Verdict: low risk.** Google's concern is apps that only load a website, or do too little to be
useful. Smart Recipe is neither:

- The whole UI ships inside the APK (static export synced by `cap sync`) and loads from
  `https://localhost` in the WebView. It never loads a remote site.
- Four real tools (pantry tracker, recipe catalog with inventory matching, recipe search, meal
  planner). Three of the four work fully offline; data stays on the device.
- No login wall, no dead ends: every in-app link is an internal `next/link` route (checked in the
  source on 2026-11-02), and the two external URLs (privacy policy, TheMealDB API terms) return 200.

What would lower the risk further (none blocks submission):

1. **Friendlier offline search.** With no network, search shows "Failed to search recipes." A
   message like "You're offline — search needs internet. Your saved recipes still work." reads as
   a deliberate app, not a broken page.
2. **Hide developer wording.** The planner's recipe picker shows file slugs
   (`classic-pesto-pasta`), and recipe cards say "View Recipe Markdown" and show raw markdown. Show
   the recipe title and rendered text instead.
3. **Native feel.** The top text-link nav bar looks like a website. A bottom tab bar, and checking
   that the Android back button steps back through screens instead of closing the app, would feel
   native. Test both on a real phone during the closed test.
4. **Listing copy.** The full description ends "Works as an installed app or straight from your
   browser." Dropping that line on Play avoids inviting the "it's a website" reading.
5. **Pre-launch report.** Read it before applying for production; fix any crash or accessibility
   item it lists.
