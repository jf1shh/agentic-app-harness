# LexiVault Financial RAG (`legal-financial-rag`)

A 100% client-side, zero-exfiltration financial RAG (Retrieval-Augmented Generation) and legal compliance engine for lawyers, law firms, corporate counsel, and financial auditors. Documents, queries, and audit logs never leave the device — the CSP's `connect-src 'self' data: blob:` makes that a browser-enforced guarantee, not just a design intent. The work happens in WebCrypto and IndexedDB. Ships as a static web app and as a Capacitor Android WebView wrapper. (The UI does load Google Fonts over the network for typography — no document or query content is in that request, but it means the page isn't fully offline-first on a fresh visit; see `index.html`.)

> Spec: [`specs/legal-financial-rag-spec.md`](../../specs/legal-financial-rag-spec.md) — the single source of truth.
>
> Live: <https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/>

---

## What the app actually does (`src/App.tsx`)

Four tabs:

1. **Query** — `QueryWorkbench` runs hybrid BM25 + cosine vector similarity against the in-memory chunk corpus, prefixed by a privilege filter (`SecurityPrivilegeLevel[]`), then returns an `RAGResponse` with `RAGCitation[]`.
2. **Documents** — `DocumentManager` lists `FinancialDocument[]`, accepts new uploads, and re-indexes them into `DocumentChunk[]`.
3. **Redaction** — `PIIRedactionPanel` walks every `DocumentChunk` for `PIIRedactionTag`s of type `SSN | TAX_ID | BANK_ACCOUNT | MONETARY_THRESHOLD | EMAIL | ADDRESS`, with a confidence and `isMasked` toggle per tag.
4. **Audit** — `AuditLogView` shows the chained `AuditLogEntry[]` ledger and the SHA-256 hash of the last `RAGResponse`.

Every externally-facing tab is wrapped in `<WatermarkOverlay>` rendering `CONFIDENTIAL & ATTORNEY-CLIENT PRIVILEGED - LEXIVAULT HARDENED`, and the document preview surface is also watermarked.

### Pre-loaded authentic sample corpus
`src/lib/datasets/authenticSampleDocs.ts` ships 4 real filings ready to query against `chunkDocument()`:

| ID | Entity | Filing type |
|---|---|---|
| `doc-tesla-credit-2024` | Tesla Inc. | Credit & Guarantee Agreement (Oct 2024) |
| `doc-apple-10k-2024` | Apple Inc. | Form 10-K (Note 14 / Risk Disclosures) |
| `doc-stripe-ma-2024` | Stripe Inc. | M&A Asset Purchase Agreement |
| `doc-biotech-seriesb-2024` | Aura BioTech Inc. | Series B Preferred Stock Term Sheet |

On first render, every sample is chunked into legal-clause-aware segments (see `src/lib/rag/chunker.ts`), and a `GENESIS_BLOCK_…` `AuditLogEntry` is created so the chain starts from a known anchor.

### Five defense-in-depth hardening layers

These are the five lines of defense per the spec:

1. **Zero-exfiltration CSP** (`<meta http-equiv="Content-Security-Policy">`) — `connect-src 'self' data: blob:` blocks all outbound HTTP/WebSocket calls, including extensions.
2. **PBKDF2 key derivation** — 100,000 iterations, SHA-256, with a fresh `Uint8Array` salt (per the cross-platform `subtle.deriveKey` lesson in `.agents/AGENTS.md` §6). The derived AES-GCM 256-bit key never leaves memory.
3. **Inactivity auto-lock + memory zeroization** — `src/lib/hooks/useAutoLock.ts` triggers `handleLockVault()` after 5 min of idle, which appends a `VAULT_LOCKED` audit entry, overwrites sensitive byte buffers in `lastResponse` via `wipeSensitiveState`, and re-renders the `<VaultLockModal>` until the user re-derives a key. `beforeunload` runs the same wipe.
4. **ReDoS / prompt-injection shield** — `src/lib/security/sanitizer.ts` neutralizes script vectors, XSS, ReDoS payloads, and override prompts in both query text and ingested documents before they reach the chunker or the ranker.
5. **Tamper-evident hash chaining** — `src/lib/security/hashChain.ts` signs each `AuditLogEntry` with `SHA-256({ previousHash, ...payload })`. Modifying any past entry breaks every later `hash`, so any `EXPORT_AUDIT` packet is verifiable before use.

