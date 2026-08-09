#!/usr/bin/env node
// Bridges harness-status.mjs findings onto the PR diff as inline review
// comments, via reviewdog's rdjsonl format (one JSON diagnostic per line —
// https://github.com/reviewdog/reviewdog/blob/master/proto/rdf/README.md).
//
// This exists because of .agents/AGENTS.md §9.1: "never self-certify
// verification... write only what a command actually printed." An agent
// summarizing harness-status.mjs's output in a PR body is exactly the step
// that went wrong in PR #41 — a passing claim that didn't match what the
// gate actually found. Posting the gate's own findings directly onto the
// lines they're about removes that summarization step entirely: there is
// nothing left to mis-describe.
//
// Only guardrail findings are translated here. They're the one finding shape
// that carries a `file`/`line` per hit (see harness-status.mjs's `evidence`
// array) — every other finding (missing spec, spec drift, no-zod-schema, ...)
// is app-level with no single line it belongs on, and forcing one onto an
// arbitrary line (a README's line 1, say) would be a worse comment than none.
// Those stay visible in harness-status.mjs's own console/JSON output and the
// harness-status.mjs --gate step's log, which still runs on every PR.
//
// reviewdog's own `-filter-mode=added` (set in the workflow, not here) means
// only findings that land on lines the PR actually touched get posted — a
// pre-existing guardrail hit on a file this PR doesn't touch stays silent
// instead of being re-litigated on every unrelated PR.
//
// Usage:
//   node scripts/harness-status-rdjson.mjs | reviewdog -f=rdjsonl -name=harness-status ...

import { collectStatus } from './harness-status.mjs';
import { fileURLToPath } from 'node:url';

const REPO_URL = 'https://github.com/jf1shh/agentic-app-harness';

// Pure: findings -> an array of rdjsonl diagnostic objects (not yet
// stringified), one per evidence line. Findings without evidence (no single
// line they belong on) are skipped — see the header for why.
export function toRdjsonDiagnostics(findings) {
  const diagnostics = [];
  for (const f of findings) {
    if (!f.evidence?.length) continue;
    for (const ev of f.evidence) {
      diagnostics.push({
        message: `${f.title}\n${f.detail}`,
        location: { path: ev.file, range: { start: { line: ev.line, column: 1 } } },
        severity: f.blocking ? 'ERROR' : 'WARNING',
        source: { name: 'harness-status', url: REPO_URL },
        code: { value: f.ruleId, url: `${REPO_URL}/blob/master/.agents/AGENTS.md` },
      });
    }
  }
  return diagnostics;
}

function main() {
  const { findings } = collectStatus();
  for (const d of toRdjsonDiagnostics(findings)) {
    process.stdout.write(JSON.stringify(d) + '\n');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
