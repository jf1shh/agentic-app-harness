import { describe, it, expect } from 'vitest';
import {
  SecurityPrivilegeLevelSchema,
  PIIRedactionTagSchema,
  DocumentChunkSchema,
  FinancialDocumentSchema,
  RAGQuerySchema,
  RAGCitationSchema,
  RAGResponseSchema,
  AuditLogEntrySchema,
} from './schemas';

// unit.test.ts's "Zod Schema Validation & Data Contracts" section only ever
// exercised 2 of SecurityPrivilegeLevelSchema's 5 members and asserted that
// DocumentChunkSchema does not throw on one valid object -- mutation testing
// (node scripts/run-mutation.mjs legal-financial-rag) found this file at
// 4.7%, the worst ratio in the whole repo-wide sweep: 61 of 64 mutants
// survived because nothing else in the suite parses these contracts at all.
// These are the schemas guarding every piece of untrusted data this
// client-side app parses (imported documents, PII tags, audit entries), so
// the "contract-first" validation this repo requires (.agents/AGENTS.md §1)
// was, for this file, unenforced by any test.

describe('SecurityPrivilegeLevelSchema', () => {
  it.each([
    'CONFIDENTIAL',
    'ATTORNEY_CLIENT_PRIVILEGE',
    'WORK_PRODUCT',
    'PUBLIC_RESTRICTED',
    'HIGHLY_RESTRICTED',
  ])('Given the privilege level "%s", When it is parsed, Then it is accepted', (level) => {
    expect(SecurityPrivilegeLevelSchema.parse(level)).toBe(level);
  });

  it('Given a string outside the declared levels, When it is parsed, Then it is rejected', () => {
    expect(() => SecurityPrivilegeLevelSchema.parse('TOP_SECRET')).toThrow();
  });
});

describe('PIIRedactionTagSchema', () => {
  function validTag(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'tag-ssn-1',
      type: 'SSN',
      originalText: '453-92-1084',
      redactedPlaceholder: '[REDACTED_SSN_1]',
      startIndex: 0,
      endIndex: 11,
      confidence: 0.99,
      ...overrides,
    };
  }

  it.each(['SSN', 'TAX_ID', 'BANK_ACCOUNT', 'MONETARY_THRESHOLD', 'EMAIL', 'ADDRESS'])(
    'Given the PII type "%s", When a tag carrying it is parsed, Then it is accepted',
    (type) => {
      expect(() => PIIRedactionTagSchema.parse(validTag({ type }))).not.toThrow();
    },
  );

  it('Given a PII type outside the declared set, When it is parsed, Then it is rejected', () => {
    expect(() => PIIRedactionTagSchema.parse(validTag({ type: 'PASSPORT' }))).toThrow();
  });

  it.each([0, 1, 0.5])(
    'Given confidence %s, which is within the declared 0-1 range, When parsed, Then it is accepted',
    (confidence) => {
      expect(() => PIIRedactionTagSchema.parse(validTag({ confidence }))).not.toThrow();
    },
  );

  it.each([-0.01, 1.01])(
    'Given confidence %s, which is outside the declared 0-1 range, When parsed, Then it is rejected',
    (confidence) => {
      expect(() => PIIRedactionTagSchema.parse(validTag({ confidence }))).toThrow();
    },
  );

  it('Given a tag with isMasked omitted, When it is parsed, Then it defaults to true', () => {
    const { isMasked, ...withoutIsMasked } = validTag() as Record<string, unknown> & { isMasked?: boolean };
    void isMasked;
    const parsed = PIIRedactionTagSchema.parse(withoutIsMasked);
    expect(parsed.isMasked).toBe(true);
  });
});

