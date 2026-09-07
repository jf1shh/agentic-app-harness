# LexiVault Financial RAG

A session-only, client-side financial-document retrieval demo. It demonstrates paragraph
chunking, BM25/vector ranking, privilege filters, PII masking, and a chained audit ledger.
Documents and queries are processed locally, with no application telemetry or external fonts.
Use illustrative or non-sensitive documents. Data disappears on reload.

## What is implemented

Four tabs support query excerpts, document ingestion/inspection, PII masking, and audit export.
WebCrypto supplies hashes and session-passphrase verification. Concurrent audit actions are
serialized so their hashes form one chain. The screen lock hides the workspace and clears
the last result; reloading resets the session.

## Security and evidence boundaries

This is **not a persistent encrypted vault**. Documents remain in JavaScript memory; the
passphrase gates the view and does not encrypt the corpus. JavaScript strings cannot be
reliably zeroized. Roles are selectable demo state, not verified identities or authorization.

The SHA-256 ledger detects inconsistent edits, but someone able to rewrite the entire ledger
can recompute its hashes. It is not a digital signature, trusted timestamp, or WORM archive.
The CSP is defense in depth, not a guarantee against same-origin code or browser extensions.
Ranking scores are uncalibrated heuristics, and retrieved text does not establish legal
correctness. PII detection and input filtering need human review and can miss cases.

The four bundled financial samples are illustrative; their claimed provenance has not been
independently verified. Do not cite them as authoritative filings.

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

Vite + React 18 + TypeScript + Zod 3, vanilla CSS obsidian dark palette + glassmorphism. WebCrypto with session memory. BM25 text ranker + cosine vector similarity are implemented in pure TS — **no model download, no telemetry, no third-party API.**

## Privacy and Android release signing

Privacy policy at `public/privacy.html` — published at the Pages URL once built. This app persists nothing to disk at all (no localStorage, sessionStorage, or IndexedDB writes for documents) — every document, query, and audit-log entry lives only in React state for the session and is gone on reload.

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
