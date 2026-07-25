# LexiVault Retrieval-Precision Eval (promptfoo)

A deterministic, **LLM-free** evaluation of LexiVault's hybrid search engine, wired
into the harness as a **blocking gate**. It proves the retrieval *ranks the right
document first* — a property unit tests don't cover — and fails CI if ranking
quality regresses, the same way a guardrail regression does.

## Why no LLM

The harness contract is "no embedded model, no API key, reproducible in CI."
Retrieval precision is a *deterministic* property of the engine (`searchHybrid` +
BM25 + cosine), so the eval exercises the real engine over a labeled corpus and
scores the ranking directly — no model, no network, stable in CI.

## How it works

| File | Role |
|---|---|
| `goldenset.json` | Single source of truth: 20 counsel queries → the document (+ section) that must be retrieved, including paraphrase / morphological-variant queries with low keyword overlap that stress the vector channel. Derived from `src/lib/datasets/authenticSampleDocs.ts`. |
| `retrievalProvider.ts` | promptfoo custom provider. Indexes the sample corpus with the app's real `chunkDocument`, runs the production `searchHybrid`, returns ranked hits as JSON. |
| `loadCases.js` | Generates promptfoo test cases from `goldenset.json` (no YAML duplication). |
| `assertRetrieval.js` | Scores each case by **reciprocal rank** of the expected doc: `pass = in topK`, `score = 1/rank`. Mean score across cases = **MRR**. |
| `promptfooconfig.yaml` | Ties provider + prompts + tests together. |

## Metrics & thresholds

The gate (`scripts/rag-eval-gate.mjs`) runs the eval and enforces two floors:

- **precision@K** — share of golden queries whose expected document lands in the top-K (K=3). Floor: **90%**.
- **MRR** — mean reciprocal rank of the expected document. Floor: **0.75**.

Current baseline (128-dim feature-hashed embedding): **precision@K 100%, MRR 1.000**
(every expected doc ranks #1), so the floors leave headroom to catch a real
regression without flaking. For reference, the previous 32-dim char-code embedding
scored MRR 0.975 on the same set — the corpus is only four documents, so precision@K
saturates and MRR is the more discriminating signal here; the embedding's benefit
grows with corpus size.

## Running it

```bash
# From the repo root — the harness gate (blocking, used in CI):
node scripts/rag-eval-gate.mjs
#   or:  ./scripts/harness.ps1 rag-eval

# From this app — the raw promptfoo eval (full table + scores):
npm run eval
```

## Extending the eval

Add a query + its expected `documentId`/`section` to `goldenset.json`. Keep labels
in sync when the corpus in `authenticSampleDocs.ts` changes. To tighten the gate as
the engine improves, raise `MIN_PRECISION_AT_K` / `MIN_MRR` in
`scripts/rag-eval-gate.mjs`.
