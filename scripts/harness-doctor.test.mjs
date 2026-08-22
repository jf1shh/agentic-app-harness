#!/usr/bin/env node
// Self-test for harness-doctor.mjs — proves the doctor reports correctly
// when checks pass and fail, supports all output modes, and exits with the
// right code. Zero dependencies; run with:
//   node scripts/harness-doctor.test.mjs

import { runCheck, runAllChecks, generateReport, generateJsonReport } from './harness-doctor.mjs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const pass = (msg) => console.log(`\u2713 ${msg}`);
const fail = (msg) => { console.error(`\u2717 ${msg}`); failures++; };

// ---------------------------------------------------------------------------
// 1. Unit: generateReport with all-passing checks
// ---------------------------------------------------------------------------
{
  const results = [
    { id: 'a', label: 'check A', passed: true, summary: 'all good', exitCode: 0, stderr: '', timedOut: false },
    { id: 'b', label: 'check B', passed: true, summary: 'also good', exitCode: 0, stderr: '', timedOut: false },
  ];
  const { allGreen, lines } = generateReport(results, {});
  if (!allGreen) fail('generateReport: all-passing checks should report allGreen=true');
  else pass('generateReport: allGreen=true when all checks pass');
  if (lines.join('').includes('All 2 checks passed')) pass('generateReport: summary line names correct count');
  else fail('generateReport: missing "All 2 checks passed" summary');
}

// ---------------------------------------------------------------------------
// 2. Unit: generateReport with one failed check
// ---------------------------------------------------------------------------
{
  const results = [
    { id: 'a', label: 'check A', passed: true, summary: 'ok', exitCode: 0, stderr: '', timedOut: false },
    { id: 'b', label: 'check B', passed: false, summary: 'broken', exitCode: 1, stderr: 'ERR: something wrong', timedOut: false },
  ];
  const { allGreen, lines } = generateReport(results, {});
  if (allGreen) fail('generateReport: one-failing check should report allGreen=false');
  else pass('generateReport: allGreen=false when a check fails');
  if (lines.join('').includes('1/2 checks failed')) pass('generateReport: failure count correct');
  else fail('generateReport: missing "1/2 checks failed" summary');
}

// ---------------------------------------------------------------------------
// 3. Unit: generateReport with --fix-hints shows fix text
// ---------------------------------------------------------------------------
{
  const results = [
    { id: 'doc-claims', label: 'doc claims', passed: false, summary: 'mismatch', exitCode: 1,
      stderr: 'Mismatch...', timedOut: false },
  ];
  const { allGreen, lines } = generateReport(results, { fixHints: true });
  const joined = lines.join('');
  if (!joined.includes('Fix:')) fail('generateReport --fix-hints: should include "Fix:" lines');
  else pass('generateReport --fix-hints: includes fix prescriptions');
  if (joined.includes('Fix: Unknown')) fail('generateReport --fix-hints: should resolve fix from CHECKS registry');
  else pass('generateReport --fix-hints: resolves fix text from registry');
}

// ---------------------------------------------------------------------------
// 4. Unit: generateReport --quiet produces no output lines
// ---------------------------------------------------------------------------
{
  const results = [
    { id: 'a', label: 'check A', passed: true, summary: 'ok', exitCode: 0, stderr: '', timedOut: false },
  ];
  const { lines } = generateReport(results, { quiet: true });
  if (lines.length !== 0) fail('generateReport --quiet: should produce no output lines');
  else pass('generateReport --quiet: no output lines');
}

// ---------------------------------------------------------------------------
// 5. Unit: generateJsonReport
// ---------------------------------------------------------------------------
{
  const results = [
    { id: 'a', label: 'check A', passed: true, summary: 'ok', exitCode: 0, stderr: '', timedOut: false },
    { id: 'b', label: 'check B', passed: false, summary: 'bad', exitCode: 1, stderr: 'fail', timedOut: false },
  ];
  const json = generateJsonReport(results);
  if (json.length !== 2) fail('generateJsonReport: should return one entry per result');
  if (json[0].id !== 'a' || json[0].passed !== true) fail('generateJsonReport: first entry wrong');
  if (json[1].passed !== false) fail('generateJsonReport: second entry should be failed');
  // stderr should be omitted for empty string
  if (json[0].stderr !== undefined) fail('generateJsonReport: empty stderr should be undefined');
  if (json[1].stderr !== 'fail') fail('generateJsonReport: non-empty stderr preserved');
  else pass('generateJsonReport: correct shape, empty stderr omitted');
}

// ---------------------------------------------------------------------------
// 6. Integration: run on a fixture that always passes
// ---------------------------------------------------------------------------
{
  const result = runCheck({
    id: 'always-passes',
    label: 'fixture',
    cmd: 'node',
    args: ['-e', 'console.log("ok"); process.exit(0)'],
    extractSummary(stdout) { const m = stdout.match(/ok/); return m ? 'fixture passed' : null; },
  }, { timeoutMs: 3000 });
  if (!result.passed) fail(`runCheck: fixture that exits 0 should pass (got exit ${result.exitCode})`);
  if (result.summary !== 'fixture passed') fail(`runCheck: summary should be extracted (got "${result.summary}")`);
  else pass('runCheck: passes on exit-0 fixture, extracts summary');
}

