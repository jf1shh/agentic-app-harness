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

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');

const C = { cyan: '\x1b[36m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', gray: '\x1b[90m', reset: '\x1b[0m' };

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const valueOf = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : null; };
const appName = valueOf('app') || argv.find((a) => !a.startsWith('--'));

if (!appName) {
  console.error('Usage: node scripts/test-app.mjs <AppName>');
  console.error(`Available: ${readdirSync(projectsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory()).map((e) => e.name).join(', ')}`);
  process.exit(2);
}

const appPath = join(projectsDir, appName);
if (!existsSync(appPath)) {
  console.error(`${C.red}Error: project '${appName}' does not exist at ${appPath}${C.reset}`);
  process.exit(1);
}

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

// Check the actual test-runner binary, not just node_modules: a top-level install
// can leave node_modules present while the app's devDependencies are missing.
if (!existsSync(join(appPath, 'node_modules', '@playwright', 'test'))) {
  // `npm install`, not `npm ci`: with the vite 8 / rolldown toolchain `npm ci`
  // can skip a platform's optional native binary, which then fails at build time.
  step('Install dependencies', 'npm install');
}

if (!flag('skip-audit')) {
  // Advisory: a transitive advisory is usually unrelated to the change under
  // test and unfixable from here. The real gates are below.
  step('Security & dependency audit', 'npm audit --audit-level=high', { advisory: true });
}

step('Lint & static analysis', 'npm run lint');
step('Type check', 'npx tsc --noEmit');
step('Unit tests (Vitest)', 'npx vitest run');

if (!flag('skip-e2e')) {
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
  process.exit(0);
}
console.log(`\n${C.red}${failed.length} CHECK(S) FAILED for ${appName}: ${failed.map((f) => f.name).join(', ')}${C.reset}`);
process.exit(1);
