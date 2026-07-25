// Deterministic retrieval-precision assertion for promptfoo.
//
// Given the provider's ranked hits (JSON) and the golden label carried in test
// vars, it scores the case by reciprocal rank of the expected document:
//   - pass  = expected doc retrieved within topK
//   - score = 1/rank (0 if missed) → promptfoo's mean score across cases IS the MRR
//
// No LLM, no network — a pure ranking check, so it's stable in CI.

module.exports = (output, context) => {
  const vars = (context && context.vars) || {};
  const expectedDocId = vars.expectedDocId;
  const topK = Number(vars.topK) || 3;

  let ranked;
  try {
    ranked = JSON.parse(output);
  } catch (e) {
    return { pass: false, score: 0, reason: `provider output was not valid JSON: ${e.message}` };
  }
  if (!Array.isArray(ranked)) {
    return { pass: false, score: 0, reason: 'provider output was not a ranked array' };
  }

  const rankIdx = ranked.findIndex((r) => r && r.documentId === expectedDocId);
  const rank = rankIdx === -1 ? 0 : rankIdx + 1;
  const inTopK = rank > 0 && rank <= topK;
  const reciprocalRank = rank > 0 ? 1 / rank : 0;

  const topHit = ranked[0]
    ? `${ranked[0].documentId} @ ${Math.round((ranked[0].score || 0) * 100)}%`
    : '<no hits>';

  let reason;
  if (inTopK) {
    reason = `✓ ${expectedDocId} at rank ${rank} (RR=${reciprocalRank.toFixed(2)}); top hit ${topHit}`;
  } else if (rank > 0) {
    reason = `✗ ${expectedDocId} ranked ${rank}, outside topK=${topK}; top hit ${topHit}`;
  } else {
    reason = `✗ ${expectedDocId} not retrieved at all; top hit ${topHit}`;
  }

  return { pass: inTopK, score: reciprocalRank, reason };
};
