#!/usr/bin/env node
/**
 * Self-test for sandbox-run.mjs. Pure core with a fake SDK (no sandbox needed), plus an
 * opt-in live check when MXC_SDK_PATH points at an installed @microsoft/mxc-sdk: echo
 * runs, outbound network is denied by default, and a write outside the app dir fails.
 * Same ok()/failures shape as the other harness self-tests.
 */

import {
  parseArgs, shellQuote, resolveAppDir, buildRequest, exitCodeOf, loadSdk, runSandboxed,
  RUN_OPTIONS, REPO_ROOT, EXIT_UNAVAILABLE, EXIT_TIMEOUT, DEFAULT_TIMEOUT_S,
} from './sandbox-run.mjs';
import { join } from 'node:path';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else { console.error(`✗ ${label}`); failures += 1; }
};

/* ---- parseArgs ---- */
const a = parseArgs(['--app', 'projects/mood-diner', '--', 'npx', 'vitest', 'run']);
ok(a.error === null && a.app === 'projects/mood-diner', 'parseArgs: --app parsed');
ok(a.allowNetwork === false, 'parseArgs: network denied by default');
ok(a.timeoutS === DEFAULT_TIMEOUT_S, 'parseArgs: default timeout');
ok(a.command.join(' ') === 'npx vitest run', 'parseArgs: command after --');
ok(parseArgs(['--allow-network', '--', 'x']).allowNetwork === true, 'parseArgs: --allow-network opts in');
ok(parseArgs(['--', ]).error !== null, 'parseArgs: empty command rejected');
ok(parseArgs(['--bogus', '--', 'x']).error !== null, 'parseArgs: unknown flag rejected');
ok(parseArgs(['--timeout', '0', '--', 'x']).error !== null, 'parseArgs: zero timeout rejected');

/* ---- shellQuote ---- */
ok(shellQuote('vitest') === 'vitest', 'shellQuote: plain word untouched');
ok(shellQuote("a b") === "'a b'", 'shellQuote: space quoted');
ok(shellQuote("it's; rm -rf /") === `'it'\\''s; rm -rf /'`, 'shellQuote: quote and ; neutralised');
ok(shellQuote('$(curl x)') === "'$(curl x)'", 'shellQuote: command substitution neutralised');

/* ---- resolveAppDir ---- */
ok(resolveAppDir('projects/mood-diner') === join(REPO_ROOT, 'projects/mood-diner'), 'resolveAppDir: inside repo');
let threw = false; try { resolveAppDir('../outside'); } catch { threw = true; }
ok(threw, 'resolveAppDir: .. escape rejected');
threw = false; try { resolveAppDir('/etc'); } catch { threw = true; }
ok(threw, 'resolveAppDir: absolute outside path rejected');
threw = false; try { resolveAppDir('.'); } catch { threw = true; }
ok(threw, 'resolveAppDir: repo root itself is not a writable app dir');

/* ---- buildRequest ---- */
const req = buildRequest({ command: ['npm', 'test'], cwd: '/r/p', appDir: '/r/p', scratchDir: '/tmp/s', repoRoot: '/r' });
ok(req.network.egress.default === 'deny', 'buildRequest: egress deny by default');
ok(buildRequest({ command: ['x'], cwd: '/r', scratchDir: '/tmp/s', repoRoot: '/r', allowNetwork: true }).network.egress.default === 'allow',
  'buildRequest: allowNetwork flips egress to allow');
ok(req.filesystem.readonlyPaths.length === 1 && req.filesystem.readonlyPaths[0] === '/r', 'buildRequest: repo read-only');
ok(!req.filesystem.readwritePaths.includes('/r'), 'buildRequest: repo root never writable');
ok(req.filesystem.readwritePaths.includes('/r/p') && req.filesystem.readwritePaths.includes('/tmp/s'), 'buildRequest: app + scratch writable');
ok(req.command === 'npm test' && req.timeoutMs === DEFAULT_TIMEOUT_S * 1000, 'buildRequest: command + timeout');
ok(RUN_OPTIONS.telemetry.enabled === false, 'RUN_OPTIONS: MXC telemetry explicitly off');

