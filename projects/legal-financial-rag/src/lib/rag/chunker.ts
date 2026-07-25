import { DocumentChunk, SecurityPrivilegeLevel } from '../schemas';
import { detectAndRedactPII } from '../security/piiRedactor';

/**
 * Legal Contract & Financial Document Semantic Chunker.
 * Preserves legal clause sections (e.g., "Section 4.02 Debt Covenants", "Article II Purchase Price"),
 * tracks page numbers, generates token lists, and creates lightweight semantic embeddings.
 */

export interface ChunkOptions {
  documentId: string;
  documentTitle: string;
  entityName: string;
  documentType: string;
  privilegeLevel: SecurityPrivilegeLevel;
  maxChunkSize?: number;
}

export const EMBEDDING_DIM = 128;

// Stable 32-bit string hash (FNV-1a) for the hashing-trick feature map. Deterministic
// and dependency-free, so embeddings are identical across the browser and CI.
function hashFeature(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Lightweight semantic embedding via feature hashing over (1) whole tokens and
// (2) character 3-grams. The 3-grams give the vector channel signal for
// morphological / partial overlap (e.g. "indemnification" ~ "indemnity") that
// pure keyword BM25 cannot see, while the higher 128-dim space (vs. the old
// 32-dim char-code sum) sharply cuts hash collisions. L2-normalized, so cosine
// similarity reduces to a dot product on the search hot path.
export function generateSimpleEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (const word of words) {
    // (1) whole-token feature — exact term match signal
    vector[hashFeature(`w:${word}`) % EMBEDDING_DIM] += 1;

    // (2) char 3-gram features — morphology / partial-term signal
    const padded = `#${word}#`;
    for (let i = 0; i + 3 <= padded.length; i++) {
      vector[hashFeature(`g:${padded.slice(i, i + 3)}`) % EMBEDDING_DIM] += 1;
    }
  }

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((val) => val / magnitude);
}

export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

export function chunkDocument(
  rawContent: string,
  options: ChunkOptions
): DocumentChunk[] {
  const { documentId, documentTitle, entityName, documentType, privilegeLevel } = options;
  const maxChunkSize = options.maxChunkSize || 600;

  const chunks: DocumentChunk[] = [];
  const paragraphs = rawContent.split(/\n\s*\n/);

  let currentSectionTitle = 'General Terms & Provisions';
  let currentPage = 1;
  let chunkBuffer = '';
  let chunkIndex = 1;

  const clauseHeaderRegex = /(?:Section|Article|Note|Schedule|Clause)\s+[\d.A-Z-]+\s*:?\s*.*$/im;
  const pageMarkerRegex = /\[Page\s+(\d+)\]|--- Page (\d+) ---/i;

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Check for page markers
    const pageMatch = pageMarkerRegex.exec(trimmed);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1] || pageMatch[2], 10) || currentPage;
    }

    // Check lines inside paragraph for legal clause headers
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const headerMatch = clauseHeaderRegex.exec(line.trim());
      if (headerMatch) {
        currentSectionTitle = headerMatch[0].trim().slice(0, 80);
        break;
      }
    }

    if ((chunkBuffer + '\n' + trimmed).length > maxChunkSize && chunkBuffer.length > 0) {
      const { redactedText } = detectAndRedactPII(chunkBuffer);
      const tokens = tokenizeText(chunkBuffer);
      const embedding = generateSimpleEmbedding(chunkBuffer);

      chunks.push({
        id: `chk-${documentId}-${chunkIndex++}`,
        documentId,
        documentTitle,
        sectionTitle: currentSectionTitle,
        pageNumber: currentPage,
        content: chunkBuffer,
        redactedContent: redactedText,
        embedding,
        tokens,
        privilegeLevel,
        metadata: {
          entityName,
          documentType,
        },
      });

      chunkBuffer = trimmed;
    } else {
      chunkBuffer = chunkBuffer ? `${chunkBuffer}\n\n${trimmed}` : trimmed;
    }
  }

  if (chunkBuffer.trim().length > 0) {
    const { redactedText } = detectAndRedactPII(chunkBuffer);
    const tokens = tokenizeText(chunkBuffer);
    const embedding = generateSimpleEmbedding(chunkBuffer);

    chunks.push({
      id: `chk-${documentId}-${chunkIndex++}`,
      documentId,
      documentTitle,
      sectionTitle: currentSectionTitle,
      pageNumber: currentPage,
      content: chunkBuffer,
      redactedContent: redactedText,
      embedding,
      tokens,
      privilegeLevel,
      metadata: {
        entityName,
        documentType,
      },
    });
  }

  return chunks;
}
