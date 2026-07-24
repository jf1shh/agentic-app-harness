#!/usr/bin/env node
// Self-test for the VERIFY gate: proves every guardrail fires on a known-bad
// line and stays silent on a known-good line. If a guardrail's regex rots
// (stops catching the regression, or starts flagging clean code), this fails —
// so the thing that gates merges is itself gated. Zero dependencies; run with:
//   node scripts/harness-status.test.mjs

import { GUARDRAILS } from './harness-status.mjs';

// For each guardrail id: a line that MUST trip it, and one that MUST NOT.
const CASES = {
  'viewport-no-zoom': {
    bad: ['<meta name="viewport" content="width=device-width, user-scalable=no">',
          '<meta name="viewport" content="width=device-width, maximum-scale=1.0">'],
    good: ['<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'],
  },
  'explicit-any': {
    bad: ['const x = foo as any;', 'let y: any = 1;', 'function f(z: any) {}'],
    good: ['const x: string = "a";', 'let items: Recipe[] = [];', 'const anything = true;'],
  },
  'root-service-worker': {
    bad: ["navigator.serviceWorker.register('/sw.js');", 'navigator.serviceWorker.register("/sw.js", {})'],
    good: ["navigator.serviceWorker.register(window.location.pathname + 'sw.js');"],
  },
  'pbkdf2-salt-buffer': {
    bad: ['salt: saltBytes.buffer,', 'const s = saltRaw.buffer;'],
    good: ['salt: new Uint8Array(saltBytes),', 'salt: saltBytes,'],
  },
  'responsive-grid': {
    bad: [
      "gridTemplateColumns: '1fr 1fr'",
      "gridTemplateColumns: '1fr 2fr'",
      "gridTemplateColumns: '1fr 1fr 1fr'",
      'grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));',
    ],
    good: [
      "gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))'",
      'grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));',
      "gridTemplateColumns: '1fr'",
      'grid-template-columns: 1fr 1fr; /* handled by @media below */',
    ],
  },
};

let failures = 0;
const seen = new Set();

for (const g of GUARDRAILS) {
  const c = CASES[g.id];
  if (!c) {
    console.error(`✗ ${g.id}: no test case defined — every guardrail must be self-tested`);
    failures++;
    continue;
  }
  seen.add(g.id);
  for (const line of c.bad) {
    if (!g.test(line)) { console.error(`✗ ${g.id}: MISSED a known-bad line: ${line}`); failures++; }
  }
  for (const line of c.good) {
    if (g.test(line)) { console.error(`✗ ${g.id}: false-positive on a known-good line: ${line}`); failures++; }
  }
  if (!failures) console.log(`✓ ${g.id}`);
}

// A test case for a guardrail that no longer exists is dead weight.
for (const id of Object.keys(CASES)) {
  if (!seen.has(id)) { console.error(`✗ orphan test case '${id}' — no matching guardrail`); failures++; }
}

if (failures) {
  console.error(`\n${failures} guardrail self-test failure(s).`);
  process.exit(1);
}
console.log(`\nAll ${GUARDRAILS.length} guardrails verified.`);
