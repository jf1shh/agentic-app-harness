# Project Specification: LexiVault Financial RAG (legal-financial-rag)

## 1. Product Overview
**Name:** LexiVault Financial RAG (`legal-financial-rag`)  
**Description:** A 100% local, private, zero-telemetry, security-focused Financial RAG (Retrieval-Augmented Generation) system tailored for lawyers, law firms, financial auditors, and compliance officers. Performs high-precision hybrid document chunking, client-side vector/BM25 retrieval, automated PII/tax ID redaction, AES-GCM local storage encryption, and cryptographically verified audit exports without sending any data to external servers.  
**Target Audience:** Corporate attorneys, M&A lawyers, compliance officers, forensic accountants, and legal researchers who handle confidential financial documents under strict client privilege.

## 2. Core Features
- [ ] **100% Local Ingestion & Smart Chunking**: Parse and chunk financial contracts (10-K filings, M&A agreements, loan covenants, audit reports) into semantic paragraphs with legal clause headers and page markers.
- [ ] **Client-Side Hybrid RAG Search Engine**: Combine TF-IDF/BM25 keyword search with local vector embedding similarity (cosine distance) for zero-latency, 100% private retrieval.
- [ ] **Security & Privilege Control Matrix**: Enforce strict document classification tags (`CONFIDENTIAL`, `ATTORNEY_CLIENT_PRIVILEGE`, `WORK_PRODUCT`, `HIGHLY_RESTRICTED`) and user role permissions during query execution.
- [ ] **Automated PII & Tax ID Redaction Pipeline**: Detect and mask SSNs, Tax IDs/EINs, bank accounts, and sensitive monetary figures with interactive review controls.
- [ ] **Grounded Citation & Clause Explorer**: Natural language query interface with verbatim source citations, snippet highlights, section deep-linking, and confidence scoring.
- [ ] **Cryptographic Audit Log & Verification Export**: Generate SHA-256 verification hashes for query results and export audit-ready evidence packages in PDF/JSON/Markdown.
- [ ] **Pre-loaded Authentic Financial Legal Dataset**: Ready-to-query authentic contracts (Tesla Credit Agreement, Apple 10-K Snippet, Stripe M&A Agreement, BioTech Term Sheet).

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

## 6. Testing & Compliance
- **Unit Tests (Vitest):** Core algorithms in `src/lib/*.test.ts` (Encryption, PII Redaction, Document Chunking, Hybrid Vector RAG Retrieval, Privilege Filtering, Zod Validation).
- **E2E & Accessibility Tests (Playwright):** Standard BDD scenarios in `e2e/rag-flow.spec.ts` evaluating Document Ingestion, Natural Language RAG Queries, PII Masking, and `@axe-core/playwright` WCAG AA checks.
- **Security & Privacy:** 100% local client execution. Zero network requests for search or vector math. AES-GCM encryption at rest.

## 7. Acceptance Criteria
1. The app compiles with zero TypeScript errors under strict mode (`tsc --noEmit`).
2. ESLint checks pass with 0 warnings (`npm run lint`).
3. 100% of Vitest unit tests pass (`npm run test`).
4. Playwright E2E and axe-core accessibility tests pass (`npm run test:e2e`).
5. Harness master script `.\scripts\test-app.ps1 -AppName legal-financial-rag` completes with 0 errors.

## 8. Open Questions & Design Decisions
- None outstanding. All components utilize standard browser APIs (Web Crypto, IndexedDB, Web Workers) to guarantee 100% offline local capability.
