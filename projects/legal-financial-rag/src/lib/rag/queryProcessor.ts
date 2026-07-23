import { DocumentChunk, RAGResponse, SecurityPrivilegeLevel } from '../schemas';
import { searchHybrid } from './vectorEngine';
import { calculateSHA256 } from '../security/encryption';

/**
 * Legal & Financial Local RAG Query Processor.
 * Evaluates queries, retrieves top citations, synthesizes grounded legal clause answers,
 * and stamps execution metrics with a SHA-256 cryptographic audit hash.
 */

export interface ProcessQueryOptions {
  queryText: string;
  chunks: DocumentChunk[];
  allowedPrivilegeLevels: SecurityPrivilegeLevel[];
  topK?: number;
  hybridWeight?: number;
}

export async function processRAGQuery(
  options: ProcessQueryOptions
): Promise<RAGResponse> {
  const startTime = performance.now();
  const {
    queryText,
    chunks,
    allowedPrivilegeLevels,
    topK = 5,
    hybridWeight = 0.4,
  } = options;

  const citations = searchHybrid({
    query: queryText,
    chunks,
    allowedPrivilegeLevels,
    topK,
    hybridWeight,
  });

  const queryId = `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let answerText = '';
  let confidenceScore = 0;

  if (citations.length === 0) {
    answerText = `No grounded legal clauses or financial disclosures were retrieved for query "${queryText}" under the current security privilege filter (${allowedPrivilegeLevels.join(
      ', '
    )}).`;
    confidenceScore = 0.1;
  } else {
    // Grounded Legal Synthesis
    const topCitation = citations[0];
    const sourceDocs = Array.from(new Set(citations.map((c) => c.documentTitle))).join(', ');
    
    answerText = `Based on grounded analysis of ${sourceDocs} (${citations.length} relevant clause matches retrieved locally):\n\n`;

    citations.forEach((c, idx) => {
      answerText += `[${idx + 1}] ${c.documentTitle} - ${c.sectionTitle} (Page ${c.pageNumber})\n`;
      answerText += `Relevance Score: ${Math.round(c.score * 100)}% | Privilege: ${c.privilegeLevel}\n`;
      answerText += `Excerpt: "${c.snippet.replace(/\n+/g, ' ')}"\n\n`;
    });

    answerText += `Legal Summary: The provisions retrieved directly address the parameters requested in Section "${topCitation.sectionTitle}". Counsel is advised to verify exact covenant thresholds and privilege classifications prior to formal disclosure.`;

    confidenceScore = Math.min(0.98, topCitation.score + 0.25);
  }

  const executionTimeMs = Math.round(performance.now() - startTime);
  const tokenCount = (queryText + answerText).split(/\s+/).length;
  const piiRedactionCount = (answerText.match(/\[REDACTED_[A-Z_]+_\d+\]/g) || []).length;

  const securityAuditHash = await calculateSHA256(
    `${queryId}:${queryText}:${citations.length}:${executionTimeMs}:${Date.now()}`
  );

  return {
    id: `res-${Date.now()}`,
    queryId,
    queryText,
    answerText,
    citations,
    executionTimeMs,
    tokenCount,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    securityAuditHash,
    piiRedactionCount,
  };
}
