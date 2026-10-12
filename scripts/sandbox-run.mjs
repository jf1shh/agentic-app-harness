#!/usr/bin/env node
/**
 * Sandboxed command runner for the Act and Verify stages — MXC, network denied by default.
 *
 * check-containment.mjs only checks WHICH FILES a diff touches. It cannot stop an
 * agent-generated test command (a postinstall hook, a malicious test, a model's
 * "quick curl") from reaching the network or writing outside the app. This runner
 * executes such a command inside an MXC (Microsoft eXecution Containers,
 * https://github.com/microsoft/mxc) sandbox via its Node SDK — Bubblewrap on Linux —
 * with outbound network DENIED unless --allow-network is passed, the repo mounted
 * read-only, and only the named app directory (plus a scratch tmp dir) writable.
 *
 * Fails closed: if the SDK is not installed or the host cannot sandbox, the command
 * is NOT run unsandboxed; the runner exits 3 and says why. The SDK is an optional,
 * out-of-tree dependency (Node >= 24; ~100 MB of native binaries), so it is never
 * added to the root package.json (.agents/AGENTS.md §8 zero-dependency harness
 * scripts). Install it anywhere and point MXC_SDK_PATH at its v1 entry, e.g.
 *   npm i --prefix ~/.cache/mxc @microsoft/mxc-sdk@1.0.0
 *   export MXC_SDK_PATH=~/.cache/mxc/node_modules/@microsoft/mxc-sdk/dist/v1/index.js
 * MXC creation telemetry is left disabled (telemetry: { enabled: false }).
 *
 * Usage:
 *   node scripts/sandbox-run.mjs [--app <dir>] [--allow-network] [--timeout <s>] -- <command...>
 *   node scripts/sandbox-run.mjs --app projects/mood-diner -- npx vitest run
 * Exit codes: the workload's exit code; 3 = sandbox unavailable (nothing ran); 2 = bad args;
 * 124 = timed out.
 */

import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..');
export const DEFAULT_TIMEOUT_S = 900;
export const EXIT_UNAVAILABLE = 3;
export const EXIT_USAGE = 2;
export const EXIT_TIMEOUT = 124;

/* -------------------------------------------------------------------- */
/* Pure core — what sandbox-run.test.mjs exercises.                       */
/* -------------------------------------------------------------------- */

export function parseArgs(argv) {
  const out = { app: null, allowNetwork: false, timeoutS: DEFAULT_TIMEOUT_S, command: [], error: null };
  const sep = argv.indexOf('--');
  const flags = sep === -1 ? argv : argv.slice(0, sep);
  out.command = sep === -1 ? [] : argv.slice(sep + 1);
  for (let i = 0; i < flags.length; i += 1) {
    const f = flags[i];
    if (f === '--allow-network') out.allowNetwork = true;
    else if (f === '--app') out.app = flags[++i] ?? null;
    else if (f === '--timeout') out.timeoutS = Number(flags[++i]);
    else { out.error = `unknown flag: ${f}`; return out; }
  }
  if (!out.command.length) out.error = 'no command: put it after --';
  else if (!Number.isFinite(out.timeoutS) || out.timeoutS <= 0) out.error = '--timeout must be a positive number of seconds';
  else if (out.app === null && flags.includes('--app')) out.error = '--app needs a directory';
  return out;
}

