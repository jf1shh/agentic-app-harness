#!/usr/bin/env node
// Self-test for the instruction-file tamper sensor (see check-instruction-tamper.mjs header).
//
// Zero dependencies; run with:
//   node scripts/check-instruction-tamper.test.mjs

import {
  isWorkflowFile,
  isInstructionFile,
  isRelevantFile,
  removedLines,
  addedLines,
  detectRuleWeakening,
  detectGateBypass,
  detectScopeExpansion,
  analyzeFile,
  INSTRUCTION_FILES,
  DIRECTIVE_KEYWORDS,
  BYPASS_PATTERNS,
} from './check-instruction-tamper.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- isWorkflowFile -------------------------------------------------------- */

ok(
  isWorkflowFile('.github/workflows/ci.yml') === true,
  'isWorkflowFile: recognizes a standard CI workflow',
);
ok(
  isWorkflowFile('.github/workflows/sdd-sentinel.yml') === true,
  'isWorkflowFile: recognizes the SDD sentinel workflow',
);
ok(
  isWorkflowFile('.github/workflows/ci.yaml') === false,
  'isWorkflowFile: rejects .yaml extension (only .yml matches)',
);
ok(
  isWorkflowFile('.github/other/ci.yml') === false,
  'isWorkflowFile: rejects yml in a non-workflows directory',
);
ok(
  isWorkflowFile('scripts/ci.yml') === false,
  'isWorkflowFile: rejects yml outside .github/workflows/',
);

/* ---- isInstructionFile ----------------------------------------------------- */

ok(
  isInstructionFile('.agents/AGENTS.md') === true,
  'isInstructionFile: recognizes the authoritative rulebook',
);
ok(
  isInstructionFile('AGENTS.md') === true,
  'isInstructionFile: recognizes the universal entry point',
);
ok(
  isInstructionFile('CLAUDE.md') === true,
  'isInstructionFile: recognizes Claude-specific instructions',
);
ok(
  isInstructionFile('projects/mood-diner/README.md') === false,
  'isInstructionFile: rejects a non-instruction markdown file',
);

/* ---- isRelevantFile -------------------------------------------------------- */

ok(
  isRelevantFile('.agents/AGENTS.md') === true,
  'isRelevantFile: instruction file is relevant',
);
ok(
  isRelevantFile('.github/workflows/ci.yml') === true,
  'isRelevantFile: workflow file is relevant',
);
ok(
  isRelevantFile('projects/mood-diner/src/App.tsx') === false,
  'isRelevantFile: app source file is not relevant',
);

/* ---- removedLines / addedLines --------------------------------------------- */

const BASE = 'line one\nline two\nline three\n';
const HEAD = 'line one\nline four\nline three\n';

ok(
  removedLines(BASE, HEAD).length === 1 && removedLines(BASE, HEAD)[0] === 'line two',
  'removedLines: detects a removed line',
);
ok(
  addedLines(BASE, HEAD).length === 1 && addedLines(BASE, HEAD)[0] === 'line four',
  'addedLines: detects an added line',
);
ok(
  removedLines(BASE, BASE).length === 0,
  'removedLines: no changes yields empty array',
);
ok(
  addedLines(BASE, BASE).length === 0,
  'addedLines: no changes yields empty array',
);

/* ---- detectRuleWeakening --------------------------------------------------- */

{
  const base = '## Section 1\nAgents MUST run the gate before pushing.\nAgents NEVER self-merge.\n';
  const head = '## Section 1\nAgents should run the gate before pushing.\n';
  const findings = detectRuleWeakening('.agents/AGENTS.md', base, head);
  ok(
    findings.length >= 1,
    'detectRuleWeakening: flags removal of a line containing MUST',
  );
  ok(
    findings.some((f) => f.keyword.toLowerCase() === 'must'),
    'detectRuleWeakening: reports the specific directive keyword (MUST)',
  );
  ok(
    findings.some((f) => f.keyword.toLowerCase() === 'never'),
    'detectRuleWeakening: also catches removal of NEVER on another line',
  );
  ok(
    findings.every((f) => f.heuristic === 'rule-weakening'),
    'detectRuleWeakening: all findings have the correct heuristic tag',
  );
}

{
  const base = '## Rules\nYou always check the spec.\n';
  const head = '## Rules\nYou always check the spec.\nNew lesson about testing.\n';
  const findings = detectRuleWeakening('.agents/AGENTS.md', base, head);
  ok(
    findings.length === 0,
    'detectRuleWeakening: adding a new lesson without removing directives produces no findings',
  );
}

{
  const base = 'agents MUST test.\n';
  const head = 'agents should test.\n';
  const findings = detectRuleWeakening('projects/mood-diner/src/App.tsx', base, head);
  ok(
    findings.length === 0,
    'detectRuleWeakening: does not fire on non-instruction files',
  );
}

{
  const base = '## Section\nThis is required by policy.\nThis is mandatory.\nYou should always check.\n';
  const head = '## Section\n';
  const findings = detectRuleWeakening('CLAUDE.md', base, head);
  ok(
    findings.length >= 3,
    'detectRuleWeakening: catches required, mandatory, and always keywords',
  );
  const keywords = findings.map((f) => f.keyword.toLowerCase()).sort();
  ok(
    keywords.includes('required') && keywords.includes('mandatory') && keywords.includes('always'),
    'detectRuleWeakening: reports each directive keyword correctly',
  );
}

