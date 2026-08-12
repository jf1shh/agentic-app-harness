import { describe, it, expect } from 'vitest';
import { chunkDocument, generateSimpleEmbedding, tokenizeText } from './chunker';

// unit.test.ts's "Document Chunker & Section Preservation" section chunks a
// two-page, two-section document and only ever checks chunks[0] -- never the
// second chunk's page number, section title, or id. Mutation testing (node
// scripts/run-mutation.mjs legal-financial-rag --mutate
// "src/lib/rag/chunker.ts") found this file at 52%, with most of the real
// (non-prose) survivors on exactly that: state that updates correctly but
// whose updated value was never actually checked.

const baseMeta = {
  documentId: 'doc-1',
  documentTitle: 'Credit Agreement',
  entityName: 'Test Corp',
  documentType: 'CREDIT_AGREEMENT' as const,
  privilegeLevel: 'CONFIDENTIAL' as const,
};

describe('chunkDocument — multi-chunk state (page, section, id)', () => {
  // Regression test for a real bug this suite caught: the loop used to update
  // currentPage/currentSectionTitle from a paragraph's markers BEFORE deciding
  // whether to flush the buffer built from EARLIER paragraphs, so a chunk
  // whose content was entirely page-1/Section-4.02 text got stamped "page 2,
  // Section 6.08" -- the metadata belonging to the paragraph that triggered
  // the flush, not to its own content. Fixed by flushing first, then reading
  // the new paragraph's markers. In a legal/financial RAG tool whose citations
  // point a reader to a specific page and section, this mislabeled every
  // non-final chunk of every multi-chunk document.
  it('Given a document with two pages and two sections, When chunked, Then each chunk is stamped with the page and section its OWN content came from, not the one that triggered the next split', () => {
    const text =
      '[Page 1]\nSection 4.02 Debt Covenants.\nBorrower shall maintain leverage ratio below 3.25.\n\n[Page 2]\nSection 6.08 Events of Default.\nFailure to maintain liquidity triggers default.';

    const chunks = chunkDocument(text, { ...baseMeta, maxChunkSize: 100 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]!.id).toBe('chk-doc-1-1');
    expect(chunks[0]!.content).toContain('4.02');
    expect(chunks[0]!.pageNumber).toBe(1);
    expect(chunks[0]!.sectionTitle).toContain('4.02');
    expect(chunks[1]!.id).toBe('chk-doc-1-2');
    expect(chunks[1]!.content).toContain('6.08');
    expect(chunks[1]!.pageNumber).toBe(2);
    expect(chunks[1]!.sectionTitle).toContain('6.08');
  });

  it('Given every chunk produced, When inspected, Then each carries the entity name and document type passed in, not defaults or leftovers', () => {
    const text = '[Page 1]\nSection 1.01 Definitions.\nTerms as defined herein.';
    const chunks = chunkDocument(text, { ...baseMeta, entityName: 'Acme Holdings', documentType: 'LOAN_COVENANT' });

    expect(chunks[0]!.metadata.entityName).toBe('Acme Holdings');
    expect(chunks[0]!.metadata.documentType).toBe('LOAN_COVENANT');
  });
});

describe('chunkDocument — page marker formats', () => {
  it('Given the "--- Page N ---" marker format rather than "[Page N]", When chunked, Then the page number is still tracked', () => {
    const text = '--- Page 3 ---\nSection 2.01 Purchase Price.\nThe aggregate purchase price is set forth in Schedule A.';
    const chunks = chunkDocument(text, baseMeta);
    expect(chunks[0]!.pageNumber).toBe(3);
  });

  it('Given no page marker at all, When chunked, Then the page number defaults to 1 rather than being left undefined', () => {
    const text = 'Section 1.01 Definitions.\nTerms as defined herein.';
    const chunks = chunkDocument(text, baseMeta);
    expect(chunks[0]!.pageNumber).toBe(1);
  });
});

describe('chunkDocument — maxChunkSize default', () => {
  it('Given no maxChunkSize option, When a document under 600 characters is chunked, Then it stays as a single chunk', () => {
    const text = 'Section 1.01 Definitions.\nA short paragraph well under the default cap.';
    const chunks = chunkDocument(text, baseMeta);
    expect(chunks.length).toBe(1);
  });
});

describe('chunkDocument — long section header truncation', () => {
  it('Given a clause header longer than 80 characters, When chunked, Then the stored section title is truncated to 80 characters', () => {
    const longHeader = `Section 9.01 ${'Extremely Verbose Legal Clause Title '.repeat(3)}`.trim();
    const text = `${longHeader}\nThe substantive text of this clause follows here.`;
    const chunks = chunkDocument(text, baseMeta);
    expect(chunks[0]!.sectionTitle.length).toBeLessThanOrEqual(80);
    expect(longHeader.length).toBeGreaterThan(80); // sanity: the fixture must actually be long enough
  });
});

describe('tokenizeText — word-length boundary', () => {
  it('Given words of exactly 2 and exactly 3 characters, When tokenized, Then only the 3-character word survives the filter', () => {
    const tokens = tokenizeText('an the cat sat');
    expect(tokens).not.toContain('an');
    expect(tokens).toContain('the');
    expect(tokens).toContain('cat');
    expect(tokens).toContain('sat');
  });
});

describe('generateSimpleEmbedding — degenerate input', () => {
  it('Given text with no alphanumeric characters at all, When embedded, Then it returns a zero vector rather than dividing by zero into NaN or Infinity', () => {
    const embedding = generateSimpleEmbedding('!!! --- ...');
    expect(embedding.every((v) => Number.isFinite(v))).toBe(true);
    expect(embedding.every((v) => v === 0)).toBe(true);
  });
});