/** POSIX single-quote one argv element so the sandbox shell sees it verbatim. */
export function shellQuote(arg) {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(arg)) return arg;
  return `'${String(arg).replace(/'/g, `'\\''`)}'`;
}

/** App dir must resolve inside the repo (no `..` escape, no absolute outside path). */
export function resolveAppDir(app, repoRoot = REPO_ROOT) {
  if (!app) return null;
  const abs = resolve(repoRoot, app);
  const rel = relative(repoRoot, abs);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`--app must be a directory inside the repo: ${app}`);
  }
  return abs;
}

/**
 * The MXC ContainerRequest. Network egress is denied unless allowNetwork; the repo is
 * read-only; only the app dir (if any) and a scratch tmp dir are writable.
 */
export function buildRequest({ command, cwd, appDir = null, scratchDir, allowNetwork = false, timeoutS = DEFAULT_TIMEOUT_S, repoRoot = REPO_ROOT }) {
  const readwritePaths = [scratchDir, ...(appDir ? [appDir] : [])].filter(Boolean);
  return {
    command: command.map(shellQuote).join(' '),
    workingDirectory: cwd,
    filesystem: { readonlyPaths: [repoRoot], readwritePaths },
    network: { egress: { default: allowNetwork ? 'allow' : 'deny' } },
    environment: { TMPDIR: scratchDir, CI: '1' },
    timeoutMs: Math.round(timeoutS * 1000),
  };
}

/** Run options: MXC creation telemetry explicitly off. */
export const RUN_OPTIONS = Object.freeze({ telemetry: { enabled: false } });

/** Map an MXC ExecutionResult to a process exit code. */
export function exitCodeOf(result) {
  if (result?.timedOut) return EXIT_TIMEOUT;
  return Number.isInteger(result?.exitCode) ? result.exitCode : 1;
}

/** Load the SDK v1 module, or return { error } — never throws. */
export async function loadSdk(env = process.env, importer = (spec) => import(spec)) {
  const spec = env.MXC_SDK_PATH ? pathToFileURL(resolve(env.MXC_SDK_PATH)).href : '@microsoft/mxc-sdk/v1';
  try {
    const sdk = await importer(spec);
    if (typeof sdk?.run !== 'function') return { error: `${spec} has no run() export` };
    if (typeof sdk.getPlatformSupport === 'function') {
      const support = sdk.getPlatformSupport();
      if (!support?.isSupported) return { error: `MXC not supported on this host: ${JSON.stringify(support)}` };
    }
    return { sdk };
  } catch (e) {
    return { error: `MXC SDK not loadable (${spec}): ${e?.message ?? e}` };
  }
}

/**
 * Run one command sandboxed. Returns { code, stdout, stderr, request, error }.
 * deps.loadSdk / deps.mkScratch are injectable for the self-test.
 */
export async function runSandboxed(opts, deps = {}) {
  const load = deps.loadSdk ?? (() => loadSdk());
  const mkScratch = deps.mkScratch ?? (() => mkdtempSync(join(tmpdir(), 'mxc-run-')));
  const appDir = resolveAppDir(opts.app, opts.repoRoot ?? REPO_ROOT);
  const { sdk, error } = await load();
  if (error) return { code: EXIT_UNAVAILABLE, stdout: '', stderr: '', request: null, error };
  const scratchDir = mkScratch();
  const request = buildRequest({ ...opts, appDir, scratchDir, cwd: appDir ?? (opts.repoRoot ?? REPO_ROOT) });
  try {
    const result = await sdk.run(request, RUN_OPTIONS);
    return { code: exitCodeOf(result), stdout: result?.stdout ?? '', stderr: result?.stderr ?? '', request, error: null };
  } catch (e) {
    return { code: EXIT_UNAVAILABLE, stdout: '', stderr: '', request, error: `MXC run failed: ${e?.message ?? e}` };
  }
}

/* -------------------------------------------------------------------- */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    console.error(`sandbox-run: ${args.error}\nusage: node scripts/sandbox-run.mjs [--app <dir>] [--allow-network] [--timeout <s>] -- <command...>`);
    process.exit(EXIT_USAGE);
  }
  let res;
  try {
    res = await runSandboxed(args);
  } catch (e) {
    console.error(`sandbox-run: ${e.message}`);
    process.exit(EXIT_USAGE);
  }
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) console.error(`sandbox-run: ${res.error} — command NOT run (fails closed).`);
  else console.error(`sandbox-run: exit ${res.code} (network ${args.allowNetwork ? 'ALLOWED' : 'denied'})`);
  process.exit(res.code);
}

if (process.argv[1] && process.argv[1].endsWith('sandbox-run.mjs')) main();