describe('DocumentChunkSchema', () => {
  function validChunk() {
    return {
      id: 'chk-101',
      documentId: 'doc-1',
      documentTitle: 'Test Agreement',
      sectionTitle: 'Section 1.01',
      pageNumber: 1,
      content: 'Test content paragraph',
      redactedContent: 'Test content paragraph',
      embedding: [0.1, 0.2, 0.3],
      tokens: ['test', 'content'],
      privilegeLevel: 'CONFIDENTIAL' as const,
      metadata: { entityName: 'Test Corp', documentType: 'CREDIT_AGREEMENT' },
    };
  }

  it('Given a chunk missing a required field, When it is parsed, Then it is rejected rather than silently accepted with a hole', () => {
    const { sectionTitle, ...incomplete } = validChunk();
    void sectionTitle;
    expect(() => DocumentChunkSchema.parse(incomplete)).toThrow();
  });

  it('Given a chunk whose embedding is not an array of numbers, When it is parsed, Then it is rejected', () => {
    expect(() =>
      DocumentChunkSchema.parse({ ...validChunk(), embedding: ['not', 'numbers'] }),
    ).toThrow();
  });

  it('Given metadata with no optional "period" entered, When it is parsed, Then the chunk is still accepted', () => {
    const chunk = validChunk();
    expect(() => DocumentChunkSchema.parse(chunk)).not.toThrow();
    expect(chunk.metadata).not.toHaveProperty('period');
  });

  it('Given metadata with a "period" entered, When it is parsed, Then it is preserved', () => {
    const chunk = { ...validChunk(), metadata: { ...validChunk().metadata, period: 'FY2025 Q3' } };
    const parsed = DocumentChunkSchema.parse(chunk);
    expect(parsed.metadata.period).toBe('FY2025 Q3');
  });
});

describe('FinancialDocumentSchema', () => {
  function validDocument(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'doc-1',
      title: 'Q3 Credit Agreement',
      documentType: '10K_FILING',
      entityName: 'Test Corp',
      fileSize: 204800,
      uploadTimestamp: '2026-01-01T00:00:00Z',
      privilegeLevel: 'CONFIDENTIAL',
      chunksCount: 12,
      status: 'INDEXED',
      sha256Hash: 'a'.repeat(64),
      content: 'Full document text',
      ...overrides,
    };
  }

  it.each(['10K_FILING', 'CREDIT_AGREEMENT', 'MA_CONTRACT', 'AUDIT_REPORT', 'TAX_RETURN', 'LOAN_COVENANT'])(
    'Given the document type "%s", When parsed, Then it is accepted',
    (documentType) => {
      expect(() => FinancialDocumentSchema.parse(validDocument({ documentType }))).not.toThrow();
    },
  );

  it.each(['INDEXED', 'ENCRYPTED', 'REDACTED'])(
    'Given the status "%s", When parsed, Then it is accepted',
    (status) => {
      expect(() => FinancialDocumentSchema.parse(validDocument({ status }))).not.toThrow();
    },
  );

  it('Given a document type outside the declared set, When it is parsed, Then it is rejected', () => {
    expect(() =>
      FinancialDocumentSchema.parse(validDocument({ documentType: 'MEMO' })),
    ).toThrow();
  });

  it('Given a document with isSample omitted, When it is parsed, Then it defaults to false', () => {
    const doc = validDocument() as Record<string, unknown> & { isSample?: boolean };
    delete doc.isSample;
    const parsed = FinancialDocumentSchema.parse(doc);
    expect(parsed.isSample).toBe(false);
  });
});

describe('RAGQuerySchema', () => {
  function validQuery(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'q-1',
      queryText: 'What is the leverage covenant?',
      timestamp: '2026-01-01T00:00:00Z',
      privilegeFilter: ['CONFIDENTIAL'],
      topK: 5,
      hybridWeight: 0.5,
      status: 'SUCCESS',
      ...overrides,
    };
  }

  it.each([1, 20])(
    'Given topK of %s, at the boundary of the declared 1-20 range, When parsed, Then it is accepted',
    (topK) => {
      expect(() => RAGQuerySchema.parse(validQuery({ topK }))).not.toThrow();
    },
  );

  it.each([0, 21])(
    'Given topK of %s, outside the declared 1-20 range, When parsed, Then it is rejected',
    (topK) => {
      expect(() => RAGQuerySchema.parse(validQuery({ topK }))).toThrow();
    },
  );

  it.each([0, 1])(
    'Given hybridWeight of %s, at the boundary of the declared 0-1 range, When parsed, Then it is accepted',
    (hybridWeight) => {
      expect(() => RAGQuerySchema.parse(validQuery({ hybridWeight }))).not.toThrow();
    },
  );

  it.each([-0.01, 1.01])(
    'Given hybridWeight of %s, outside the declared 0-1 range, When parsed, Then it is rejected',
    (hybridWeight) => {
      expect(() => RAGQuerySchema.parse(validQuery({ hybridWeight }))).toThrow();
    },
  );

  it.each(['SUCCESS', 'NO_MATCH', 'RESTRICTED_ACCESS'])(
    'Given the status "%s", When parsed, Then it is accepted',
    (status) => {
      expect(() => RAGQuerySchema.parse(validQuery({ status }))).not.toThrow();
    },
  );
});