/* ---- exitCodeOf ---- */
ok(exitCodeOf({ exitCode: 0 }) === 0 && exitCodeOf({ exitCode: 7 }) === 7, 'exitCodeOf: passes workload code');
ok(exitCodeOf({ exitCode: 0, timedOut: true }) === EXIT_TIMEOUT, 'exitCodeOf: timeout -> 124');
ok(exitCodeOf({}) === 1, 'exitCodeOf: missing code -> 1');

/* ---- loadSdk / runSandboxed (fake SDK) ---- */
const missing = await loadSdk({ MXC_SDK_PATH: '/nonexistent/mxc/v1/index.js' });
ok(typeof missing.error === 'string' && !missing.sdk, 'loadSdk: missing SDK -> error, no throw');
const unsupported = await loadSdk({}, async () => ({ run() {}, getPlatformSupport: () => ({ isSupported: false }) }));
ok(/not supported/.test(unsupported.error ?? ''), 'loadSdk: unsupported host -> error');

let ran = false;
const down = await runSandboxed({ command: ['echo', 'hi'] }, { loadSdk: async () => ({ error: 'no sdk' }) });
ok(down.code === EXIT_UNAVAILABLE && down.error === 'no sdk' && !ran, 'runSandboxed: fails closed when SDK absent');

let seen = null;
const fake = { run: async (r, o) => { seen = { r, o }; return { exitCode: 5, stdout: 'out', stderr: '' }; } };
const res = await runSandboxed({ command: ['npm', 'test'], app: 'projects/mood-diner' },
  { loadSdk: async () => ({ sdk: fake }), mkScratch: () => '/tmp/fake-scratch' });
ok(res.code === 5 && res.stdout === 'out', 'runSandboxed: returns workload result');
ok(seen.r.network.egress.default === 'deny', 'runSandboxed: request denies network');
ok(seen.o.telemetry.enabled === false, 'runSandboxed: telemetry off on run()');
ok(seen.r.workingDirectory === join(REPO_ROOT, 'projects/mood-diner'), 'runSandboxed: cwd is the app dir');
const boom = await runSandboxed({ command: ['x'] }, { loadSdk: async () => ({ sdk: { run: async () => { throw new Error('bwrap failed'); } } }), mkScratch: () => '/tmp/s' });
ok(boom.code === EXIT_UNAVAILABLE && /bwrap failed/.test(boom.error), 'runSandboxed: SDK error -> exit 3, reported');

/* ---- live (opt-in): real MXC sandbox ---- */
if (process.env.MXC_SDK_PATH) {
  const live = (command, extra = {}) => runSandboxed({ command, timeoutS: 60, ...extra });
  const echo = await live(['node', '-e', 'console.log("sandbox-ok")']);
  ok(echo.code === 0 && echo.stdout.includes('sandbox-ok'), `live: node runs in sandbox (code ${echo.code}${echo.error ? ', ' + echo.error : ''})`);
  const net = await live(['node', '-e',
    'fetch("http://1.1.1.1",{signal:AbortSignal.timeout(8000)}).then(()=>{console.log("NET-OPEN");process.exit(0)}).catch(e=>{console.log("NET-BLOCKED",e.cause?.code||e.name);process.exit(9)})']);
  ok(net.code !== 0 && !net.stdout.includes('NET-OPEN'), `live: outbound network denied by default (code ${net.code}, ${net.stdout.trim()})`);
  const write = await live(['node', '-e', `require("fs").writeFileSync(${JSON.stringify(join(REPO_ROOT, 'SANDBOX-ESCAPE.txt'))}, "x")`]);
  ok(write.code !== 0, `live: write to read-only repo root fails (code ${write.code})`);
} else {
  console.log('- live MXC checks skipped (set MXC_SDK_PATH to an installed @microsoft/mxc-sdk v1 entry)');
}

if (failures) { console.error(`\n${failures} sandbox-run self-test failure(s)`); process.exit(1); }
console.log('\nsandbox-run self-test: all passed');
