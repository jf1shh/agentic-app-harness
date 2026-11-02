# Handoff — September 6 monorepo review and remediation

Worktree: `/home/jaredf/Projects/harness-hardening-review`
Branch: `fix/monorepo-hardening`, based on `ce0d198`.
Original checkout: `/home/jaredf/Projects/agentic-app-harness` remains untouched, including
its untracked `CLAUDE.md.bak-2026-09-05`. No push, merge, deployment, or messages to others.

Read [docs/monorepo-hardening.md](docs/monorepo-hardening.md) for the full assessment, findings,
fixes, exact validation, and limits. Main fixes: safe release metadata, honest audit failures,
real Smart Recipe browser persistence, stable IDs/write failures, Elder Care recovery/save/key
ordering, MoodDiner blocked-storage handling, serialized LexiVault audit/fingerprints/view
locking, static-server resilience, and accurate portfolio/security claims.

Verification: six full app gates pass; 1,362 Vitest tests and 254 Playwright tests. Harness
self-tests: 29 files pass. Doctor: all 8 checks pass; scanner: 1 informational LexiVault roadmap
finding, 0 blocking. Learn: 10 guardrails, 59 lessons. Retrieval: 20/20 hit-rate@K, MRR 1.000.
Node 20.20.2; compatible npm 10.9.9 in `/tmp/harness-node20`. Detailed local transcripts are
`/tmp/harness-*.txt`; these temporary files are not repository artifacts. New tests were red
before fixes; four deliberate mutations were caught and restored. Desktop screenshot refreshed;
390px overflow check passed with no JavaScript errors.

Next priorities: review the change before merging; decide whether to design an actual
persistent encrypted LexiVault; address travel input resource limits/geocoding validation;
revisit Elder Care plaintext fallback and multi-tab recovery/erasure behavior; validate
infrastructure, Android devices, manual accessibility, and external data provenance separately.

## Public portfolio alignment — 2026-10-12

Jared confirmed the October 10 LinkedIn wording as the source for this update. README and portfolio About/footer now say 17 years at Liberty Mutual, 11 as senior appraiser; building with AI coding agents since March 2026; moving into AI enablement and product. The portfolio links https://www.linkedin.com/in/jaredfisher-ai/. Its spec, README, and existing contact browser checks are aligned.

Verification on the isolated refresh checkout: full `node scripts/test-app.mjs portfolio-hub` with Node 20.20.2/npm 10.8.2 passed lint, type check, 65 unit tests and 13 browser tests including automated accessibility and the production Pages subpath. The dependency audit reported existing advisories (non-blocking in this gate); dependency versions were not changed. A mutation restoring the old App.tsx title/link failed both updated contact tests; restoring the final file passed 2/2. The six-app VERIFY scan reported 0 blocking findings and 1 existing informational LexiVault drift finding; LEARN and documentation-claim gates passed.

Next action: human review/approval and merge of the public portfolio alignment PR after its required checks pass; then verify Pages deployment and rendered public links. No new runtime, retrieval, release, or application feature was introduced. Earlier handoff evidence above is historical.

## Smart Recipe Play release prep — 2026-11-02

Branch `claude/play-release-smart-recipe-121990`. Smart Recipe is the first app to ship on Google
Play. Agent-side work is done; see `PLAY-STORE-DEPLOY.md` §0 (owner-only checklist, in order) and §6
(checks rerun, Google's 12-testers-for-14-days rule as checked today, and the low "web wrapper"
review-risk verdict). Fixed here: Smart Recipe's WebView backup exclusion (`root`, not `file`), the
reusable Android workflow's per-app secret suffix (`secret_suffix`, passed only by Smart Recipe's
trigger so far), the store-listing and privacy-policy claims, and the screenshots (recaptured at
phone size by `store-listing/capture-screenshots.mjs`).

Open, not done here: the same backup-domain fix for MoodDiner, SmartPack and LexiVault; the
`secret_suffix:` line for SmartPack, LexiVault and Elder Care Planner; the in-app polish listed in
`PLAY-STORE-DEPLOY.md` §6.3. Keystore, secrets, Play Console and testers are owner-only.
