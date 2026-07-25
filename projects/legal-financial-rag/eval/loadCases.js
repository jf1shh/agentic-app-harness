// Dynamic promptfoo test generator: turns goldenset.json into test cases so the
// labels live in exactly one place (no YAML duplication). Each case passes its
// query + golden label through vars and attaches the reciprocal-rank assertion.

const fs = require('fs');
const path = require('path');

module.exports = async function () {
  const gs = JSON.parse(fs.readFileSync(path.join(__dirname, 'goldenset.json'), 'utf8'));
  const topK = gs.topK || 3;

  return gs.cases.map((c) => ({
    description: c.query,
    vars: {
      query: c.query,
      expectedDocId: c.expectedDocId,
      expectedSection: c.expectedSection || '',
      topK,
    },
    assert: [{ type: 'javascript', value: 'file://assertRetrieval.js' }],
  }));
};
