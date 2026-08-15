#!/usr/bin/env node
// Harness Testing Suite — the full per-app gate, in zero-dependency Node ESM.
//
// This is the Node port of test-app.ps1, which remains as a thin wrapper so
// existing CI and docs keep working. The port exists because the PowerShell
// version could only run where `pwsh` does: an agent working in a Linux
// container could not run the authoritative gate at all, so every "verified"
// claim leaned on running the steps by hand and Windows CI was the only real
// check. The loop core (harness-status / emit-tasks / harness-learn) was ported
// to Node for exactly this reason; this was the last PowerShell holdout.
//
// Usage:
//   node scripts/test-app.mjs <AppName>
//   node scripts/test-app.mjs --app <AppName> [--skip-e2e] [--skip-audit]
//   node scripts/test-app.mjs --changed              # gate only the app(s) this diff touches
//   node scripts/test-app.mjs --changed <AppName>    # that app, but skip if the diff doesn't touch it
//
// `--changed` is an inner-loop accelerator, never the authoritative gate: CI
// (ci.yml) still runs the full suite with no `--changed`. It maps files changed
// since `--base`/`--head` (defaults `origin/master`..`HEAD`, a merge-base diff
// like check-secrets.mjs) onto apps — a path under `projects/<app>/` affects
// that app, and anything outside `projects/` (specs, scripts, the root
// lockfile) conservatively widens to *every* app. The mapping is the only pure
// logic here and is pinned down by scripts/test-app.test.mjs.

import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');

