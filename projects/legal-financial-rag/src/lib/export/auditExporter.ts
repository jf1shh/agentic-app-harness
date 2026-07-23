import { AuditLogEntry, RAGResponse } from '../schemas';

/**
 * Compliance & Cryptographic Audit Exporter.
 * Formats RAG query results, grounded citations, and SHA-256 audit ledger into legal compliance packages.
 */

export function exportAuditToJSON(response: RAGResponse, auditLogs: AuditLogEntry[]): string {
  const exportPackage = {
    exportTimestamp: new Date().toISOString(),
    system: 'LexiVault Local Financial RAG Engine',
    complianceStandard: '100% Client-Side Private / Zero Telemetry',
    queryResult: response,
    auditLedger: auditLogs,
  };
  return JSON.stringify(exportPackage, null, 2);
}

export function exportAuditToMarkdown(response: RAGResponse, auditLogs: AuditLogEntry[]): string {
  let md = `# LEXIVAULT LEGAL AUDIT REPORT & RAG CITATION LEDGER\n\n`;
  md += `**Report Generated:** ${new Date().toUTCString()}\n`;
  md += `**Query ID:** \`${response.queryId}\`  \n`;
  md += `**Cryptographic SHA-256 Audit Stamp:** \`${response.securityAuditHash}\`  \n`;
  md += `**Execution Time:** ${response.executionTimeMs} ms | **Confidence Score:** ${Math.round(response.confidenceScore * 100)}%\n\n`;

  md += `---  \n`;
  md += `## 1. Legal Query & Grounded Answer\n\n`;
  md += `**Query:** *"${response.queryText}"*\n\n`;
  md += `### Grounded Response:\n${response.answerText}\n\n`;

  md += `---  \n`;
  md += `## 2. Grounded Evidentiary Citations (${response.citations.length} Retrieved)\n\n`;

  response.citations.forEach((c, idx) => {
    md += `### [Citation ${idx + 1}] ${c.documentTitle}\n`;
    md += `- **Section:** ${c.sectionTitle} (Page ${c.pageNumber})\n`;
    md += `- **Relevance Score:** ${Math.round(c.score * 100)}% (${c.matchType})\n`;
    md += `- **Privilege Level:** \`${c.privilegeLevel}\`  \n`;
    md += `- **Excerpt:**\n> ${c.snippet.replace(/\n+/g, ' ')}\n\n`;
  });

  md += `---  \n`;
  md += `## 3. Cryptographic Audit Ledger Trail\n\n`;
  md += `| Timestamp | User Role | Action | Verification Hash |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;

  auditLogs.slice(0, 10).forEach((entry) => {
    md += `| ${entry.timestamp} | ${entry.userRole} | ${entry.action} | \`${entry.hash.slice(0, 16)}...\` |\n`;
  });

  return md;
}

export function downloadFile(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
