#!/usr/bin/env node
/**
 * Context Staleness Marker — "epistemic lease" for long-running agent sessions.
 *
 * Inspired by OpenLore's epistemic lease concept: an agent that reads a spec at
 * minute 0 and edits at minute 30 has no way to know a concurrent merge changed
 * it at minute 15. This is a lighter, zero-dependency version: a generated file
 * that agents are instructed to re-read before committing.
 *
 * `node scripts/generate-context-digest.mjs` writes `.context-digest.json`
 * (gitignored) with a machine-readable snapshot of key repo state — per-app
 * spec and schema hashes, module/test counts, guardrail and lesson counts, and
 * the current HEAD commit.
 *
 * `node scripts/generate-context-digest.mjs --diff` compares an existing
 * `.context-digest.json` against live repo state and reports what changed.
 * Agents run this before pushing if their session has been long-running.
 *
 * This is advisory only — no CI step, no blocking gate. The digest is gitignored
 * because it is a point-in-time snapshot, not a source of truth.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/generate-context-digest.mjs          # generate the digest
 *   node scripts/generate-context-digest.mjs --diff   # compare saved vs live
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/** SHA-256 hex digest of a string. */
export function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Schema file path for an app, checking both `src/lib/schemas.ts` and
 * `src/schemas.ts` (the two conventions in this repo). Returns the
 * resolved path or null if neither exists.
 */
export function findSchemaFile(appPath) {
  const candidates = [
    join(appPath, 'src', 'lib', 'schemas.ts'),
    join(appPath, 'src', 'schemas.ts'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Count files matching a pattern under a directory (non-recursive into
 * node_modules/dist/build/.next/etc). Used for logic-module and test-file
 * counts.
 */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'out', '.vite',
  'coverage', 'android', 'playwright-report', 'test-results',
]);

export function countFiles(dir, predicate) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(d, entry.name));
      } else if (predicate(entry.name)) {
        count++;
      }
    }
  };
  walk(dir);
  return count;
}

/** Logic directories matching §5's definition. */
const LOGIC_DIRS = [
  'lib', 'utils', 'services', 'engine', 'core', 'domain', 'data',
  'hooks', 'store', 'state',
];

/**
 * Count logic modules under projects/<app>/src/<logicDir>/*.ts (excluding
 * test files).
 */
export function countLogicModules(appPath) {
  let total = 0;
  for (const dir of LOGIC_DIRS) {
    const p = join(appPath, 'src', dir);
    total += countFiles(p, (name) =>
      (name.endsWith('.ts') || name.endsWith('.tsx'))
      && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx'),
    );
  }
  return total;
}

/** Count *.test.ts / *.test.tsx files under an app's src/. */
export function countTestFiles(appPath) {
  const srcDir = join(appPath, 'src');
  return countFiles(srcDir, (name) =>
    name.endsWith('.test.ts') || name.endsWith('.test.tsx'),
  );
}

/**
 * Build the per-app digest entry.
 * `specPath` and `schemaPath` may be null if the file doesn't exist.
 */
export function buildAppDigest({ appPath, specPath, schemaPath, lastSpecCommitFn }) {
  const specHash = specPath && existsSync(specPath)
    ? `sha256:${sha256(readFileSync(specPath, 'utf8'))}`
    : null;
  const schemaHash = schemaPath && existsSync(schemaPath)
    ? `sha256:${sha256(readFileSync(schemaPath, 'utf8'))}`
    : null;
  return {
    specHash,
    schemaHash,
    logicModules: countLogicModules(appPath),
    unitTestFiles: countTestFiles(appPath),
    lastSpecChange: lastSpecCommitFn ? lastSpecCommitFn() : null,
  };
}

/**
 * Count guardrails in harness-status.mjs — reuses the same id-extraction
 * pattern as check-guardrail-integrity.mjs.
 */
export function countGuardrails(harnessSource) {
  const m = harnessSource.match(/const GUARDRAILS = \[([\s\S]*?)\n\];/);
  if (!m) return 0;
  return [...m[1].matchAll(/id:\s*'([^']+)'/g)].length;
}

/**
 * Count §6 lesson bullets in .agents/AGENTS.md — reuses the same counting
 * approach as loopStatsCompute.mjs.
 */
