# Project Specification: LexiVault Financial RAG (legal-financial-rag)

## 1. Product Overview
**Name:** LexiVault Financial RAG (`legal-financial-rag`)  
**Description:** A 100% local, private, zero-telemetry, security-focused Financial RAG (Retrieval-Augmented Generation) system tailored for lawyers, law firms, financial auditors, and compliance officers. Performs high-precision hybrid document chunking, client-side vector/BM25 retrieval, automated PII/tax ID redaction, AES-GCM local storage encryption, and cryptographically verified audit exports without sending any data to external servers.  
**Target Audience:** Corporate attorneys, M&A lawyers, compliance officers, forensic accountants, and legal researchers who handle confidential financial documents under strict client privilege.

## 2. Core Features
- [x] **100% Local Ingestion & Smart Chunking**: Parse and chunk financial contracts (10-K filings, M&A agreements, loan covenants, audit reports) into semantic paragraphs with legal clause headers and page markers.
- [x] **Client-Side Hybrid RAG Search Engine**: Combine TF-IDF/BM25 keyword search with local vector embedding similarity (cosine distance) for zero-latency, 100% private retrieval.
- [x] **Security & Privilege Control Matrix**: Enforce strict document classification tags (`CONFIDENTIAL`, `ATTORNEY_CLIENT_PRIVILEGE`, `WORK_PRODUCT`, `PUBLIC_RESTRICTED`, `HIGHLY_RESTRICTED`) and user role permissions during query execution.
- [x] **Automated PII & Tax ID Redaction Pipeline**: Detect and mask SSNs, Tax IDs/EINs, bank accounts, and sensitive monetary figures with interactive review controls.
- [x] **Grounded Citation & Clause Explorer**: Natural language query interface with verbatim source citations, snippet highlights, section deep-linking, and confidence scoring.
- [x] **Cryptographic Audit Log & Verification Export**: Generate SHA-256 verification hashes for query results and export audit-ready evidence packages in PDF/JSON/Markdown.
- [x] **Pre-loaded Authentic Financial Legal Dataset**: Ready-to-query authentic contracts (Tesla Credit Agreement, Apple 10-K Snippet, Stripe M&A Agreement, BioTech Term Sheet).
- [x] **5 Enterprise Defense-in-Depth Security Hardening Layers**: Zero-exfiltration CSP headers, PBKDF2 100,000-iteration key derivation, auto-lock timer, ReDoS/prompt injection shield, and tamper-evident blockchain-style hash chaining.

## 3. Architecture & Tech Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Vanilla CSS (CSS variables, modern obsidian dark palette, glassmorphism, micro-animations)
- **Local Data Persistence:** IndexedDB & LocalStorage with Web Crypto API (AES-GCM 256-bit encryption)
- **RAG & Search Engine:** Client-side BM25 text ranker + Vector Cosine Similarity engine (in-memory & IndexedDB)
- **Testing:** Vitest for unit tests (`src/**/*.test.ts`), Playwright + `@axe-core/playwright` for BDD E2E tests (`e2e/**/*.spec.ts`)
- **Linting & Code Quality:** ESLint (`@typescript-eslint`), Strict TypeScript (`noImplicitAny`, Zod schema inference)

## 4. Data Models (Contract-First via Zod)
All data structures are defined as runtime Zod schemas in `src/lib/schemas.ts`:
- `SecurityPrivilegeLevel`: Enum (`CONFIDENTIAL`, `ATTORNEY_CLIENT_PRIVILEGE`, `WORK_PRODUCT`, `PUBLIC_RESTRICTED`, `HIGHLY_RESTRICTED`)
- `PIIRedactionTag`: Zod object tracking start/end indices, category, original, and redacted text
- `DocumentChunk`: Zod object with chunk ID, doc ID, clause section, page number, text content, redacted text, vector embedding, tokens, and privilege level
- `FinancialDocument`: Zod object tracking title, document type, entity name, file size, timestamp, privilege level, SHA-256 hash, and encryption status
- `RAGQuery`: Zod object tracking query text, privilege filters, hybrid weighting, and timestamp
- `RAGCitation`: Zod object containing grounding snippet, document metadata, section title, score, and match type
- `RAGResponse`: Zod object containing answer text, array of citations, execution time, confidence score, and SHA-256 audit hash
- `AuditLogEntry`: Zod object tracking user role, timestamp, action type, hash, and metadata

## 5. UI/UX Design System
- **Color Palette:**
  - Background: Obsidian Dark (`#0B0F17`, `#111827`)
  - Accent / Primary: Muted Legal Gold / Amber (`#D97706`, `#B45309`) & Emerald Security (`#047857`, `#059669`)
  - Surface Card: Slate Dark (`#1E293B`) with glassmorphism backdrop filters
  - Text: Primary (`#F8FAFC`), Secondary (`#94A3B8`), High contrast AA compliance
- **Typography:** Modern clean sans-serif (`Inter`, system fallback) with crisp monospace for legal clause codes (`JetBrains Mono`, `Consolas`)
- **Micro-interactions:** Smooth tab transitions, card hover glows, interactive privilege badge toggles, copy-to-clipboard feedback, redaction hover reveals.