The visual confidentiality watermark overlay is a **separate UI feature**, not part of the hardening count.


### Crash recovery (`src/components/ErrorBoundary.tsx`)

A top-level class error boundary (`.agents/AGENTS.md` §12) wraps the root `<App />` in
`src/main.tsx`. Without it, a throw during render unmounts the whole tree and leaves a blank page —
indistinguishable, on an installed Android build, from a broken install. The fallback shows fixed
copy and a reload button.

The boundary deliberately **does not render the error**: `error.message` and a component stack can
quote the user data the app was holding when it crashed, so details go to `console.error` (on-device,
never off it) and never into the DOM. `ErrorBoundary.test.tsx` asserts exactly that, by throwing a
message containing a marker string and checking the marker never reaches the rendered output.

## Architecture

```
src/
  App.tsx                              # tab router, vault lock state, watermark
  components/
    Header.tsx, QueryWorkbench.tsx, DocumentManager.tsx,
    PIIRedactionPanel.tsx, AuditLogView.tsx,
    VaultLockModal.tsx, WatermarkOverlay.tsx
  lib/
    datasets/authenticSampleDocs.ts    # the 4 pre-loaded filings
    rag/chunker.ts, queryProcessor.ts, vectorEngine.ts
    security/encryption.ts, hashChain.ts, memoryZeroizer.ts,
            piiRedactor.ts, sanitizer.ts
    hooks/useAutoLock.ts               # 5-minute auto-lock timer
    export/auditExporter.ts            # PDF/JSON/Markdown export of the chain
    schemas.ts                         # Zod contracts for every domain object
    unit.test.ts                       # Vitest unit coverage
public/
  shield.svg                           # brand mark
  privacy.html                         # Play Store privacy policy
android/                               # Capacitor-generated native container
capacitor.config.ts
```

## Tech stack

Vite + React 18 + TypeScript + Zod 3, vanilla CSS obsidian dark palette + glassmorphism. WebCrypto + IndexedDB. BM25 text ranker + cosine vector similarity are implemented in pure TS — **no model download, no telemetry, no third-party API.**

## Privacy and Android release signing

Privacy policy at `public/privacy.html` — published at the Pages URL once built. This app persists nothing to disk at all (no `localStorage`, no `sessionStorage`, no IndexedDB writes in production code, despite the "WebCrypto and IndexedDB" framing above describing the app's architecture in general terms) — every document, query, and audit-log entry lives only in React state for the session and is gone on reload.

Play only accepts an App Bundle signed with an upload key. `android/app/build.gradle` reads credentials from environment first, then from a git-ignored `android/keystore.properties`. **Neither the keystore nor its passwords are ever committed** — `*.jks`, `*.keystore`, and `keystore.properties` are in `android/.gitignore`.

### Required env vars (native only — not needed for web preview)

| Variable | Meaning |
|---|---|
| `ANDROID_KEYSTORE_FILE` | Absolute path to the decoded keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (`upload` by convention) |
| `ANDROID_KEY_PASSWORD` | Key password |

Missing any of the four leaves the build **unsigned** (warning) rather than failing, so `assembleRelease` still works for local smoke checks — but an unsigned artifact cannot be uploaded to Play.

Unlike the Next.js apps in this repo, this app ships **one** bundle to both origins — Vite's `base: './'` (relative, in `vite.config.ts`) resolves correctly whether the bundle is served under the GitHub Pages subpath or at the WebView's `https://localhost/` root, so there is no dual-export split here.

## Development

```bash
cd projects/legal-financial-rag
npm install
npm run dev              # vite dev server (port 3009)
npm run build            # clean + tsc + vite build → dist/
npm run lint
npm run test             # Vitest unit (encryption, PII redaction, chunking,
                         # RAG retrieval, privilege filtering, hash chain, sanitizer)
npm run test:e2e         # Playwright BDD + axe a11y
npm run eval             # promptfoo eval against docs in eval/
npx cap sync android      # after npm run build, sync dist/ into the native project
```

## Verification

```bash
node scripts/test-app.mjs legal-financial-rag   # full harness gate
```