export function countLessons(agentsSource) {
  const s6match = agentsSource.match(/## 6\. Learned Lessons[\s\S]*?(?=\n## 7\.)/);
  if (!s6match) return 0;
  return [...s6match[0].matchAll(/^- \*\*/gm)].length;
}

/**
 * Build the full digest object from filesystem state.
 *
 * `repoRoot`: absolute path to repo root
 * `headCommit`: current HEAD sha (or null for test scenarios)
 * `gitLogForSpec`: optional fn(specRelPath) → commit sha
 */
export function buildDigest({ repoRoot, headCommit, gitLogForSpec }) {
  const projectsDir = join(repoRoot, 'projects');
  const specsDir = join(repoRoot, 'specs');

  const apps = {};
  const appNames = readdirSync(projectsDir)
    .filter((d) => statSync(join(projectsDir, d)).isDirectory() && !d.startsWith('.'))
    .sort();

  for (const app of appNames) {
    const appPath = join(projectsDir, app);
    const specPath = join(specsDir, `${app}-spec.md`);
    const schemaPath = findSchemaFile(appPath);
    const specRelPath = `specs/${app}-spec.md`;

    apps[app] = buildAppDigest({
      appPath,
      specPath: existsSync(specPath) ? specPath : null,
      schemaPath,
      lastSpecCommitFn: gitLogForSpec && existsSync(specPath)
        ? () => gitLogForSpec(specRelPath)
        : null,
    });
  }

  const harnessPath = join(repoRoot, 'scripts', 'harness-status.mjs');
  const agentsPath = join(repoRoot, '.agents', 'AGENTS.md');

  return {
    generatedAt: new Date().toISOString(),
    headCommit,
    apps,
    guardrailCount: existsSync(harnessPath) ? countGuardrails(readFileSync(harnessPath, 'utf8')) : 0,
    lessonCount: existsSync(agentsPath) ? countLessons(readFileSync(agentsPath, 'utf8')) : 0,
  };
}

/**
 * Compare two digests and return an array of human-readable change
 * descriptions. Empty array means nothing changed.
 */
export function diffDigests(saved, live) {
  const changes = [];

  if (saved.headCommit !== live.headCommit) {
    changes.push(`HEAD moved: ${saved.headCommit?.slice(0, 7) ?? '(none)'} → ${live.headCommit?.slice(0, 7) ?? '(none)'}`);
  }

  if (saved.guardrailCount !== live.guardrailCount) {
    changes.push(`Guardrail count: ${saved.guardrailCount} → ${live.guardrailCount}`);
  }
  if (saved.lessonCount !== live.lessonCount) {
    changes.push(`Lesson count: ${saved.lessonCount} → ${live.lessonCount}`);
  }

  const allApps = new Set([...Object.keys(saved.apps || {}), ...Object.keys(live.apps || {})]);
  for (const app of [...allApps].sort()) {
    const s = saved.apps?.[app];
    const l = live.apps?.[app];
    if (!s && l) { changes.push(`${app}: new app appeared`); continue; }
    if (s && !l) { changes.push(`${app}: app removed`); continue; }
    if (s.specHash !== l.specHash) changes.push(`${app}: spec changed`);
    if (s.schemaHash !== l.schemaHash) changes.push(`${app}: schema changed`);
    if (s.logicModules !== l.logicModules) {
      changes.push(`${app}: logic modules ${s.logicModules} → ${l.logicModules}`);
    }
    if (s.unitTestFiles !== l.unitTestFiles) {
      changes.push(`${app}: unit test files ${s.unitTestFiles} → ${l.unitTestFiles}`);
    }
  }

  return changes;
}

/* -------------------------------------------------------------------- */
/* git plumbing + CLI                                                     */
/* -------------------------------------------------------------------- */

function getHeadCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getLastSpecCommit(specRelPath) {
  try {
    return execFileSync(
      'git', ['log', '-1', '--format=%H', '--', specRelPath],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim() || null;
  } catch {
    return null;
  }
}

function main() {
  const repoRoot = join(__dirname, '..');
  const digestPath = join(repoRoot, '.context-digest.json');
  const isDiff = process.argv.includes('--diff');

  if (isDiff) {
    if (!existsSync(digestPath)) {
      console.error(
        `${C.red}No .context-digest.json found.${C.reset}\n` +
          `Run ${C.cyan}node scripts/generate-context-digest.mjs${C.reset} first to create a baseline.`,
      );
      process.exit(1);
    }

    const saved = JSON.parse(readFileSync(digestPath, 'utf8'));
    const live = buildDigest({
      repoRoot,
      headCommit: getHeadCommit(),
      gitLogForSpec: getLastSpecCommit,
    });

    const changes = diffDigests(saved, live);
    if (changes.length === 0) {
      console.log(`${C.green}Context digest unchanged since ${saved.generatedAt}.${C.reset}`);
      return;
    }

    console.error(`${C.yellow}Context has changed since ${saved.generatedAt}:${C.reset}\n`);
    for (const c of changes) {
      console.error(`  ${C.cyan}•${C.reset} ${c}`);
    }
    console.error(
      `\n${C.dim}Consider re-reading any changed specs before pushing. ` +
        `Run without --diff to update the digest.${C.reset}`,
    );
    return;
  }

  const digest = buildDigest({
    repoRoot,
    headCommit: getHeadCommit(),
    gitLogForSpec: getLastSpecCommit,
  });

  writeFileSync(digestPath, JSON.stringify(digest, null, 2) + '\n');
  const appCount = Object.keys(digest.apps).length;
  console.log(
    `${C.green}Context digest written to .context-digest.json${C.reset}\n` +
      `  ${C.dim}${appCount} apps, ${digest.guardrailCount} guardrails, ` +
      `${digest.lessonCount} lessons, HEAD ${digest.headCommit?.slice(0, 7) ?? '(none)'}${C.reset}`,
  );
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('generate-context-digest.mjs');
if (invokedDirectly) main();
