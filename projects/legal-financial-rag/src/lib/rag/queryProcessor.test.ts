import { describe, it, expect } from 'vitest';
import { processRAGQuery } from './queryProcessor';
import { chunkDocument } from './chunker';
import type { DocumentChunk } from '../schemas';

// unit.test.ts's "RAG Query Processor & Audit Exporter" section only ever
// exercised the happy path (citations found, confidence never near its cap).
// Mutation testing (node scripts/run-mutation.mjs legal-financial-rag --mutate
// "src/lib/rag/queryProcessor.ts") found this file at 18.6%, including the
// entire `citations.length === 0` branch at NoCoverage -- the "no results"
// answer, the one every family/lawyer sees on a query that doesn't match
// anything, had never been exercised by any test at all.

const baseMeta = {
  documentId: 'd1',
  documentTitle: 'Credit Agreement',
  entityName: 'Test Corp',
  documentType: 'CREDIT_AGREEMENT' as const,
  privilegeLevel: 'CONFIDENTIAL' as const,
};

describe('processRAGQuery — no citations found', () => {
  it('Given a corpus with no chunks at all, When a query is processed, Then it reports zero grounded matches with a low confidence score rather than fabricating an answer', async () => {
    const response = await processRAGQuery({
      queryText: 'What is the leverage covenant?',
      chunks: [],
      allowedPrivilegeLevels: ['CONFIDENTIAL'],
    });

    expect(response.citations).toEqual([]);
    expect(response.answerText).toContain('No grounded legal clauses or financial disclosures were retrieved');
    expect(response.answerText).toContain('What is the leverage covenant?');
    expect(response.answerText).toContain('CONFIDENTIAL');
    expect(response.confidenceScore).toBe(0.1);
    expect(response.piiRedactionCount).toBe(0);
  });
});

describe('processRAGQuery — confidence score', () => {
  it('Given a citation whose score plus the 0.25 boost would exceed 0.98, When the query is processed, Then confidence is clamped at 0.98 rather than reported over-confident', async () => {
    // Verified empirically: this content/query pair produces a top citation
    // score of 0.76, which would be 1.01 unclamped -- above 1.0, an
    // impossible confidence value to report at all.
    const content =
      'The leverage covenant requires a maximum Consolidated Total Leverage Ratio of 3.25x EBITDA under Section 5.02.';
    const chunks = chunkDocument(content, baseMeta);

    const response = await processRAGQuery({
      queryText: 'leverage covenant maximum Consolidated Total Leverage Ratio EBITDA',
      chunks,
      allowedPrivilegeLevels: ['CONFIDENTIAL'],
    });

    expect(response.citations[0]?.score).toBeGreaterThan(0.73);
    expect(response.confidenceScore).toBe(0.98);
  });

  it('Given a citation score that does not reach the cap, When the query is processed, Then confidence is exactly the score plus 0.25, rounded to 2 decimals', async () => {
    const content = 'Miscellaneous notices shall be delivered by certified mail to the address on file.';
    const chunks = chunkDocument(content, baseMeta);

    const response = await processRAGQuery({
      queryText: 'notices delivered mail address',
      chunks,
      allowedPrivilegeLevels: ['CONFIDENTIAL'],
    });

    const rawScore = response.citations[0]!.score;
    expect(rawScore).toBeLessThan(0.73); // sanity: this case must not hit the cap
    expect(response.confidenceScore).toBe(Math.round((rawScore + 0.25) * 100) / 100);
  });
});

describe('processRAGQuery — PII redaction count in the synthesized answer', () => {
  it('Given a retrieved chunk whose content already carries redaction placeholders, When the answer is synthesized, Then the placeholders are counted', async () => {
    const content =
      'Borrower SSN on file: [REDACTED_SSN_1]. Guarantor tax ID: [REDACTED_TAX_ID_1]. Please confirm covenant compliance.';
    const chunks = chunkDocument(content, baseMeta);

    const response = await processRAGQuery({
      queryText: 'covenant compliance confirmation',
      chunks,
      allowedPrivilegeLevels: ['CONFIDENTIAL'],
    });

    expect(response.piiRedactionCount).toBe(2);
  });
});

describe('processRAGQuery — multiple citations are numbered in order', () => {
  it('Given two matching chunks, When the answer is synthesized, Then each citation is numbered starting at 1 and carries its own section and page', async () => {
    const chunkA: DocumentChunk = {
      id: 'c1', documentId: 'd1', documentTitle: 'Credit Agreement', sectionTitle: 'Section 5.02',
      pageNumber: 12, content: 'leverage covenant maximum ratio', redactedContent: 'leverage covenant maximum ratio',
      embedding: chunkDocument('leverage covenant maximum ratio', baseMeta)[0]!.embedding,
      tokens: ['leverage', 'covenant', 'maximum', 'ratio'],
      privilegeLevel: 'CONFIDENTIAL', metadata: { entityName: 'Test Corp', documentType: 'CREDIT_AGREEMENT' },
    };
    const chunkB: DocumentChunk = {
      id: 'c2', documentId: 'd1', documentTitle: 'Credit Agreement', sectionTitle: 'Section 6.01',
      pageNumber: 20, content: 'leverage covenant reporting requirements', redactedContent: 'leverage covenant reporting requirements',
      embedding: chunkDocument('leverage covenant reporting requirements', baseMeta)[0]!.embedding,
      tokens: ['leverage', 'covenant', 'reporting', 'requirements'],
      privilegeLevel: 'CONFIDENTIAL', metadata: { entityName: 'Test Corp', documentType: 'CREDIT_AGREEMENT' },
    };

    const response = await processRAGQuery({
      queryText: 'leverage covenant',
      chunks: [chunkA, chunkB],
      allowedPrivilegeLevels: ['CONFIDENTIAL'],
    });

    expect(response.citations.length).toBe(2);
    expect(response.answerText).toContain('[1] Credit Agreement - Section 5.02 (Page 12)');
    expect(response.answerText).toContain('[2] Credit Agreement - Section 6.01 (Page 20)');
  });
});
