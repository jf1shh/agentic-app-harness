import { describe, it, expect, vi } from 'vitest';
import { exportAuditToMarkdown, downloadFile } from './auditExporter';
import type { AuditLogEntry, RAGResponse } from '../schemas';

// unit.test.ts's "RAG Query Processor & Audit Exporter" section only ever
// called exportAuditToMarkdown/JSON with an EMPTY audit log array. Mutation
// testing (node scripts/run-mutation.mjs legal-financial-rag --mutate
// "src/lib/export/auditExporter.ts") found this file at 12.8%, with the
// entire audit-ledger-table block (the `auditLogs.slice(0, 10)` cap and its
// row formatting) and the whole of `downloadFile` at NoCoverage -- never
// executed by any test at all, in the one function whose whole job is
// producing the compliance record this app's premise depends on.

function makeResponse(): RAGResponse {
  return {
    id: 'res-1',
    queryId: 'q-1',
    queryText: 'What is the leverage covenant?',
    answerText: 'The covenant requires a maximum of 3.25x EBITDA.',
    citations: [],
    executionTimeMs: 42,
    tokenCount: 10,
    confidenceScore: 0.9,
    securityAuditHash: 'a'.repeat(64),
    piiRedactionCount: 0,
  };
}

function makeLog(i: number): AuditLogEntry {
  return {
    id: `audit-${i}`,
    timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`,
    action: 'QUERY_EXECUTED',
    userRole: 'LEGAL_COUNSEL',
    details: `Entry ${i}`,
    previousHash: 'GENESIS_BLOCK_00000000000000000000000000000000',
    hash: `${String(i).padStart(2, '0')}`.repeat(32).slice(0, 64),
  };
}

describe('exportAuditToMarkdown — audit ledger table', () => {
  it('Given 12 audit log entries, When exported, Then only the first 10 appear in the ledger table', () => {
    const logs = Array.from({ length: 12 }, (_, i) => makeLog(i));
    const md = exportAuditToMarkdown(makeResponse(), logs);

    for (let i = 0; i < 10; i += 1) {
      expect(md).toContain(makeLog(i).timestamp);
    }
    expect(md).not.toContain(makeLog(10).timestamp);
    expect(md).not.toContain(makeLog(11).timestamp);
  });

  it('Given an audit log entry, When exported, Then its hash is truncated to 16 characters with an ellipsis rather than printed in full', () => {
    const logs = [makeLog(0)];
    const md = exportAuditToMarkdown(makeResponse(), logs);

    const fullHash = makeLog(0).hash;
    expect(md).toContain(`\`${fullHash.slice(0, 16)}...\``);
    expect(md).not.toContain(fullHash);
  });

  it('Given no audit log entries, When exported, Then the ledger table has a header but no rows', () => {
    const md = exportAuditToMarkdown(makeResponse(), []);
    expect(md).toContain('| Timestamp | User Role | Action | Verification Hash |');
    expect(md).not.toContain('QUERY_EXECUTED');
  });
});

describe('downloadFile', () => {
  it('Given a filename, content and content type, When downloaded, Then a blob URL is created, an anchor triggers the download, and the URL is revoked', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadFile('audit-report.json', '{"a":1}', 'application/json');

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const createdUrl = createObjectURLSpy.mock.results[0]!.value as string;
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(createdUrl);

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('Given a filename, When downloaded, Then the anchor is given that exact filename before the download is triggered', () => {
    let capturedFilename = '';
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      // `this` is the anchor at the moment click() fires -- after the
      // filename and href are set, before it's removed from the DOM.
      capturedFilename = this.download;
    });

    downloadFile('quarterly-audit.md', '# Report', 'text/markdown');

    expect(capturedFilename).toBe('quarterly-audit.md');
    clickSpy.mockRestore();
  });
});
