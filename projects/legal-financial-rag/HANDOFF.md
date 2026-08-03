# LexiVault Enterprise Hardened Agent Handoff (`projects/legal-financial-rag`)

## Project Overview
- **App Name:** `legal-financial-rag` (LexiVault Financial RAG)
- **Status:** Enterprise Hardened, fully verified via `node scripts/test-app.mjs legal-financial-rag` (`.\scripts\test-app.ps1 -AppName legal-financial-rag` is a thin wrapper around it).
- **Master Test Command:** `node scripts/test-app.mjs legal-financial-rag`

## Enterprise Hardening Features Implemented
1. **CSP Zero-Exfiltration Headers (`index.html`)**: Meta CSP restriction preventing all outbound network calls (`connect-src 'self' data: blob:`).
2. **PBKDF2 Key Derivation (`encryption.ts`)**: 100,000 PBKDF2 iterations using SHA-256 for passphrase-derived AES-GCM 256-bit keys.
3. **ReDoS-Safe Input Sanitizer & Prompt Injection Shield (`sanitizer.ts`)**: Neutralizes prompt overrides and script vectors.
4. **Blockchain-Style Cryptographic Hash Chaining (`hashChain.ts`)**: Tamper-evident audit log ledger where each entry contains `previousHash`, now also anchored to `GENESIS_HASH` at the oldest entry so a fabricated, internally self-consistent sub-chain can no longer verify as valid (see Recent Changes below).
5. **Inactivity Auto-Lock & Secure Memory Zeroization (`useAutoLock.ts` & `memoryZeroizer.ts`)**: Wipes buffers and locks UI after 5 minutes idle time.
6. **Watermark Overlay (`WatermarkOverlay.tsx`)**: Legal classification watermark across preview cards.

## Recent Changes: Security-Module Test Coverage Hardening
A test-coverage review flagged the five hardening layers above as the thinnest-covered, highest-risk
area in the app — one 374-line happy-path suite (`src/lib/unit.test.ts`) for all of them. Follow-up
work added dedicated per-module test files (`encryption.test.ts`, `sanitizer.test.ts`,
`piiRedactor.test.ts`, `hashChain.test.ts`, alongside the existing `useAutoLock.test.ts`) and found
two real gaps, fixed under the Red -> Green rule (`.agents/AGENTS.md` §5):
- **`piiRedactor.ts`**: the bank/routing regex only matched digits immediately after the label
  ("Account Number: X"); natural prose ("the account number is X") was never redacted. Fixed by
  allowing an optional "is" between the label and the digits.
- **`hashChain.ts`**: `verifyAuditChain` checked per-entry hash integrity and entry-to-entry linkage,
  but never checked that the *earliest* entry anchors to `GENESIS_HASH` — a fabricated sub-chain
  spliced into the client-side store would have verified as "100% verified". Fixed by anchoring the
  oldest entry.

Everything else added is backfilled coverage on code that already worked, proved by mutation
(§5.4) rather than asserted on faith — see the PR body / commit message for the mutation applied
and the assertion it broke, for each of: wrong-key/tampered-ciphertext/wrong-passphrase decryption
rejection, salt round-tripping, distinct-input hashing, the tag-reconstruction XSS bypass
(`java<b>script:</b>`), standalone dangerous URIs with no wrapping tag, the 50,000-char ReDoS
truncation boundary, duplicate-PII placeholder assignment, the SSN `\b` boundary, and audit-chain
reordering/deletion detection.

Known gap left deliberately unaddressed: the prompt-injection regex in `sanitizer.ts` is a fixed
phrase list (e.g. `ignore\s+previous\s+instructions`) and has real false-negative room — a rephrased
injection ("ignore all previous instructions") won't match. Widening that detector is a design
decision (word-list vs. fuzzy matching, false-positive tradeoffs) that wants its own review rather
than a drive-by regex tweak; flagging it here for a follow-up.

## Test & Verification Summary
Executed `node scripts/test-app.mjs legal-financial-rag`:
- **Security Audit:** 0 project-code vulnerabilities (`npm audit` reports 9 pre-existing advisories
  in unrelated eval/AI-SDK tooling deps — advisory, non-blocking)
- **Linting:** ESLint clean (0 errors, 0 warnings)
- **Type Checking:** `tsc --noEmit` clean (0 errors)
- **Unit Tests:** 60/60 Vitest unit tests passed (6 test files)
- **E2E & Accessibility:** 8/8 Playwright tests passed with 0 axe WCAG AA violations
