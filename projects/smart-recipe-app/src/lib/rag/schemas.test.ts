import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RecipeDocSchema,
  RecipeCorpusSchema,
  IndexedDocSchema,
  RagIndexSchema,
  embeddingText,
} from './schemas';
import corpus from './corpus.json';

// Contract-first mandate (.agents/AGENTS.md §1) for the in-browser RAG pipeline,
// plus the drift tripwire the module's own comment asks for but nothing enforced.
//
// Backfilled coverage (§5): no Red step, so every case was proved by mutation —
// see the PR body.

const appRoot = join(__dirname, '..', '..', '..');

const validDoc = {
  id: 'r1',
  title: 'Lemon Chicken Traybake',
  cuisine: 'Mediterranean',
  tags: ['weeknight', 'one-pan'],
  timeMinutes: 45,
  servings: 4,
  ingredients: ['chicken thighs', 'lemon', 'new potatoes'],
  steps: ['Heat the oven.', 'Roast for 40 minutes.'],
};

// Omit a key without leaving an unused binding behind: the usual
// `const { key: _unused, ...rest } = obj` idiom trips
// @typescript-eslint/no-unused-vars, which these apps lint with no ^_ ignore
// pattern and --max-warnings 0.
function without<T extends object>(obj: T, key: keyof T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  delete copy[key as string];
  return copy;
}

describe('RecipeDocSchema', () => {
  it('Given a complete recipe document, When it is parsed, Then it is accepted unchanged', () => {
    expect(RecipeDocSchema.parse(validDoc)).toEqual(validDoc);
  });

  it('Given a recipe missing its ingredients, When it is parsed, Then the contract rejects it', () => {
    expect(() => RecipeDocSchema.parse(without(validDoc, 'ingredients'))).toThrow();
  });

  it('Given ingredients supplied as one string rather than a list, When it is parsed, Then the contract rejects it', () => {
    // A flattened list would embed as one blob and wreck retrieval silently.
    expect(() => RecipeDocSchema.parse({ ...validDoc, ingredients: 'chicken, lemon' })).toThrow();
  });

  it('Given a cook time that arrived as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    expect(() => RecipeDocSchema.parse({ ...validDoc, timeMinutes: '45' })).toThrow();
  });
});

describe('RagIndexSchema', () => {
  const validIndex = {
    model: 'Xenova/all-MiniLM-L6-v2',
    dim: 384,
    docs: [{ id: 'r1', embedding: [0.1, 0.2, 0.3] }],
  };

  it('Given a complete index artifact, When it is parsed, Then it is accepted unchanged', () => {
    expect(RagIndexSchema.parse(validIndex)).toEqual(validIndex);
  });

  it('Given an index whose embedding is not an array of numbers, When it is parsed, Then the contract rejects it', () => {
    expect(() => IndexedDocSchema.parse({ id: 'r1', embedding: ['0.1'] })).toThrow();
    expect(() => RagIndexSchema.parse({
      ...validIndex, docs: [{ id: 'r1', embedding: 'vector' }],
    })).toThrow();
  });

  it('Given an index missing its model or dimension, When it is parsed, Then the contract rejects it', () => {
    expect(() => RagIndexSchema.parse(without(validIndex, 'model'))).toThrow();
    expect(() => RagIndexSchema.parse(without(validIndex, 'dim'))).toThrow();
  });
});

describe('embeddingText', () => {
  it('Given a recipe document, When its embedding text is built, Then it joins title, cuisine, tags and ingredients in that order', () => {
    expect(embeddingText(validDoc)).toBe(
      'Lemon Chicken Traybake. Mediterranean. weeknight one-pan. chicken thighs, lemon, new potatoes',
    );
  });

  it('Given a recipe with no tags, When its embedding text is built, Then the section is empty rather than absent', () => {
    // Positional joins are how the two implementations stay comparable; dropping
    // an empty section in one and not the other is exactly the drift below.
    expect(embeddingText({ ...validDoc, tags: [] })).toBe(
      'Lemon Chicken Traybake. Mediterranean. . chicken thighs, lemon, new potatoes',
    );
  });

  // The build-time ingest script re-implements this function, with only a
  // comment ("Must stay identical to embeddingText() in src/lib/rag/schemas.ts")
  // holding the two together. If they drift, query vectors stop sharing a vector
  // space with the indexed documents and retrieval degrades silently — nothing
  // throws, results just get worse. This is the §6 "Explain the Arithmetic
  // Without Re-implementing It" failure mode, so it gets a real tripwire rather
  // than a comment: the script's own source is extracted and executed here.
  it('Given the build-time ingest script, When its embeddingText is run on the same documents, Then it produces byte-identical text', () => {
    const script = readFileSync(join(appRoot, 'embed-corpus.mjs'), 'utf8');
    const match = script.match(/function embeddingText\(doc\)\s*\{([\s\S]*?)\n\}/);
    expect(match, 'embed-corpus.mjs no longer defines function embeddingText(doc)').not.toBeNull();

    const scriptImpl = new Function('doc', match![1]) as (doc: typeof validDoc) => string;

    const fixtures = [
      validDoc,
      { ...validDoc, tags: [] },
      { ...validDoc, ingredients: [] },
      { ...validDoc, title: 'Ramen, two ways', cuisine: 'Japanese' },
      ...corpus,
    ];
    for (const doc of fixtures) {
      expect(scriptImpl(doc as typeof validDoc)).toBe(embeddingText(doc as typeof validDoc));
    }
  });
});

describe('the shipped RAG artifacts', () => {
  it('Given the real corpus.json, When it is parsed through the contract, Then every document conforms', () => {
    expect(() => RecipeCorpusSchema.parse(corpus)).not.toThrow();
    expect(corpus.length).toBeGreaterThan(0);
  });

  it('Given the real corpus.json, When ids are collected, Then each recipe has a unique id', () => {
    const ids = corpus.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given the shipped rag-index.json, When it is parsed through the contract, Then it conforms and matches the corpus', () => {
    const index = RagIndexSchema.parse(
      JSON.parse(readFileSync(join(appRoot, 'public', 'rag-index.json'), 'utf8')),
    );

    // An index built from a stale corpus retrieves documents the app cannot show.
    expect(new Set(index.docs.map((d) => d.id))).toEqual(new Set(corpus.map((d) => d.id)));

    // Every vector must have the declared dimension, or cosine similarity
    // silently compares vectors of different lengths.
    for (const doc of index.docs) {
      expect(doc.embedding).toHaveLength(index.dim);
    }
  });
});
