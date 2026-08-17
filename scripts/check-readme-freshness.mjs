#!/usr/bin/env node
/**
 * README freshness sensor — diff-shaped, zero-dependency, non-blocking.
 *
 * §7 says agents MUST update all relevant README.md files when features
 * change, and §10.2's Definition of Done includes "README.md / HANDOFF.md
 * updated if this changes the app's state or feature set." Neither is
 * machine-checked today.
 *
 * This sensor flags a PR when:
 *   (a) any file under projects/<app>/src/ changed, but neither
 *       projects/<app>/README.md nor the root README.md was touched, OR
 *   (b) any harness infrastructure file (scripts/*.mjs, .agents/AGENTS.md,
 *       .github/workflows/*.yml) changed, but the root README.md was not
 *       touched.
 *
 * The PR body may include [readme-unchanged: reason] to silence the
 * finding for changes that genuinely don't need a README update (e.g.
 * a pure bugfix, a test-only change, or a refactor with no user-visible
 * effect).
 *
 * Non-blocking sensor initially, following the same sensor→guardrail
 * promotion arc as senseUnitTests and check-spec-ordering.mjs (§8).
 *
 * Diff-shaped like check-spec-ordering.mjs: compares HEAD against the
 * merge base.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-readme-freshness.mjs --base origin/master --head HEAD
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
 * Directories under projects/<app>/src/ whose changes should trigger
 * the README freshness check. Intentionally broad — any src/ change
 * could warrant a README update.
 */
const APP_SRC_RE = /^projects\/([^/]+)\/src\//;

/**
 * Harness infrastructure patterns — changes here should trigger a
 * root README freshness check.
 */
const INFRA_PATTERNS = [
  /^scripts\/[^/]+\.mjs$/,
  /^\.agents\/AGENTS\.md$/,
  /^\.github\/workflows\/[^/]+\.yml$/,
];

/**
 * Extract app name from a changed file path if it's under src/.
 * Returns null if the file is not under projects/<app>/src/.
 *
 * E.g. 'projects/mood-diner/src/lib/schemas.ts' → 'mood-diner'
 *      'projects/mood-diner/package.json' → null
 *      'scripts/harness.mjs' → null
 */
export function extractAppFromSrc(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  const m = norm.match(APP_SRC_RE);
  return m ? m[1] : null;
}

/**
 * Whether a file path is a harness infrastructure file.
 */
export function isInfraFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return INFRA_PATTERNS.some((re) => re.test(norm));
}

/**
 * The expected README path for an app.
 */
export function readmePathForApp(app) {
  return `projects/${app}/README.md`;
}

/**
 * Whether the PR body acknowledges that READMEs don't need updating.
 * Matches [readme-unchanged: <reason>] anywhere in the body.
 */
export function isReadmeUnchangedAcknowledged(body) {
  if (!body) return false;
  return /\[readme-unchanged:\s*[^\]]+\]/.test(body);
}

/**
 * Analyze a list of touched files and a PR body to find apps (or infra)
 * where source changed without a README update.
 *
 * Returns an array of findings:
 *   { scope: 'app', app, srcFiles, readmePath }
 *   { scope: 'infra', infraFiles }
 */
export function findReadmeViolations(touchedFiles, body) {
  if (isReadmeUnchangedAcknowledged(body)) return [];

  const touchedSet = new Set(touchedFiles.map((f) => f.replace(/\\/g, '/')));

  // App-level: group src/ changes by app
  const appSrcFiles = new Map();
  for (const file of touchedFiles) {
    const app = extractAppFromSrc(file);
    if (app) {
      if (!appSrcFiles.has(app)) appSrcFiles.set(app, []);
      appSrcFiles.get(app).push(file.replace(/\\/g, '/'));
    }
  }

  const violations = [];

  // Check each app: did its README or the root README get touched?
  for (const [app, srcFiles] of appSrcFiles) {
    const appReadme = readmePathForApp(app);
    const appReadmeTouched = touchedSet.has(appReadme);
    const rootReadmeTouched = touchedSet.has('README.md');

    if (!appReadmeTouched && !rootReadmeTouched) {
      violations.push({ scope: 'app', app, srcFiles, readmePath: appReadme });
    }
  }

  // Infra-level: did any infra file change without root README?
  const infraFiles = touchedFiles
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => isInfraFile(f));

  if (infraFiles.length > 0 && !touchedSet.has('README.md')) {
    violations.push({ scope: 'infra', infraFiles });
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

  const violations = findReadmeViolations(touched, body);

  if (violations.length === 0) {
    console.log(`${C.dim}README-freshness check: no stale-README pattern detected.${C.reset}`);
    return;
  }

  console.error(`\n${C.yellow}README-FRESHNESS sensor: ${violations.length} finding(s) — source changed without a README update.${C.reset}`);
  console.error(`${C.dim}(Non-blocking — informational only. Consider updating the relevant README.)${C.reset}\n`);

  for (const v of violations) {
    if (v.scope === 'app') {
      console.error(`  ${C.yellow}[README-FRESHNESS]${C.reset} ${C.cyan}${v.app}${C.reset}`);
      console.error(`    README not touched: ${C.dim}${v.readmePath}${C.reset}`);
      console.error(`    Source files changed:`);
      for (const f of v.srcFiles) {
        console.error(`      ${C.dim}${f}${C.reset}`);
      }
    } else {
      console.error(`  ${C.yellow}[README-FRESHNESS]${C.reset} ${C.cyan}harness infrastructure${C.reset}`);
      console.error(`    Root README.md not touched.`);
      console.error(`    Infrastructure files changed:`);
      for (const f of v.infraFiles) {
        console.error(`      ${C.dim}${f}${C.reset}`);
      }
    }
  }

  console.error(
    `${C.dim}§7 says agents MUST update all relevant README.md files when features\n` +
      `change, and §10.2 requires "README.md / HANDOFF.md updated if this changes\n` +
      `the app's state or feature set." To silence this finding, add\n` +
      `[readme-unchanged: <reason>] to the PR body if the change genuinely\n` +
      `does not warrant a README update.${C.reset}`,
  );
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-readme-freshness.mjs');
if (invokedDirectly) main();