/* ---- detectGateBypass ------------------------------------------------------ */

{
  const base = '    - name: Run tests\n      run: npm test\n';
  const head = '    - name: Run tests\n      continue-on-error: true\n      run: npm test\n';
  const findings = detectGateBypass('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 1,
    'detectGateBypass: flags addition of continue-on-error: true',
  );
  ok(
    findings[0].pattern === 'continue-on-error: true',
    'detectGateBypass: reports the specific bypass pattern',
  );
  ok(
    findings[0].heuristic === 'gate-bypass',
    'detectGateBypass: finding has correct heuristic tag',
  );
}

{
  const base = '    - run: git push\n';
  const head = '    - run: git push --no-verify\n';
  const findings = detectGateBypass('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 1,
    'detectGateBypass: flags addition of --no-verify',
  );
}

{
  const base = '    - name: Deploy\n';
  const head = '    - name: Deploy\n      if: false\n';
  const findings = detectGateBypass('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 1,
    'detectGateBypass: flags addition of if: false',
  );
}

{
  const base = '    continue-on-error: true\n    run: npm test\n';
  const head = '    continue-on-error: true\n    run: npm test\n';
  const findings = detectGateBypass('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 0,
    'detectGateBypass: pre-existing continue-on-error does not flag',
  );
}

{
  const base = '';
  const head = '    continue-on-error: true\n';
  const findings = detectGateBypass('.agents/AGENTS.md', base, head);
  ok(
    findings.length === 0,
    'detectGateBypass: does not fire on non-workflow files',
  );
}

/* ---- detectScopeExpansion -------------------------------------------------- */

{
  const base = '    include:\n      - src/**\n';
  const head = '    include:\n      - src/**\n    exclude:\n      - test/**\n';
  const findings = detectScopeExpansion('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 1,
    'detectScopeExpansion: flags addition of an exclude: directive',
  );
  ok(
    findings[0].heuristic === 'scope-expansion',
    'detectScopeExpansion: finding has correct heuristic tag',
  );
}

{
  const base = '    exclude:\n      - test/**\n';
  const head = '    exclude:\n      - test/**\n';
  const findings = detectScopeExpansion('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 0,
    'detectScopeExpansion: pre-existing exclude: does not flag',
  );
}

{
  const base = '';
  const head = '    exclude:\n';
  const findings = detectScopeExpansion('CLAUDE.md', base, head);
  ok(
    findings.length === 0,
    'detectScopeExpansion: does not fire on non-workflow files',
  );
}

/* ---- analyzeFile: integration ---------------------------------------------- */

{
  const base = '## Rules\nAgents MUST test before pushing.\n';
  const head = '## Rules\nAgents should test before pushing.\n';
  const findings = analyzeFile('.agents/AGENTS.md', base, head);
  ok(
    findings.length === 1 && findings[0].heuristic === 'rule-weakening',
    'analyzeFile: end-to-end rule-weakening detection on an instruction file',
  );
}

{
  const base = '    - run: npm test\n';
  const head = '    - run: npm test\n      continue-on-error: true\n    exclude:\n';
  const findings = analyzeFile('.github/workflows/ci.yml', base, head);
  ok(
    findings.length === 2,
    'analyzeFile: detects both gate-bypass and scope-expansion in a workflow file',
  );
  const heuristics = findings.map((f) => f.heuristic).sort();
  ok(
    heuristics[0] === 'gate-bypass' && heuristics[1] === 'scope-expansion',
    'analyzeFile: reports both heuristic types correctly',
  );
}

{
  const base = '## rules\n';
  const head = '## rules\nNew content added.\n';
  const findings = analyzeFile('.agents/AGENTS.md', base, head);
  ok(
    findings.length === 0,
    'analyzeFile: adding non-directive content to an instruction file produces no findings',
  );
}

{
  const findings = analyzeFile('projects/mood-diner/src/App.tsx', 'a\n', 'b\n');
  ok(
    findings.length === 0,
    'analyzeFile: irrelevant file produces no findings',
  );
}

/* ---- Coverage: every directive keyword has at least one test ---------------- */

for (const kw of DIRECTIVE_KEYWORDS) {
  const base = `This is ${kw} for safety.\n`;
  const head = '\n';
  const findings = detectRuleWeakening('AGENTS.md', base, head);
  ok(
    findings.some((f) => f.keyword.toLowerCase() === kw.toLowerCase()),
    `directive keyword "${kw}" is detectable when removed from an instruction file`,
  );
}

/* ---- Coverage: every bypass pattern has at least one test ------------------- */

for (const pat of BYPASS_PATTERNS) {
  const base = '';
  const head = `    ${pat}\n`;
  const findings = detectGateBypass('.github/workflows/ci.yml', base, head);
  ok(
    findings.some((f) => f.pattern === pat),
    `bypass pattern "${pat}" is detectable when added to a workflow file`,
  );
}

/* ---- Summary --------------------------------------------------------------- */

console.log(`\n${failures === 0 ? '✓ All' : `✗ ${failures}`} instruction-tamper self-test(s) ${failures === 0 ? 'passed' : 'FAILED'}.`);
if (failures > 0) process.exit(1);
