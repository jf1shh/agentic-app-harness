# LexiVault - Enterprise Hardened Local Financial RAG (`legal-financial-rag`)

LexiVault is a 100% client-side, zero-telemetry financial RAG (Retrieval-Augmented Generation) and legal compliance engine tailored for lawyers, law firms, corporate counsel, and financial auditors.

## 🛡️ Enterprise Defense-in-Depth Hardening Layers
1. **Zero-Exfiltration Content Security Policy (CSP)**: Meta CSP enforcing `connect-src 'self' data: blob:` to block all outbound HTTP/WebSocket network calls and prevent data exfiltration by browser extensions.
2. **PBKDF2 Key Derivation (100,000 Iterations)**: AES-256 GCM key derivation using PBKDF2 with SHA-256 and cryptographic salts from user Vault Passphrases.
3. **Inactivity Auto-Lock Timer & In-Memory Zeroization**: Auto-locks after 5 minutes of idle inactivity, wiping byte buffers (`Uint8Array.fill(0)`) and state strings in memory.
4. **ReDoS-Safe Input Sanitizer & Prompt Injection Shield**: Protects query inputs and ingested documents from script vectors, XSS, ReDoS payloads, and prompt override instructions.
5. **Cryptographic Blockchain-Style Hash Chaining**: Every `AuditLogEntry` is chained to the previous entry's SHA-256 hash stamp. Modifying or deleting any past audit entry invalidates the entire chain.
6. **Legal Classification Watermarks**: Overlay watermark (`CONFIDENTIAL & ATTORNEY-CLIENT PRIVILEGED`) across document previews and compliance report exports.

## 🧪 Verification & Testing
Passed master harness verification suite: `.\scripts\test-app.ps1 -AppName legal-financial-rag`
- **Security Audit**: 0 vulnerabilities (`npm audit`)
- **Linting & Code Quality**: 0 errors/warnings (`eslint`)
- **Type Checking**: 0 errors (`tsc --noEmit`)
- **Unit Testing**: 19/19 tests passed (`vitest`)
- **E2E & Accessibility**: 7/7 BDD tests passed (`@playwright/test` + `@axe-core/playwright` WCAG AA 0 violations)
