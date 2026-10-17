# Build Elder Care Planner for Android

This builds the existing offline planner as an installable debug APK. It uses the
Capacitor export at the container root; the GitHub Pages export has a different
base path and must not be copied into Android.

## Toolchain on Jared's desktop

- Node 22.23.2: `~/.local/share/node/node-v22.23.2-linux-x64/bin`.
- Temurin Java 21: `~/.local/share/jdks/jdk-21.0.12.1+1`.
- Android SDK: `~/Android/Sdk`, platform 36 (installed), minimum device API 24.
- Gradle 8.14.3: supplied by the committed wrapper.
- Capacitor core, CLI and Android: pinned together at 8.5.2 for this app.

The root `.nvmrc` is 20, but Capacitor 8's CLI requires Node 22 or later, matching
the app's Android CI workflow. Android Studio's bundled Java is currently 25;
use the Java 21 installation above for this project's Gradle JDK.

## Verify and build

```bash
cd ~/Projects/agentic-app-harness
export PATH="$HOME/.local/share/node/node-v22.23.2-linux-x64/bin:$PATH"
export JAVA_HOME="$HOME/.local/share/jdks/jdk-21.0.12.1+1"
export ANDROID_HOME="$HOME/Android/Sdk"

CI=1 node scripts/test-app.mjs elder-care-planner
node scripts/harness-status.mjs --gate

cd projects/elder-care-planner
npm run build:capacitor
npx cap sync android
cd android
bash ./gradlew assembleDebug testDebugUnitTest --no-daemon
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose \
  app/build/outputs/apk/debug/app-debug.apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. The build and test
scripts perform scoped cleanup; run verification before the final web export so
cleaning does not interrupt a concurrently running export or test server.

After dependency changes, always run `cap sync` again and inspect
`android/capacitor.settings.gradle`. npm workspaces may install this app's patched
Capacitor Android package locally while other apps keep their older hoisted
version. The generated Gradle path must resolve to this app's 8.5.2 package.

## Try the app

Open this app's `android/` directory in Android Studio, choose Java 21 as the
Gradle JDK, and select a connected phone or configured emulator. Alternatively,
copy the APK to the phone, open it and allow installation from that file source
if Android prompts. This is a debug-signed test build; Play Store publication
requires a separately authorized signed release and the project's release gates.

User-entered plans stay in the app's device storage. Uninstalling the app can
remove that storage. Test with sample figures first.

## Security patch and verification scope

The initial build's live audit found
[GHSA-rvm3-566m-v7fv](https://github.com/advisories/GHSA-rvm3-566m-v7fv) in
Capacitor Android 8.5.0. This app's peer set was patched to 8.5.2, and the native
dependency path regenerated. Other app manifests were outside this task.
The shared workspace audit still reports advisories, including older Capacitor
copies for those apps; this is not a claim that the whole monorepo is patched.

Build logs and the exact-APK payload smoke script are local-only, ignored under
`android/build-evidence/`. A phone-sized Chromium smoke checks the actual APK's
extracted web assets, calculation, persistence after reload, and absence of
external resource requests. It does not prove native Android WebView behavior.
Native device testing and the spec's human usability gates remain separate.
