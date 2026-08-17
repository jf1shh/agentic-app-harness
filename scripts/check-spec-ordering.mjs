#!/usr/bin/env node
/**
 * Spec-before-code ordering sensor — diff-shaped, zero-dependency.
 *
 * §1 says "NEVER write code without first reading the spec" and §5 says
 * "write the failing test first," but neither is machine-checked beyond
 * senseUnitTests verifying test files exist. fspec enforces the ordering:
 * no code file may change unless its spec was read and its test was written.
 * loopgate forces agents to update specs after each change.
 *
 * This is a lighter approximation: if a PR changes logic files under
 * projects/<app>/src/ (in logic directories: lib, utils, services, engine,
 * core, domain, data, hooks, store, state), check whether:
 *   (a) the matching specs/<app>-spec.md was also touched, OR
 *   (b) at least one *.test.ts file was modified/added for the app.
 *
 * If neither condition is met, report a finding. This doesn't prove the
 * spec was read (that's unprovable), but "spec wasn't even touched and no
 * test was written" is a reliable signal of the vibe-coding pattern §2
 * exists to prevent.
 *
 * Non-blocking sensor initially. Promote to blocking once the backlog of
 * existing violations is at zero for 10 consecutive recorded commits
 * (same sensor→guardrail arc as senseUnitTests, tracked by
 * harness-history.mjs).
 *
 * The PR body may include [spec-unchanged: reason] to silence a finding
 * for changes that genuinely don't need a spec update (e.g. a pure bugfix
 * matching the existing spec).
 *
 * Diff-shaped like check-enum-blast-radius.mjs: compares HEAD against the
 * merge base.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-spec-ordering.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * Logic directories under projects/<app>/src/ that contain code modules.
 * Changes in these directories trigger the spec-ordering check.
 * Matches §5's definition of "logic module" scope.
 */
export const LOGIC_DIRS = [
  'lib', 'utils', 'services', 'engine', 'core', 'domain', 'data',
  'hooks', 'store', 'state',
];

/**
 * Extract app name from a changed file path if it's a logic module.
 * Returns null if the file is not under a recognized logic directory.
 *
 * E.g. 'projects/mood-diner/src/lib/schemas.ts' → 'mood-diner'
 *      'projects/mood-diner/src/App.tsx' → null (not in a logic dir)
 *      'scripts/harness.mjs' → null (not under projects/)
 */
export function extractLogicApp(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const m = norm.match(/^projects\/([^/]+)\/src\/([^/]+)\//);
  if (!m) return null;
  const app = m[1];
  const dir = m[2];
  if (!LOGIC_DIRS.includes(dir)) return null;
  if (norm.endsWith('.test.ts') || norm.endsWith('.test.tsx')) return null;
  return app;
}

/**
 * Check whether a file is a test file for a given app.
 * Matches *.test.ts and *.test.tsx anywhere under projects/<app>/.
 */
export function isTestFileForApp(filePath, app) {
  const norm = filePath.replace(/\\/g, '/');
  if (!norm.startsWith(`projects/${app}/`)) return false;
  return norm.endsWith('.test.ts') || norm.endsWith('.test.tsx');
}

/**
 * The expected spec file path for an app.
 */
export function specPathForApp(app) {
  return `specs/${app}-spec.md`;
}

/**
 * Whether the PR body acknowledges that the spec doesn't need updating.
 * Matches [spec-unchanged: <reason>] anywhere in the body.
 */
export function isSpecUnchangedAcknowledged(body) {
  if (!body) return false;
  return /\[spec-unchanged:\s*[^\]]+\]/.test(body);
}

/**
 * Analyze a list of touched files and a PR body to find apps where logic
 * changed without a spec or test touch.
 *
 * Returns an array of { app, logicFiles, specPath } findings.
 */
export function findOrderingViolations(touchedFiles, body) {
  if (isSpecUnchangedAcknowledged(body)) return [];

  const touchedSet = new Set(touchedFiles.map((f) => f.replace(/\\/g, '/')));

  const appLogicFiles = new Map();
  for (const file of touchedFiles) {
    const app = extractLogicApp(file);
    if (app) {
      if (!appLogicFiles.has(app)) appLogicFiles.set(app, []);
      appLogicFiles.get(app).push(file.replace(/\\/g, '/'));
    }
  }

  const violations = [];
  for (const [app, logicFiles] of appLogicFiles) {
    const specPath = specPathForApp(app);
    const specTouched = touchedSet.has(specPath);

    const hasTestTouch = touchedFiles.some((f) => isTestFileForApp(f, app));

    if (!specTouched && !hasTestTouch) {
      violations.push({ app, logicFiles, specPath });
    }
  }

  return violations;
}

/* -------------------------------------------------------------------- */
/* git plumbing + reporting                                              */
/* -------------------------------------------------------------------- */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const base = arg('--base', 'origin/master');
  const head = arg('--head', 'HEAD');
  const body = process.env.PR_BODY ?? '';

  let mergeBase;
  try {
    mergeBase = git(['merge-base', base, head]).trim();
  } catch {
    console.error(
      `${C.red}Could not find a merge base for ${base}...${head}.${C.reset}\n` +
        'A shallow clone cannot compute this — the workflow needs fetch-depth: 0.',
    );
    process.exit(2);
  }

  const touched = git(['diff', '--name-only', mergeBase, head])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const violations = findOrderingViolations(touched, body);

  if (violations.length === 0) {
    console.log(`${C.dim}Spec-ordering check: no logic-without-spec-or-test pattern detected.${C.reset}`);
    return;
  }

  console.error(`\n${C.yellow}SPEC-ORDERING sensor: ${violations.length} app(s) have logic changes without spec or test updates.${C.reset}`);
  console.error(`${C.dim}(Non-blocking — informational only. Consider updating specs or adding tests.)${C.reset}\n`);

  for (const v of violations) {
    console.error(`  ${C.yellow}[SPEC-ORDERING]${C.reset} ${C.cyan}${v.app}${C.reset}`);
    console.error(`    Spec not touched: ${C.dim}${v.specPath}${C.reset}`);
    console.error(`    No test files modified for this app.`);
    console.error(`    Logic files changed:`);
    for (const f of v.logicFiles) {
      console.error(`      ${C.dim}${f}${C.reset}`);
    }
  }

  console.error(
    `\n${C.dim}§1 says "NEVER write code without first reading the spec" and §5 says\n` +
      '"write the failing test first." To silence this finding, add\n' +
      '[spec-unchanged: <reason>] to the PR body if the change is a pure bugfix\n' +
      `matching the existing spec.${C.reset}`,
  );
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-spec-ordering.mjs');
if (invokedDirectly) main();