### 5.1 Main tab navigation — full ARIA, not just tablist/tab
The header's four-tab navigation (`role="tablist"` in `Header.tsx`) already carried `role="tab"` and
`aria-selected` — ahead of where `mood-diner`'s detail-view tabs started (see that app's spec §4.3). What
was still missing, brought up to the same standard:
- Each tab carries `aria-controls` pointing at the `id` of the panel it governs; each of the four content
  regions in `App.tsx` (`QueryWorkbench`, `DocumentManager`, `PIIRedactionPanel`, `AuditLogView`) is wrapped
  in `role="tabpanel"` with a matching `id` and `aria-labelledby` pointing back at its tab.
- Arrow-key roving `tabindex` between tabs — only the active tab sits in the natural tab order at any time,
  per the standard tabs pattern.

**Acceptance criteria (BDD).**
- *Given* a tab has focus, *When* the right or left arrow key is pressed, *Then* focus moves to the next or
  previous tab and that tab activates.
- *Given* any tab is active, *When* the page is audited, *Then* `@axe-core/playwright` reports no violations
  on the tab region.

### 5.2 Vault-lock copy must say why it locked, not just that it locked
`handleLockVault` in `App.tsx` is invoked from two different triggers — the idle-timeout fired by
`useAutoLock` after 5 minutes, and the user clicking "Lock Vault" in the header — and until this revision
both paths produced the identical modal copy: *"Workstation auto-locked due to inactivity."* That sentence
is simply false on the manual path, and every existing E2E scenario exercises only the manual button, so
the mismatch had no test surface catching it. The app now threads a `lockReason: 'idle' | 'manual'` from
the trigger site through to `VaultLockModal`, and both the modal copy and the audit-log entry's `details`
text say which one actually happened.

Testing the idle path surfaced a second, more consequential bug in the same wiring: `useAutoLock` was
given an inline arrow function every render (`() => { handleLockVault('idle'); }`), and `useAutoLock`
resets its idle timer whenever the callback identity it receives changes. An inline arrow is a new
identity on every render, so **any** App re-render — switching tabs, ingesting a document, running a
query — silently reset the 5-minute countdown regardless of whether the user had touched the mouse or
keyboard, undermining the auto-lock guarantee §8.3 advertises. Fixed by giving `useAutoLock` a
referentially stable callback (a `useRef`-backed wrapper) so only real activity events — the ones
`useAutoLock` itself already listens for — reset the timer.

**Acceptance criteria (BDD).**
- *Given* the vault is locked by clicking "Lock Vault," *When* the modal appears, *Then* its copy attributes
  the lock to the user's action, not to inactivity.
- *Given* the vault auto-locks after 5 minutes of inactivity, *When* the modal appears, *Then* its copy
  attributes the lock to inactivity.

### 5.3 Watermark overflow — already fixed, recorded here so it isn't rediscovered
`WatermarkOverlay` is an absolutely-positioned, `rotate(-25deg)` full-bleed label at `opacity: 0.04` — its
*rendered* (post-transform) bounding box is wider than any narrow viewport, which silently made the whole
page horizontally scrollable despite being nearly invisible (the mechanism is documented in
`.agents/AGENTS.md` §6, "A Sweep for 'Mobile Formatting Is Weird'..."). `.app-container` already carries
`overflow-x: hidden` with a comment explaining why — this section exists so a future pass doesn't spend
time rediscovering a bug that's already fixed.

## 6. Testing & Compliance
- **Unit Tests (Vitest):** Core algorithms in `src/lib/unit.test.ts` (Encryption, PII Redaction, Document Chunking, Hybrid Vector RAG Retrieval, Privilege Filtering, Zod Validation, Hash Chaining, ReDoS Sanitization).
- **E2E & Accessibility Tests (Playwright):** Standard BDD scenarios in `e2e/rag-flow.spec.ts` evaluating Document Ingestion, Natural Language RAG Queries, PII Masking, Hash Chain Verification, Vault Lock/Unlock, and `@axe-core/playwright` WCAG AA checks.
- **Security & Privacy:** 100% local client execution. Zero network requests for search or vector math. AES-GCM encryption at rest.

## 7. Acceptance Criteria
1. The app compiles with zero TypeScript errors under strict mode (`tsc --noEmit`).
2. ESLint checks pass with 0 warnings (`npm run lint`).
3. 100% of Vitest unit tests pass (`npm run test`).
4. Playwright E2E and axe-core accessibility tests pass (`npm run test:e2e`).
5. Harness master script `.\scripts\test-app.ps1 -AppName legal-financial-rag` completes with 0 errors.

## 8. Enterprise Security Hardening Layers
1. **CSP Zero-Exfiltration**: Meta CSP restriction preventing all outbound network calls (`connect-src 'self' data: blob:`).
2. **PBKDF2 Key Derivation**: 100,000 PBKDF2 iterations using SHA-256 for passphrase-derived AES-GCM 256-bit keys.
3. **Inactivity Auto-Lock & Memory Zeroization**: Auto-locks after 5 minutes of idle time and overwrites byte buffers in RAM.
4. **ReDoS & Prompt Injection Shield**: Input sanitizer neutralizing XSS script vectors and prompt override instructions.
5. **Tamper-Evident Hash Chaining**: Blockchain-style SHA-256 audit logging where each entry references `previousHash`.

## 9. Open Questions & Design Decisions
- None outstanding. All components utilize standard browser APIs (Web Crypto, IndexedDB, LocalStorage) to guarantee 100% offline local capability.
