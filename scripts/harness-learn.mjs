#!/usr/bin/env node
// Harness Learn — enforces the LEARN half of the loop.
//
// The harness's whole thesis is that lessons become enforcement, not prose.
// This gate makes that mechanical by requiring a closed traceability loop:
//
//     Lesson (AGENTS.md)  ⇄  Guardrail (harness-status.mjs)  ⇄  Self-test
//
// Concretely it fails (exit 1) if any of these break:
//   1. A guardrail has no `lesson` back-reference.
//   2. A guardrail's id is not tagged `[guardrail: <id>]` on any AGENTS.md
//      bullet  → an undocumented rule (why does this exist?).
//   3. An AGENTS.md `[guardrail: <id>]` tag points to a guardrail that does not
//      exist  → a stale/typo'd claim of enforcement.
//   4. A guardrail's declared `lesson` text is not found near its tag in
//      AGENTS.md  → the lesson was renamed without updating the guardrail.
//
// (Guardrail-fires-correctly coverage is the sibling gate, harness-status.test.mjs.)
// Together they mean: you cannot add a guardrail without a documented lesson,
// and you cannot claim a mechanical lesson without a working, tested guardrail —
// so the harness provably gets stricter over time instead of by good intentions.
//
// Run: node scripts/harness-learn.mjs   (or  .\scripts\harness.ps1 learn)

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUARDRAILS } from './harness-status.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentsPath = join(__dirname, '..', '.agents', 'AGENTS.md');
const agents = readFileSync(agentsPath, 'utf8');

// Scope the scan to the "Learned Lessons" section (## 6.) so that
// `[guardrail: ...]` examples in surrounding prose/protocol are not misread as
// real tags — real tags belong on lesson bullets, and lessons live in §6.
const allLines = agents.split(/\r?\n/);
const startIdx = allLines.findIndex((l) => /^##\s+6\./.test(l));
if (startIdx === -1) {
  console.error("Could not find the '## 6.' Learned Lessons section in AGENTS.md.");
  process.exit(1);
}
let endIdx = allLines.findIndex((l, i) => i > startIdx && /^##\s/.test(l));
if (endIdx === -1) endIdx = allLines.length;
const lines = allLines.slice(startIdx, endIdx);

// Every [guardrail: id] tag in the Learned Lessons section, with its line text.
const taggedLines = new Map(); // id -> line text
const tagRe = /\[guardrail:\s*([a-z0-9-]+)\]/gi;
for (const line of lines) {
  for (const m of line.matchAll(tagRe)) taggedLines.set(m[1], line);
}
const taggedIds = new Set(taggedLines.keys());
const guardrailIds = new Set(GUARDRAILS.map((g) => g.id));

const errors = [];

for (const g of GUARDRAILS) {
  // (1) back-reference present
  if (!g.lesson || !g.lesson.trim()) {
    errors.push(`Guardrail '${g.id}' has no 'lesson' back-reference.`);
    continue;
  }
  // (2) tagged in AGENTS.md
  if (!taggedIds.has(g.id)) {
    errors.push(`Guardrail '${g.id}' is not tagged in AGENTS.md. Add '[guardrail: ${g.id}]' to the "${g.lesson}" lesson bullet.`);
    continue;
  }
  // (4) the tag sits on the lesson it claims (rename protection)
  const line = taggedLines.get(g.id);
  if (!line.includes(g.lesson)) {
    errors.push(`Guardrail '${g.id}' declares lesson "${g.lesson}", but its [guardrail: ${g.id}] tag is on a different bullet:\n      ${line.trim()}`);
  }
}

// (3) no dangling tags
for (const id of taggedIds) {
  if (!guardrailIds.has(id)) {
    errors.push(`AGENTS.md tags '[guardrail: ${id}]' but no such guardrail exists in harness-status.mjs (typo or removed rule).`);
  }
}

const C = { red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m', reset: '\x1b[0m' };
console.log(`${C.cyan}Harness Learn — Lesson ⇄ Guardrail traceability${C.reset}`);
if (errors.length) {
  for (const e of errors) console.error(`  ${C.red}✗${C.reset} ${e}`);
  console.error(`\n${C.red}LEARN gate FAILED: ${errors.length} traceability break(s).${C.reset}`);
  process.exit(1);
}
console.log(`  ${C.green}✓${C.reset} ${GUARDRAILS.length} guardrails each trace to a documented AGENTS.md lesson.`);
console.log(`${C.green}LEARN gate PASSED.${C.reset}`);
