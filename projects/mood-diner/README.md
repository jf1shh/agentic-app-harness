# mood-diner

This project was scaffolded by the Agentic App Harness.
Please refer to specs/mood-diner-spec.md for the single source of truth regarding architecture and requirements.

## Testing

```bash
npm run lint && npx tsc --noEmit
npx vitest run        # unit
npx playwright test   # E2E + axe a11y, and the production-bundle smoke tests
```

`e2e/production-bundle.spec.ts` is the only suite that loads the **built** bundle
rather than the dev server. `e2e/serve-dist.mjs` serves `dist/` on two separate
ports — `:5179` at the root (the Capacitor WebView origin) and `:5180` under
`/agentic-app-harness/mood-diner/` (GitHub Pages) — because this app ships to
both, and a bundle correct at one origin can be completely broken at the other.
Keep them on separate ports: one server answering both mounts will resolve a
misrouted asset URL and pass on an app that is broken in production.

## Android release signing

Play only accepts an App Bundle signed with an upload key. Credentials are read
from the environment first, then from a git-ignored `android/keystore.properties`.
**Neither the keystore nor its passwords are ever committed** — `*.jks`,
`*.keystore` and `keystore.properties` are ignored in `android/.gitignore`.

### One-time: create an upload key

```bash
keytool -genkeypair -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Store this file somewhere safe **outside the repo** and back it up. If it is lost,
you cannot ship updates to an existing listing without Google's intervention; if
it leaks, anyone can publish updates impersonating this app.

### Local builds

Create `android/keystore.properties` (git-ignored):

```properties
storeFile=/absolute/path/to/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

### CI builds

Set these as secrets instead — they take precedence over the properties file:

| Variable | Meaning |
|---|---|
| `ANDROID_KEYSTORE_FILE` | Absolute path to the decoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (`upload` above) |
| `ANDROID_KEY_PASSWORD` | Key password |

### Behaviour when unconfigured

All four values are required. If any is missing or empty — including an unset CI
secret, which expands to an empty string — the release build stays **unsigned**
and prints a warning rather than failing, so `assembleRelease` still works for
local smoke checks. An unsigned artifact cannot be uploaded to Play. If the
credentials are present but the keystore file is not at the given path, the build
fails immediately with a clear message instead of erroring deep inside the
signing task.

```bash
npx cap sync android
cd android && ./gradlew bundleRelease   # AAB at app/build/outputs/bundle/release/
```

## App icons and splash

All Android launcher icons, the PWA `icon-192.png` / `icon-512.png`, and the
splash screens are derived from a single source of truth: `public/icon-512.jpg`
(1024×1024). To regenerate after changing that artwork, note that it is an icon
*mockup* — the mark sits on a light background with a drop shadow — so crop to
roughly `x 221, y 222, 582×582`, which is **inside** the rounded corners. Cropping
to the rounded-square bounds instead pulls light pixels into the corners.

Two details that are easy to get wrong:

- The adaptive-icon background `#2B3A50` is averaged from three **corner** patches
  of the artwork. A whole-image average yields a muddy grey, because the bright
  glyph dominates it.
- The adaptive foreground is **full-bleed**, not inset to the 72dp safe zone. The
  artwork's own background is a navy gradient, so an inset version leaves a
  visible square seam against any flat background colour. Full-bleed lets the
  launcher mask crop into the artwork's own padding instead.

Splash screens use `#0f172a`, matching the app's `theme-color` and the manifest
`background_color`, so the launch screen and first paint are the same colour.

## Privacy policy and Play Data safety

The policy lives at `public/privacy.html`, so it ships with the build and gets a
public URL on Pages:
`https://jf1shh.github.io/agentic-app-harness/mood-diner/privacy.html` — that is
the URL to paste into the Play listing. **It still contains `[DEVELOPER NAME]` and
`[CONTACT EMAIL]` placeholders that must be filled in before publishing.**

The policy was written from what the code actually does, verified by audit:
no `fetch()` calls anywhere in `src/`, no geolocation, no analytics or ad SDK, no
accounts, and no payment processing. Data is held in `localStorage` only
(`mood_diner_reservations`, `mood_diner_custom_restaurants`, and plan/credit
counters). The one genuine third-party request is the Unsplash image CDN
(`images.unsplash.com`), which necessarily discloses IP and user-agent.

The Data safety form must agree with the policy. Based on the current code:

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **No** — nothing leaves the device to us or a third-party SDK |
| Is data encrypted in transit? | Images load over HTTPS; no user data is transmitted |
| Can users request data deletion? | No account exists; data is removed by clearing app data or uninstalling |
| Data types collected | **None** |
| Advertising / analytics SDKs | **None** |

Two things to keep honest: the free-text “special requests” field can hold
whatever a user types (an allergy, for example), and it is stored unencrypted in
local storage — the policy says so explicitly. And if a future change adds a real
weather API, booking backend, analytics, or payments, **both** this table and
`public/privacy.html` must be updated before the next release.
