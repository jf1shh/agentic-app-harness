// promptfoo custom provider — LexiVault hybrid retrieval, exercised deterministically.
//
// This is NOT an LLM call. It indexes the sample corpus with the app's real
// chunker and runs the production `searchHybrid` engine, returning the ranked
// document hits as JSON. Keeping the eval LLM-free preserves the harness's
// "no embedded model, no API key, reproducible in CI" contract — the thing under
// test is retrieval *precision*, which is a deterministic property of the engine.

import { SAMPLE_DOCUMENTS } from '../src/lib/datasets/authenticSampleDocs';
import { chunkDocument } from '../src/lib/rag/chunker';
import { searchHybrid } from '../src/lib/rag/vectorEngine';
import type { DocumentChunk, SecurityPrivilegeLevel } from '../src/lib/schemas';

const ALL_LEVELS: SecurityPrivilegeLevel[] = [
  'CONFIDENTIAL',
  'ATTORNEY_CLIENT_PRIVILEGE',
  'WORK_PRODUCT',
  'PUBLIC_RESTRICTED',
];

// Build the chunk index once, at module load, across the whole corpus.
const INDEX: DocumentChunk[] = SAMPLE_DOCUMENTS.flatMap((doc) =>
  chunkDocument(doc.content, {
    documentId: doc.id,
    documentTitle: doc.title,
    entityName: doc.entityName,
    documentType: doc.documentType,
    privilegeLevel: doc.privilegeLevel,
  }),
);

interface ProviderResponse {
  output: string;
}

export default class LexiVaultRetrievalProvider {
  id(): string {
    return 'lexivault-retrieval';
  }

  async callApi(prompt: string): Promise<ProviderResponse> {
    const citations = searchHybrid({
      query: prompt,
      chunks: INDEX,
      allowedPrivilegeLevels: ALL_LEVELS,
      topK: 5,
    });

    const ranked = citations.map((c) => ({
      documentId: c.documentId,
      sectionTitle: c.sectionTitle,
      score: c.score,
    }));

    return { output: JSON.stringify(ranked) };
  }
}