describe('RAGCitationSchema and RAGResponseSchema', () => {
  function validCitation(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      chunkId: 'chk-1',
      documentId: 'doc-1',
      documentTitle: 'Test Agreement',
      sectionTitle: 'Section 1.01',
      pageNumber: 1,
      snippet: 'The covenant requires...',
      score: 0.87,
      matchType: 'HYBRID',
      privilegeLevel: 'CONFIDENTIAL',
      ...overrides,
    };
  }

  it.each(['VECTOR', 'KEYWORD', 'HYBRID'])(
    'Given the match type "%s", When a citation carrying it is parsed, Then it is accepted',
    (matchType) => {
      expect(() => RAGCitationSchema.parse(validCitation({ matchType }))).not.toThrow();
    },
  );

  it('Given a match type outside the declared set, When it is parsed, Then it is rejected', () => {
    expect(() => RAGCitationSchema.parse(validCitation({ matchType: 'FUZZY' }))).toThrow();
  });

  it('Given a response carrying citations, When it is parsed, Then the nested citation contract is enforced too', () => {
    const invalidResponse = {
      id: 'r-1',
      queryId: 'q-1',
      queryText: 'What is the leverage covenant?',
      answerText: 'The covenant requires a 3.25x maximum.',
      citations: [validCitation({ matchType: 'NOT_A_TYPE' })],
      executionTimeMs: 120,
      tokenCount: 340,
      confidenceScore: 0.9,
      securityAuditHash: 'a'.repeat(64),
      piiRedactionCount: 0,
    };
    expect(() => RAGResponseSchema.parse(invalidResponse)).toThrow();
  });
});

describe('AuditLogEntrySchema', () => {
  function validEntry(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'audit-1',
      timestamp: '2026-01-01T00:00:00Z',
      action: 'DOCUMENT_UPLOAD',
      userRole: 'LEGAL_COUNSEL',
      details: 'Uploaded credit agreement',
      hash: 'a'.repeat(64),
      ...overrides,
    };
  }

  it.each([
    'DOCUMENT_UPLOAD',
    'DOCUMENT_INDEXED',
    'QUERY_EXECUTED',
    'PII_REDACTED',
    'PII_UNMASKED',
    'EXPORT_AUDIT',
    'KEY_GENERATION',
    'VAULT_LOCKED',
    'VAULT_UNLOCKED',
  ])('Given the action "%s", When parsed, Then it is accepted', (action) => {
    expect(() => AuditLogEntrySchema.parse(validEntry({ action }))).not.toThrow();
  });

  it.each(['MANAGING_PARTNER', 'LEGAL_COUNSEL', 'FINANCIAL_AUDITOR', 'PARALEGAL'])(
    'Given the user role "%s", When parsed, Then it is accepted',
    (userRole) => {
      expect(() => AuditLogEntrySchema.parse(validEntry({ userRole }))).not.toThrow();
    },
  );

  it('Given an action outside the declared set, When it is parsed, Then it is rejected', () => {
    expect(() => AuditLogEntrySchema.parse(validEntry({ action: 'DOCUMENT_DELETED' }))).toThrow();
  });

  // The genesis hash is the whole point of the tamper-evident chain
  // (.agents/AGENTS.md's hash-chain lesson): the first entry has no real
  // predecessor, so it must default to this exact, recognizable sentinel
  // rather than an empty string or null, which a chain verifier could
  // mistake for "not yet computed."
  it('Given the first entry in a chain, with previousHash omitted, When it is parsed, Then it defaults to the exact genesis sentinel', () => {
    const entry = validEntry() as Record<string, unknown> & { previousHash?: string };
    delete entry.previousHash;
    const parsed = AuditLogEntrySchema.parse(entry);
    expect(parsed.previousHash).toBe('GENESIS_BLOCK_00000000000000000000000000000000');
  });
});