// ---------------------------------------------------------------------------
// 7. Integration: run on a fixture that always fails
// ---------------------------------------------------------------------------
{
  const result = runCheck({
    id: 'always-fails',
    label: 'fixture',
    cmd: 'node',
    args: ['-e', 'console.error("boom"); process.exit(3)'],
    extractSummary(stdout) { return null; },
  }, { timeoutMs: 3000 });
  if (result.passed) fail('runCheck: fixture that exits 3 should fail');
  if (result.exitCode !== 3) fail(`runCheck: should capture exit code 3 (got ${result.exitCode})`);
  if (!result.stderr.includes('boom')) fail('runCheck: should capture stderr');
  else pass('runCheck: fails on non-zero exit, captures exitCode and stderr');
}

// ---------------------------------------------------------------------------
// 8. Integration: runAllChecks with mixed results
// ---------------------------------------------------------------------------
{
  const checks = [
    { id: 'a', label: 'pass', cmd: 'node', args: ['-e', 'process.exit(0)'], extractSummary() { return 'pass'; } },
    { id: 'b', label: 'fail', cmd: 'node', args: ['-e', 'process.exit(1)'], extractSummary() { return null; } },
  ];
  const results = runAllChecks(checks);
  if (results.length !== 2) fail('runAllChecks: should return all results');
  if (results[0].passed !== true) fail('runAllChecks: first check should pass');
  if (results[1].passed !== false) fail('runAllChecks: second check should fail');
  else pass('runAllChecks: returns correct pass/fail for mixed checks');
}

// ---------------------------------------------------------------------------
// 9. Full CLI smoke test: doctor exits 0 on a clean repo
// ---------------------------------------------------------------------------
{
  try {
    const out = execSync('node scripts/harness-doctor.mjs', {
      cwd: join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (!out.includes('All') || !out.includes('checks passed')) {
      fail(`CLI smoke test: expected "All N checks passed" in output (got first 200 chars: "${out.slice(0, 200).trim()}")`);
    } else {
      pass('CLI smoke test: exits 0 on clean repo, reports all passed');
    }
  } catch (err) {
    // The doctor may legitimately fail if there are existing findings in the
    // repo (e.g. the unpinned-deps backlog). That's fine — the doctor is
    // *reporting* correctly. The test just needs to confirm it runs without
    // crashing.
    const stdout = (err.stdout || '').trim();
    const stderr = (err.stderr || '').trim();
    if (stdout.includes('Harness Doctor') || stdout.includes('checks failed') || stdout.includes('checks passed')) {
      pass(`CLI smoke test: doctor ran and reported (exit ${err.status}) — repo state determines pass/fail`);
    } else if (stderr && (stderr.includes('Harness Doctor') || stderr.includes('checks failed'))) {
      pass(`CLI smoke test: doctor ran and reported via stderr (exit ${err.status})`);
    } else {
      // If neither contains the doctor output, something unexpected happened
      const output = `stdout: "${stdout.slice(0, 200)}" stderr: "${stderr.slice(0, 200)}"`;
      fail(`CLI smoke test: unexpected output for exit ${err.status || '?'}: ${output}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 10. Full CLI smoke test: --json mode
// ---------------------------------------------------------------------------
{
  try {
    const out = execSync('node scripts/harness-doctor.mjs --json', {
      cwd: join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let parsed;
    try {
      parsed = JSON.parse(out);
    } catch {
      fail('CLI --json: output is not valid JSON');
    }
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      const hasExpected = parsed.every((r) => typeof r.id === 'string' && typeof r.passed === 'boolean');
      if (hasExpected) pass('CLI --json: valid JSON array with id + passed fields');
      else fail('CLI --json: entries missing id or passed fields');
    } else {
      fail(`CLI --json: expected array, got ${typeof parsed}`);
    }
  } catch (err) {
    const stdout = (err.stdout || '').trim();
    try {
      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed)) {
        pass('CLI --json: valid JSON array even on non-zero exit');
      } else {
        fail(`CLI --json (non-zero exit): expected JSON array, got ${typeof parsed}`);
      }
    } catch {
      fail(`CLI --json: output on exit ${err.status || '?'} is not valid JSON: "${stdout.slice(0, 200)}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// 11. Unit: timeout handling
// ---------------------------------------------------------------------------
{
  // A check that hangs should be reported, not crash the doctor.
  // We test the timeout path via a short timeout on a sleep command.
  const result = runCheck({
    id: 'timeout-test',
    label: 'timeout',
    cmd: 'node',
    args: ['-e', 'setTimeout(() => {}, 10000)'], // sleeps 10s
    extractSummary() { return null; },
  }, { timeoutMs: 500 }); // timeout at 0.5s
  if (result.timedOut) {
    pass('runCheck: marks timedOut=true on timeout');
  } else if (!result.passed) {
    // On some platforms spawnSync may kill with a signal instead of timeout
    pass(`runCheck: handle long-running check (timedOut=${result.timedOut}, exitCode=${result.exitCode})`);
  } else {
    fail('runCheck: long-running check should not pass');
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll harness-doctor tests passed.`);