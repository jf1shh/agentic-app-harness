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

export function generateSimpleEmbedding(text: string): number[] {
  const vector = new Array(32).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const words = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode + j) % 32;
      vector[index] += 1;
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