const C = { cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m', reset: '\x1b[0m' };

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
// Flags that consume the following token as their value — used to keep a value
// like `--base HEAD` from being mistaken for the positional app name.
const VALUE_FLAGS = new Set(['app', 'base', 'head']);
const valueOf = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i !== -1 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};
const positional = argv.filter((a, idx) =>
  !a.startsWith('--') && !(idx > 0 && VALUE_FLAGS.has(argv[idx - 1].slice(2))),
);
const appName = valueOf('app') || positional[0];

const availableApps = readdirSync(projectsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name);

/* ------------------------------------------------------------------ */
/* Pure core — the `--changed` diff-to-app mapping (self-tested).        */
/* ------------------------------------------------------------------ */

/**
 * The apps a set of changed repo-relative paths can affect.
 *
 * A path equal to, or under, `projects/<app>/` affects exactly that app.
 * Any other path (root files, `specs/`, `scripts/`, an unknown directory
 * under `projects/`) is treated as repo-wide and widens to every app — the
 * conservative call, because a shared dependency, a spec, or a harness change
 * can break any app and a false skip is worse than a redundant run.
 */
export function affectedApps(changedPaths, apps) {
  const touched = new Set();
  let repoWide = false;
  for (const raw of changedPaths) {
    if (typeof raw !== 'string') continue;
    const p = raw.trim().replace(/\\/g, '/');
    if (p === '') continue;
    let matched = false;
    for (const app of apps) {
      if (p === `projects/${app}` || p.startsWith(`projects/${app}/`)) {
        touched.add(app);
        matched = true;
        break;
      }
    }
    if (!matched) repoWide = true;
  }
  if (repoWide) return apps.slice().sort();
  return [...touched].sort();
}

/* ------------------------------------------------------------------ */
/* git plumbing — merge-base diff, same shape as check-secrets.mjs.      */
/* ------------------------------------------------------------------ */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function changedPaths(base, head) {
  const mergeBase = git(['merge-base', base, head]).trim();
  return git(['diff', '--name-only', mergeBase, head])
    .split('\n').map((s) => s.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Single-app gate. Runs the full suite for one app and reports.         */
/* ------------------------------------------------------------------ */

function runAppGate(appName, { skipE2e, skipAudit }) {
  const appPath = join(projectsDir, appName);

  // --- cleanup (mirrors clean-app.ps1) ---------------------------------------
  const CLEAN_TARGETS = ['.next', '.next-prod', 'dist', 'build', '.vite', 'playwright-report', 'test-results', 'coverage', 'tsconfig.tsbuildinfo'];
  function clean(label) {
    console.log(`\n${C.cyan}[clean] ${label}${C.reset}`);
    for (const t of CLEAN_TARGETS) {
      try { rmSync(join(appPath, t), { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }

  // --- browser resolution ----------------------------------------------------
  // Playwright pins an exact browser build. Where that build cannot be downloaded
  // (offline or network-restricted containers), fall back to a system Chromium
  // and hand it to the app config via HARNESS_CHROMIUM_PATH, which every app's
  // playwright.config.ts honours. Unset in normal CI, so this changes nothing there.
  const SYSTEM_CHROMIUM = [
    process.env.HARNESS_CHROMIUM_PATH,
    process.env.CHROME_PATH,
    '/opt/pw-browsers/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];

  function resolveBrowsers() {
    const install = run('npx playwright install --with-deps chromium', { capture: true, allowFail: true });
    if (install.ok) return {};
    const found = SYSTEM_CHROMIUM.find((p) => p && existsSync(p));
    if (found) {
      console.log(`${C.yellow}  Playwright could not install its pinned browser; falling back to ${found}${C.reset}`);
      return { HARNESS_CHROMIUM_PATH: found };
    }
    console.log(`${C.yellow}  Playwright could not install a browser and no system Chromium was found.${C.reset}`);
    return {};
  }

  // --- step runner -----------------------------------------------------------
  function run(command, { capture = false, allowFail = false, env = {} } = {}) {
    const r = spawnSync(command, {
      cwd: appPath, shell: true,
      stdio: capture ? 'pipe' : 'inherit',
      env: { ...process.env, ...env },
    });
    const ok = r.status === 0;
    if (!ok && capture && !allowFail && r.stdout) process.stdout.write(r.stdout.toString());
    return { ok, status: r.status, stdout: capture && r.stdout ? r.stdout.toString() : '' };
  }

  const results = [];
  function step(name, command, { advisory = false, env = {} } = {}) {
    console.log(`\n${C.cyan}[${name}]${C.reset}`);
    const { ok } = run(command, { env });
    if (ok) {
      console.log(`${C.green}  ${name} PASSED${C.reset}`);
    } else if (advisory) {
      console.log(`${C.yellow}  ${name} WARNING (advisory, non-blocking — review above)${C.reset}`);
    } else {
      console.log(`${C.red}  ${name} FAILED${C.reset}`);
    }
    results.push({ name, ok, advisory });
    return ok;
  }

  // --- run -------------------------------------------------------------------
  console.log(`${C.cyan}=========================================${C.reset}`);
  console.log(`${C.cyan} Harness Testing Suite — ${appName}${C.reset}`);
  console.log(`${C.cyan}=========================================${C.reset}`);

  clean('pre-build');

  // Check the actual test-runner binary resolves from the app, not just that
  // node_modules exists: the repo root is an npm workspace (root package.json,
  // projects/*), so a shared devDependency like @playwright/test is commonly
  // hoisted to the root node_modules rather than nested under appPath — a plain
  // `existsSync(appPath/node_modules/...)` check would always miss it and
  // re-run `npm install` on every invocation. Resolve it the way Node actually
  // would from inside the app.
  function resolvesFromApp(specifier) {
    try {
      createRequire(join(appPath, 'package.json')).resolve(specifier);
      return true;
    } catch {
      return false;
    }
  }

  if (!resolvesFromApp('@playwright/test/package.json')) {
    // `npm install`, not `npm ci`: with the vite 8 / rolldown toolchain `npm ci`
    // can skip a platform's optional native binary, which then fails at build time.
    // Run from the app dir — npm 7+ detects the workspace root (repo-root
    // package.json) and manages the single root lockfile regardless of cwd.
    step('Install dependencies', 'npm install');
  }

  if (!skipAudit) {
    // Advisory: a transitive advisory is usually unrelated to the change under
    // test and unfixable from here. The real gates are below.
    step('Security & dependency audit', 'npm audit --audit-level=high', { advisory: true });
  }

  step('Lint & static analysis', 'npm run lint');
  step('Type check', 'npx tsc --noEmit');
  step('Unit tests (Vitest)', 'npx vitest run');

  if (!skipE2e) {
    console.log(`\n${C.cyan}[E2E & accessibility (Playwright)]${C.reset}`);
    const browserEnv = resolveBrowsers();
    step('E2E & a11y tests', 'npx playwright test', { env: browserEnv });
  }

  clean('post-test');

  // --- summary ---------------------------------------------------------------
  const failed = results.filter((r) => !r.ok && !r.advisory);
  const warned = results.filter((r) => !r.ok && r.advisory);

  console.log(`\n${C.cyan}=========================================${C.reset}`);
  for (const r of results) {
    const mark = r.ok ? `${C.green}PASS${C.reset}` : (r.advisory ? `${C.yellow}WARN${C.reset}` : `${C.red}FAIL${C.reset}`);
    console.log(`  ${mark}  ${r.name}`);
  }
  if (failed.length === 0) {
    console.log(`\n${C.green}ALL HARNESS CHECKS PASSED FOR ${appName}!${C.reset}`);
    if (warned.length) console.log(`${C.gray}(${warned.length} advisory warning(s) above do not fail the suite.)${C.reset}`);
  } else {
    console.log(`\n${C.red}${failed.length} CHECK(S) FAILED for ${appName}: ${failed.map((f) => f.name).join(', ')}${C.reset}`);
  }
  return failed.length === 0;
}

/* ------------------------------------------------------------------ */
/* CLI                                                                    */
/* ------------------------------------------------------------------ */

function usage() {
  console.error('Usage: node scripts/test-app.mjs <AppName>');
  console.error('       node scripts/test-app.mjs --changed [<AppName>] [--base <ref>] [--head <ref>]');
  console.error(`Available apps: ${availableApps.join(', ')}`);
  process.exit(2);
}

function validateApp(name) {
  // Resolve the app by exact membership in projects/, NOT by testing whether
  // join(projectsDir, name) happens to exist. `existsSync` is true for a
  // traversal too: `--app ../..` resolves above the repo, passes an existence
  // check, and then clean() runs `rmSync(<that dir>/dist, { recursive: true,
  // force: true })` — deleting dist/, build/, coverage/ and .next/ OUTSIDE the
  // repo before `npm install` and the test commands run there under `shell: true`.
  // An allow-list drawn from the real directory listing makes traversal, absolute
  // paths and shell metacharacters unrepresentable rather than merely unlikely.
  if (!availableApps.includes(name)) {
    console.error(`${C.red}Error: '${name}' is not a project in projects/.${C.reset}`);
    console.error(`Available: ${availableApps.join(', ')}`);
    process.exit(1);
  }
}

function main() {
  const skipE2e = flag('skip-e2e');
  const skipAudit = flag('skip-audit');

  if (!flag('changed')) {
    if (!appName) usage();
    validateApp(appName);
    process.exit(runAppGate(appName, { skipE2e, skipAudit }) ? 0 : 1);
  }

  // `--changed`: diff-to-app selection. Never the authoritative gate — CI runs
  // the full suite. Skip a false "green" on an app the diff never touched.
  const base = valueOf('base') || 'origin/master';
  const head = valueOf('head') || 'HEAD';
  let paths;
  try {
    paths = changedPaths(base, head);
  } catch {
    console.error(
      `${C.red}Could not compute changed files for ${base}...${head}.${C.reset}\n` +
        'A shallow clone cannot compute the merge base — the workflow needs fetch-depth: 0.',
    );
    process.exit(2);
  }
  const affected = affectedApps(paths, availableApps);

  if (appName) {
    validateApp(appName);
    if (!affected.includes(appName)) {
      console.log(`${C.gray}No changes affect ${appName}; skipping (--changed). Re-run without --changed for the full gate.${C.reset}`);
      process.exit(0);
    }
    process.exit(runAppGate(appName, { skipE2e, skipAudit }) ? 0 : 1);
  }

  if (affected.length === 0) {
    console.log(`${C.gray}No changes affect any app; nothing to run (--changed).${C.reset}`);
    process.exit(0);
  }

  console.log(`${C.cyan}Running the gate for ${affected.length} affected app(s): ${affected.join(', ')}${C.reset}`);
  let allPassed = true;
  for (const app of affected) {
    if (!runAppGate(app, { skipE2e, skipAudit })) allPassed = false;
  }
  process.exit(allPassed ? 0 : 1);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('test-app.mjs');
if (invokedDirectly) main();
