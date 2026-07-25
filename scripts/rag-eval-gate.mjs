#!/usr/bin/env node
// Harness gate: LexiVault retrieval-precision (RAG).
//
// Runs the promptfoo eval in projects/legal-financial-rag (a deterministic,
// LLM-free run of the app's real hybrid search engine over a golden query set),
// then enforces quality thresholds:
//   - precision@K : share of golden queries whose expected document is in the topK
//   - MRR         : mean reciprocal rank of the expected document
//
// Exits non-zero (blocking) if either metric falls below its floor, so a change
// that quietly degrades retrieval ranking fails CI the same way a guardrail
// regression does. Zero-dependency Node ESM — no PowerShell required.

import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..', 'projects', 'legal-financial-rag');

// Config path is relative to APP_DIR; overridable for negative testing.
const CONFIG = process.argv[2] || 'eval/promptfooconfig.yaml';

// Quality floors. Set just below the current deterministic baseline so the gate
// catches a real ranking regression without flaking. Raise as the engine improves.
const MIN_PRECISION_AT_K = 0.9; // ≥ 90% of golden queries retrieve the right doc in topK
const MIN_MRR = 0.75; // mean reciprocal rank of the expected document

const C = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
};

function header(title) {
  console.log(`${C.cyan}=========================================${C.reset}`);
  console.log(`${C.cyan} ${title}${C.reset}`);
  console.log(`${C.cyan}=========================================${C.reset}`);
}

// Resolve promptfoo's JS entrypoint and run it with `node` directly, rather than
// the platform `.bin` shim: since Node's CVE-2024-27980 fix, spawnSync cannot
// launch a Windows `.cmd`/`.bat` without shell:true (it errors EINVAL), which
// silently broke this gate on the windows-latest CI runner. Invoking the JS with
// process.execPath is uniform across Windows/macOS/Linux.
function resolvePromptfooEntry() {
  const pkgPath = join(APP_DIR, 'node_modules', 'promptfoo', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.promptfoo;
  if (!rel) throw new Error('promptfoo package.json has no bin entry');
  return join(APP_DIR, 'node_modules', 'promptfoo', rel);
}

// promptfoo's output JSON shape has shifted across versions; find the per-case
// results array defensively rather than hard-coding a path.
function extractResults(data) {
  const candidates = [data?.results?.results, data?.results, data?.evalResults];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length && typeof c[0] === 'object' && 'success' in c[0]) return c;
  }
  if (Array.isArray(data)) return data;
  return null;
}

function main() {
  header('Harness Gate — RAG Retrieval Precision');

  let entry;
  try {
    entry = resolvePromptfooEntry();
  } catch {
    console.error(`${C.red}promptfoo is not installed in ${APP_DIR}.${C.reset}`);
    console.error(`${C.gray}Run 'npm install' in projects/legal-financial-rag first.${C.reset}`);
    process.exit(2);
  }

  const outDir = mkdtempSync(join(tmpdir(), 'rag-eval-'));
  const outFile = join(outDir, 'results.json');

  const run = spawnSync(
    process.execPath,
    [entry, 'eval', '-c', CONFIG, '--output', outFile, '--no-cache'],
    {
      cwd: APP_DIR,
      encoding: 'utf8',
      env: {
        ...process.env,
        PROMPTFOO_DISABLE_TELEMETRY: '1',
        PROMPTFOO_DISABLE_UPDATE: '1',
        PROMPTFOO_DISABLE_SHARING: '1',
      },
    },
  );

  let data;
  try {
    data = JSON.parse(readFileSync(outFile, 'utf8'));
  } catch (e) {
    console.error(`${C.red}Could not read promptfoo output (${e.message}).${C.reset}`);
    if (run.error) console.error(`${C.gray}spawn error: ${run.error.message}${C.reset}`);
    console.error(`${C.gray}promptfoo exit code: ${run.status}${C.reset}`);
    if (run.stdout) console.error(run.stdout.slice(-2000));
    if (run.stderr) console.error(run.stderr.slice(-2000));
    process.exit(2);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }

  const results = extractResults(data);
  if (!results) {
    console.error(`${C.red}Unexpected promptfoo output shape — no results array found.${C.reset}`);
    process.exit(2);
  }

  const total = results.length;
  let hits = 0;
  let rrSum = 0;
  const failures = [];

  for (const r of results) {
    const score = typeof r.score === 'number' ? r.score : 0;
    rrSum += score;
    if (r.success) hits += 1;
    else {
      const q = r.vars?.query || r.testCase?.vars?.query || r.description || '(unknown query)';
      const reason = r.gradingResult?.reason || r.error || 'below topK';
      failures.push({ q, reason });
    }
  }

  const precisionAtK = total ? hits / total : 0;
  const mrr = total ? rrSum / total : 0;

  console.log(
    `Golden queries: ${total} | In-topK: ${hits}/${total} | ` +
      `precision@K: ${(precisionAtK * 100).toFixed(1)}% | MRR: ${mrr.toFixed(3)}`,
  );

  if (failures.length) {
    console.log(`\n${C.yellow}Cases outside topK:${C.reset}`);
    for (const f of failures) console.log(`${C.gray}  • ${f.q}\n      ${f.reason}${C.reset}`);
  }

  const precisionOk = precisionAtK >= MIN_PRECISION_AT_K;
  const mrrOk = mrr >= MIN_MRR;

  console.log('');
  console.log(
    `precision@K ${precisionOk ? C.green + 'PASS' : C.red + 'FAIL'}${C.reset} ` +
      `(${(precisionAtK * 100).toFixed(1)}% ≥ ${(MIN_PRECISION_AT_K * 100).toFixed(0)}%)`,
  );
  console.log(
    `MRR         ${mrrOk ? C.green + 'PASS' : C.red + 'FAIL'}${C.reset} ` +
      `(${mrr.toFixed(3)} ≥ ${MIN_MRR.toFixed(2)})`,
  );

  if (precisionOk && mrrOk) {
    console.log(`\n${C.green}RAG retrieval-precision gate PASSED.${C.reset}`);
    process.exit(0);
  }
  console.error(`\n${C.red}RAG retrieval-precision gate FAILED: retrieval quality below floor.${C.reset}`);
  process.exit(1);
}

main();
