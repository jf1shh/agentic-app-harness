// Build-time ingest: embeds the recipe corpus with all-MiniLM-L6-v2 and writes
// a precomputed index to public/rag-index.json. The browser then only has to
// embed the user's query at runtime (the "index once" model from AutoClaimsRAG),
// keeping retrieval fast and fully client-side.
//
// Run: npm run embed   (regenerate whenever corpus.json changes)
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const corpusPath = fileURLToPath(new URL('./src/lib/rag/corpus.json', import.meta.url));
const outPath = fileURLToPath(new URL('./public/rag-index.json', import.meta.url));

// Must stay identical to embeddingText() in src/lib/rag/schemas.ts.
function embeddingText(doc) {
  return [doc.title, doc.cuisine, doc.tags.join(' '), doc.ingredients.join(', ')].join('. ');
}

const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
console.log(`Loading ${MODEL}...`);
const extract = await pipeline('feature-extraction', MODEL);

const docs = [];
for (const doc of corpus) {
  const out = await extract(embeddingText(doc), { pooling: 'mean', normalize: true });
  // Round to 6 decimals to shrink the shipped artifact; vectors are L2-normalized.
  docs.push({ id: doc.id, embedding: Array.from(out.data, (x) => Math.round(x * 1e6) / 1e6) });
}

const index = { model: MODEL, dim: docs[0].embedding.length, docs };
writeFileSync(outPath, JSON.stringify(index));
console.log(`Embedded ${docs.length} recipes -> public/rag-index.json (dim ${index.dim})`);
