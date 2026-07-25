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
