# LexiVault — Play Console listing kit

Same method as `projects/mood-diner/store-listing/`: assets built from the app's real brand color
and real UI, copy checked against what the app actually does, Q&A answers cross-checked against
`public/privacy.html`.

## Assets

| File | Spec | Notes |
|---|---|---|
| `icon-512.png` | 512×512 | Recreated at full resolution from the real launcher icon (navy `#1e293b` background, white "LR" monogram) — no existing web-facing icon file to reuse. |
| `feature-graphic.png` | 1024×500 | Built from the same icon + brand color. No store badges, no fabricated numbers. |
| `screenshots/1-query-workbench.png` | 1080×1920 | Landing screen — tabs, the "100% Client-Side Private RAG" badge, and the pre-loaded sample corpus. |
| `screenshots/2-grounded-answer.png` | 1080×1920 | A real query ("What are the debt ratio triggers in the Tesla credit agreement?") run against the app's own hybrid BM25 + vector search, with grounded citations and the confidentiality watermark. |
| `screenshots/3-pii-redaction.png` | 1080×1920 | The automated PII/tax-ID redaction pipeline, showing real masked tags from the sample documents. |
| `screenshots/4-audit-ledger.png` | 1080×1920 | The SHA-256 hash-chained audit ledger — a real two-entry trail from the session that generated this screenshot. |

All four screenshots are real captures from the running app — every figure, citation, and redaction
tag on screen came from the app's own bundled sample corpus (Tesla, Apple, Stripe, and a biotech
term sheet — all public/synthetic filings, not real client data), not a mockup.

## Category
**Business.** LexiVault is a professional document-review tool for lawyers, in-house counsel, and
financial auditors — not a consumer finance app, so Business fits better than Finance.

## Short description (≤80 chars)
```
Client-side legal & financial document search — nothing leaves the device
```
(75 chars)

## Full description (≤4000 chars)
```
LexiVault is a client-side legal and financial document search tool for lawyers, in-house counsel,
and auditors — built so nothing you search ever leaves the device it's running on.

GROUNDED ANSWERS, NOT GUESSES
Ask a question in plain language and LexiVault runs a hybrid BM25 + vector similarity search
against your document set, scoped by a privilege filter (Confidential, Attorney-Client Privilege,
Work Product, Public/Restricted), and returns an answer with citations back to the exact page and
clause it came from.

AUTOMATIC PII AND TAX-ID REDACTION
Before anything is indexed, a client-side pattern-recognition pass detects and masks Social
Security numbers, EIN/tax IDs, and bank routing numbers, so sensitive identifiers don't surface in
a search result by accident.

A TAMPER-EVIDENT AUDIT TRAIL
Every query and document action is appended to a SHA-256 hash-chained ledger you can verify or
export, so there's a defensible record of exactly what was searched and when.

BUILT TO NEVER PHONE HOME
This isn't a policy promise — it's enforced by the browser. The app's Content-Security-Policy
blocks every outbound request except to its own origin, so no document, query, or audit entry can
be exfiltrated even by a bug. Nothing is written to disk at all: closing the app, reloading, or a
5-minute inactivity auto-lock all discard everything in memory, with no way to recover it. A vault
passphrase you set derives an encryption key locally via PBKDF2 — there is no password recovery,
because there is nothing stored to recover it from.

A working sample corpus (a credit agreement, a 10-K, an M&A term sheet, and a Series B preferred
stock agreement — all public or synthetic filings) is preloaded so you can see it work immediately.

Works as an installed app or straight from your browser.
```
(1,802 chars)

## Content rating questionnaire (IARC) — answers to select
| Question | Answer | Why |
|---|---|---|
| Violence | None | — |
| Sexual content | None | — |
| Profanity / crude humor | None | — |
| References to alcohol / drugs / tobacco | None | — |
| Gambling / simulated gambling | None | — |
| User-generated content shared with other users | No | Ingested documents, queries, and the audit log are local/in-memory only — there is no sharing or multi-user surface |
| Shares user's location | No | No location permission requested |
| Digital purchases | No | No paywall, tier, or purchase flow anywhere in the app |

Cleanest of the six apps for this questionnaire — every answer is "None"/"No" with nothing to
flag or hedge on.

## Data safety form — answers to select
**"No data collected"** across every category, and this app has the strongest story of any of the
six: it doesn't just avoid transmitting data, it doesn't persist anything at all. No `localStorage`,
no `sessionStorage`, no IndexedDB — a session's documents, queries, and audit trail exist only in
memory and are gone the moment the tab or app closes, hits its 5-minute inactivity auto-lock, or is
force-closed.

One real network call exists and is worth knowing before you fill out the form: **Google Fonts**
(`fonts.googleapis.com`, `fonts.gstatic.com`) loads for the app's typography, which — like any font
or image request on the web — sends Google the device's IP and user-agent. No document content,
query text, or audit data is in that request. This is the same category of request mood-diner's
data-safety writeup discusses for its Unsplash images: it's network activity, but not the app
*collecting* user data in Play's Data Safety sense, since nothing the app has (or generates) is
attached to it.
