import { DocumentChunk, RAGCitation, SecurityPrivilegeLevel } from '../schemas';
import { generateSimpleEmbedding, tokenizeText } from './chunker';

/**
 * 100% Client-Side Hybrid BM25 & Vector Cosine Similarity Search Engine.
 * Runs zero-latency local retrieval across document chunks.
 */

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateBM25Score(
  queryTokens: string[],
  chunkTokens: string[],
  avgDocLen: number,
  k1 = 1.5,
  b = 0.75
): number {
  if (queryTokens.length === 0 || chunkTokens.length === 0) return 0;

  let score = 0;
  const docLen = chunkTokens.length;

  for (const qToken of queryTokens) {
    const termFreq = chunkTokens.filter((t) => t === qToken).length;
    if (termFreq > 0) {
      // Simplified TF component for BM25
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + (b * docLen) / (avgDocLen || 1));
      score += numerator / denominator;
    }
  }

  // Normalize score between 0 and 1
  return Math.min(1.0, score / (queryTokens.length * 2));
}

export interface SearchOptions {
  query: string;
  chunks: DocumentChunk[];
  allowedPrivilegeLevels: SecurityPrivilegeLevel[];
  topK?: number;
  hybridWeight?: number; // 0.0 = pure vector, 1.0 = pure BM25, 0.5 = balanced hybrid
}

export function searchHybrid(options: SearchOptions): RAGCitation[] {
  const {
    query,
    chunks,
    allowedPrivilegeLevels,
    topK = 5,
    hybridWeight = 0.4,
  } = options;

  if (!query.trim() || chunks.length === 0) return [];

  // Filter chunks by privilege level
  const allowedSet = new Set(allowedPrivilegeLevels);
  const eligibleChunks = chunks.filter((c) => allowedSet.has(c.privilegeLevel));

  if (eligibleChunks.length === 0) return [];

  const queryEmbedding = generateSimpleEmbedding(query);
  const queryTokens = tokenizeText(query);

  const avgDocLen =
    eligibleChunks.reduce((sum, c) => sum + c.tokens.length, 0) / eligibleChunks.length;

  const citations: RAGCitation[] = [];

  for (const chunk of eligibleChunks) {
    const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
    const bm25Score = calculateBM25Score(queryTokens, chunk.tokens, avgDocLen);

    const hybridScore = (1 - hybridWeight) * vectorScore + hybridWeight * bm25Score;

    let matchType: 'VECTOR' | 'KEYWORD' | 'HYBRID' = 'HYBRID';
    if (hybridWeight > 0.8) matchType = 'KEYWORD';
    else if (hybridWeight < 0.2) matchType = 'VECTOR';

    if (hybridScore > 0.05) {
      citations.push({
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        sectionTitle: chunk.sectionTitle,
        pageNumber: chunk.pageNumber,
        snippet: chunk.redactedContent.slice(0, 300) + '...',
        score: Math.round(hybridScore * 100) / 100,
        matchType,
        privilegeLevel: chunk.privilegeLevel,
      });
    }
  }

  // Sort by highest hybrid score descending
  citations.sort((a, b) => b.score - a.score);

  return citations.slice(0, topK);
}
