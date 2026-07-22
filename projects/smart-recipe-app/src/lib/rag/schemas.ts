import { z } from 'zod';

// Contract-first schemas for the in-browser RAG pipeline.
// The recipe corpus (corpus.json) and the precomputed embedding index
// (public/rag-index.json) are both validated against these at load time.

export const RecipeDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  cuisine: z.string(),
  tags: z.array(z.string()),
  timeMinutes: z.number(),
  servings: z.number(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});
export const RecipeCorpusSchema = z.array(RecipeDocSchema);
export type RecipeDoc = z.infer<typeof RecipeDocSchema>;

// Precomputed index artifact produced by embed-corpus.mjs and shipped in public/.
export const IndexedDocSchema = z.object({
  id: z.string(),
  embedding: z.array(z.number()),
});
export const RagIndexSchema = z.object({
  model: z.string(),
  dim: z.number(),
  docs: z.array(IndexedDocSchema),
});
export type RagIndex = z.infer<typeof RagIndexSchema>;

// Canonical text representation embedded for a recipe. The build-time ingest
// script (embed-corpus.mjs) MUST produce the identical string, or query
// embeddings won't share a vector space with the indexed documents.
export function embeddingText(doc: RecipeDoc): string {
  return [doc.title, doc.cuisine, doc.tags.join(' '), doc.ingredients.join(', ')].join('. ');
}
