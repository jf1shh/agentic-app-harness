#!/usr/bin/env node
// Harness Spec & Schema Coverage Audit — the SDD compliance report.
//
// Verifies each app against the harness mandates (see .agents/AGENTS.md):
//   1. A spec file exists in specs/            (hard requirement — fails the run)
//   2. A project README exists                 (warning)
//   3. Contract-first Zod schemas in src/      (warning)
//   4. BDD Given/When/Then in every *.spec.ts  (warning)
//
// By default only a missing spec fails (exit 1); --strict also fails on warnings.
//
// WHY THIS IS A THIN VIEW, NOT A CHECKER
// -------------------------------------
// This replaces validate-specs.ps1, which re-implemented all four rules in
// PowerShell — a second copy of the same regexes (`from ['"]zod['"]`, the
// Given/When/Then triple) that harness-status.mjs already applies as sensors 1-4.
// Two implementations of one rule set drift, and the drift is silent: the two
// could disagree about whether an app complies and each would look correct on
// its own. Worse, the duplicate was in a language the rest of the loop had
// deliberately moved off, so the SDD Sentinel job had to run on windows-latest
// to execute one script whose logic already existed in Node.
//
// So this file owns no detection logic at all. It runs the senses once and
// *presents* the findings that correspond to these four mandates. Sensor
// changes reach this report automatically, and there is exactly one place where
// "does this app comply?" is decided.
//
// Findings are selected by finding id, deliberately not by `type`: the
// production-bundle sensor also emits type 'test-coverage', and it is a
// different mandate that must not surface in this audit.
//
// Usage:
//   node scripts/validate-specs.mjs
//   node scripts/validate-specs.mjs --strict

import { collectStatus } from './harness-status.mjs';

const C = { cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m', reset: '\x1b[0m' };

const strict = process.argv.slice(2).some((a) => a === '--strict' || a === '-Strict');

// Each mandate, and the finding id suffixes that mean it is unmet. `level`
// decides whether an unmet mandate fails the run or only warns — matching the
// documented contract (only a missing spec is a hard failure).
const MANDATES = [
  {
    label: 'Spec file present in specs/',
    level: 'fail',
    unmetBy: ['missing-spec'],
    pass: 'Spec file found',
  },
  {
    label: 'Project README.md present',
    level: 'warn',
    unmetBy: ['missing-readme'],
    pass: 'Project README.md present',
  },
  {
    label: 'Contract-first Zod schemas in src/',
    level: 'warn',
    unmetBy: ['no-zod', 'no-src'],
    pass: 'Zod runtime schemas in use',
  },
  {
    label: 'BDD Given-When-Then in every *.spec.ts',
    level: 'warn',
    unmetBy: ['no-bdd', 'bdd-noncompliant'],
    pass: 'BDD Given-When-Then verified in all spec file(s)',
  },
];

const status = collectStatus();

// Index findings by app, keyed on the id suffix (findings are `<app>-<suffix>`).
const byApp = new Map(status.appsScanned.map((a) => [a, new Map()]));
for (const f of status.findings) {
  const suffix = f.id.startsWith(`${f.app}-`) ? f.id.slice(f.app.length + 1) : f.id;
  byApp.get(f.app)?.set(suffix, f);
}

console.log(`${C.cyan}=========================================${C.reset}`);
console.log(`${C.cyan} Harness Spec & Schema Coverage Audit${C.reset}`);
if (strict) console.log(`${C.cyan} (strict mode: warnings fail the run)${C.reset}`);
console.log(`${C.cyan}=========================================${C.reset}`);

let passCount = 0, warningCount = 0, failCount = 0;

for (const app of status.appsScanned) {
  console.log(`\n${C.yellow}[Audit] Checking Project: ${app}${C.reset}`);
  const findings = byApp.get(app);

  for (const m of MANDATES) {
    const unmet = m.unmetBy.map((s) => findings.get(s)).find(Boolean);
    if (!unmet) {
      console.log(`  ${C.green}[PASS]${C.reset} ${m.pass}`);
      passCount++;
    } else if (m.level === 'fail') {
      console.log(`  ${C.red}[FAIL]${C.reset} ${unmet.title}`);
      failCount++;
    } else {
      console.log(`  ${C.yellow}[WARN]${C.reset} ${unmet.title}`);
      warningCount++;
    }
  }
}

console.log(`\n${C.cyan}=========================================${C.reset}`);
console.log(`${C.cyan} Audit Summary: ${passCount} Passed | ${warningCount} Warnings | ${failCount} Failures${C.reset}`);
console.log(`${C.cyan}=========================================${C.reset}`);

if (failCount > 0) process.exit(1);
if (strict && warningCount > 0) {
  console.log(`${C.red}Strict mode: failing run due to ${warningCount} warning(s).${C.reset}`);
  process.exit(1);
}
process.exit(0);
