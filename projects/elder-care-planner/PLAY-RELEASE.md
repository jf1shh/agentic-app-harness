# Play release preparation

Reviewed 2026-10-06 UTC. **Nothing has been submitted or published on Google Play.**
The release AAB builds successfully but is unsigned and cannot be uploaded.

## App and changes

App ID `com.harness.eldercareplanner`; version code `1`, name `1.0.0`; minimum API 24,
target API 36. Confirm package ownership, upload key, and previous version codes in Console.

The release retains the narrow native privacy and sharing fixes: Android family links now use the
existing public web URL instead of device-private localhost, with encrypted data only in the
fragment. Web senders retain their current host/path. Backup exclusions now target
`root/app_webview/` for legacy, cloud and device transfer. The XML is registered as a Gradle
test input so a change invalidates cached tests. No delegated provider execution occurred.

The policy and listing copy now describe optional snapshots, plaintext JSON exports, encrypted
normal autosave, plaintext fallback/closing-page saves, and unencrypted photos/receipts.
Listing questionnaire answers remain drafts for the actual Console questions.

## Verification

- Full app gate: **557 Vitest tests / 33 files**, **143 browser/accessibility tests**, lint and
  type check passed. Output: `ALL HARNESS CHECKS PASSED FOR elder-care-planner!` with a
  non-blocking workspace dependency-audit warning (15 advisories: 4 moderate, 10 high,
  1 critical). This does not certify the entire workspace as patched.
- Sharing regression failed first on the localhost origin; all 15 sharing tests then passed.
  Disabling the native URL branch made the test fail again; the fix was restored.
- Android backup tests failed first: 4 tests completed, 3 failed. After correction, changing
  the domains back to `file` reproduced the three failures; correct rules were restored.
  The first mutation check exposed an XML test-input omission, which was corrected.
- `gradlew assembleDebug bundleRelease testDebugUnitTest testReleaseUnitTest --no-daemon`:
  `BUILD SUCCESSFUL in 7s`, 221 tasks. Both app test variants report 4 tests, 0 failures.
- APK v2 signature verifies. APK XML dumps confirm the corrected root exclusions are packaged.
- Exact APK web-payload smoke: root assets, phone viewport, calculations, encrypted persistence
  after reload; zero external requests/page/HTTP errors. **Browser payload test only**.
- Harness gate: 6 apps, 1 pre-existing informational LexiVault drift finding, 0 blocking. Learn: 10 guardrails trace to lessons.
  Documentation gate: 1 claim verified. Diff whitespace check passed.
- Live app and policy URLs return HTTP 200. The hosted policy still says **7 August 2026**;
  the corrected local policy has not been deployed.

Local ignored evidence: `android/build-evidence/`, including `play-*.log`, `share-*.log`,
`backup-*.log`, and the APK smoke script. Build instructions:
[ANDROID-LOCAL-BUILD.md](ANDROID-LOCAL-BUILD.md). Listing assets/copy:
[store-listing/README.md](store-listing/README.md).

Current artifacts (local-only until copied to the scoped hub artifact folder):

- `android/app/build/outputs/apk/debug/app-debug.apk`, debug signed.
  SHA-256: `73773bc32b53d79e9a4a019560a818486d5ed50a6a39d2febc784129e9973590`.
- `android/app/build/outputs/bundle/release/app-release.aab`, **unsigned preparation artifact**.
  SHA-256: `5ec9db6d87412fa7b34338099afaff655ac8eba01a266d9360d409021ab0bddf`.

## Remaining gates and exact next actions

1. **Dataset decision — Jared.** `COST_DATA_SOURCE.licensingConfirmed` is still false.
   The existing app handoff says this "blocks a public launch, not the build"; spec §10.1
   requires confirmed terms or a supported fallback. [CareScout's terms](https://www.carescout.com/terms-of-use)
   restrict reuse. Supply applicable permission evidence or choose the proposed user-entered-cost
   version. Silently removing the table changes the five-field default-estimate contract.
   No permission request has been sent and no dataset has been replaced.
2. **Console access — Jared.** The approved redirect worked; Google sign-in was left open in a
   browser session. Sign in yourself and report whether Elder Care Planner exists. Account type,
   creation date, app/package ownership and production access are unverified. GitHub signing-secret
   metadata lookup failed with HTTP 401, so remote signing-secret availability is unknown.
3. **Signing — inspect Console first.** No local release keystore/properties file was found.
   Reuse the existing upload key for an existing app; arrange a private key/recovery copy for
   a new app outside source/notes sync. Never put passwords or keystores in chat or tracked source.
   Existing Gradle config accepts environment variables or ignored `android/keystore.properties`.
   Rebuild a signed AAB and verify it before upload; version code 1 may already be used.
4. **Native/human acceptance.** Test an Android device: offline calculations, process restart,
   attachments, export/import, native link opening on another device, and backup/restore.
   Replace web listing screenshots with tested Android release captures. Spec §9.1 human usability
   checks remain pending. No configured emulator or native device run was verified.
5. **Policy and declarations.** Deploy the corrected policy through the human-reviewed repository
   workflow and check the live text. Complete rating, target audience, data safety, financial and
   health forms against their actual definitions. Finance category does not decide every form.
   [Google Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
   excludes local-only processing and qualifying user-initiated sharing, but declarations must
   match the release's actual behavior.
6. **Price — Jared.** Recommendation: **$2.99 USD once**, awaiting a choice. No subscription
   or in-app billing exists. Verify paid-distribution payments setup in the account. Paid-to-free
   is allowed; an app offered free cannot later become paid under the same package.
   [Google pricing guidance](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).
7. **Testing and review.** After signing and the applicable gates, upload to a testing track.
   Personal accounts created after 13 November 2023 need 12 opted-in testers continuously for
   14 days before applying for production access; verify whether this account is affected.
   Production access and app review require Google's approval.
   [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Git delivery update (2026-10-06 UTC)

Jared explicitly authorized commit, push and merge. The original work is preserved in
`6286920` on `harness-audit-fixes`; only that scoped patch was applied on
`fix/elder-care-android-play-preparation`, based on current master
`07029c5e8b2128957e9cfb0a4f85e9858542f5c6`. Newer storage-recovery, async-save and key-race
hardening remains intact. The integrated counts/build/hashes above supersede the earlier
554/142 verification snapshot. Android release CI now runs `testReleaseUnitTest` beside
`bundleRelease` so the backup regression tests execute on PRs.

Git integration and the existing master Pages deployment are authorized. Price selection,
release signing and Play upload remain pending; the publication gates above still apply.
The latest actual Git/CI/deployment outcome is recorded in the shared project checkpoint.
