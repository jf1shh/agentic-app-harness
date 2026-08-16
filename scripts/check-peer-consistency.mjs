#!/usr/bin/env node
/**
 * Peer-consistency gate — "a dependency's peers must move with it," made
 * mechanical (.agents/AGENTS.md §6).
 *
 * This repo deliberately runs six apps on independent dependency versions —
 * React 18 here, React 19 there — and that is not what this gate checks.
 * What it checks is two narrower, always-wrong shapes documented in two
 * separate §6 incidents:
 *
 * 1. **A split peer pair within one app.** "A Dependency Bump Is Only Safe If
 *    Its Peers Move With It" names the exact failure: `react-dom` bumped to
 *    19 while `react` stayed at 18, or `@typescript-eslint/eslint-plugin` to
 *    8 while `@typescript-eslint/parser` stayed at 7 — either one makes
 *    `npm install` fail outright, or (for `@types/react`/`@types/react-dom`)
 *    silently type-checks against a runtime the app doesn't ship.
 *
 * 2. **A split anchor group across apps.** "Workspace Hoisting Can Split a
 *    Peer Set... Without Anyone Bumping a Version" is the sharper case: under
 *    npm workspace hoisting, apps that share the same major of `eslint`
 *    compete for ONE physical copy of `@typescript-eslint/eslint-plugin` /
 *    `parser`. mood-diner declared that pair at `^8.65.0` while its
 *    ESLint-8 siblings (legal-financial-rag, portfolio-hub) sat on
 *    `^7.18.0` — no version bump landed in that PR's diff at all, and the
 *    hoisted plugin still loaded against the wrong ESLint internals
 *    (`TypeError: Cannot read properties of undefined (reading
 *    'allowShortCircuit')`). `npx tsc --noEmit` and `npx vitest run` stayed
 *    green throughout; only `eslint .` broke, and only in the one app whose
 *    tree got partially hoisted.
 *
 * Both are properties of the six `package.json` files as they stand right
 * now, not of what a particular PR happened to touch — unlike
 * check-enum-blast-radius.mjs, there is no git plumbing here, no merge-base,
 * nothing diff-shaped. It reads the same way check-loop-stats.mjs does.
 *
 * Zero dependencies. Run with:
 *   node scripts/check-peer-consistency.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * Pairs that must share a major version *within one app*, or `npm install`
 * breaks outright (react/react-dom) or the declared types silently drift out
 * of sync with the runtime they describe (@types/react/@types/react-dom).
 */
export const PEER_PAIRS = [
  ['react', 'react-dom'],
  ['@types/react', '@types/react-dom'],
  ['@typescript-eslint/eslint-plugin', '@typescript-eslint/parser'],
];

/**
 * Anchor groups: apps that share the same major of `anchor` resolve, under
 * npm workspace hoisting, to one physical copy of any `paired` package that
 * dedupes cleanly across them — so those apps must also agree on each
 * paired package's major, even though nothing forces that at `npm install`
 * time the way a direct peer-pair split does.
 */
export const ANCHOR_GROUPS = [
  { anchor: 'eslint', paired: ['@typescript-eslint/eslint-plugin', '@typescript-eslint/parser'] },
];

/** Major version number from a semver range (`^19.2.8`, `~5.3.3`, `^7`), or null. */
export function parseMajor(range) {
  if (!range) return null;
  const m = String(range).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** `dependencies` and `devDependencies` merged into one name -> range map. */
export function mergedDeps(pkg) {
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

/**
 * Peer-pair mismatches within a single app: both halves of a declared pair
 * are present but resolve to different major versions. A pair with only one
 * half declared is not a mismatch — there is nothing to be split from.
 */
export function findPeerPairMismatches(appName, deps) {
  const out = [];
  for (const [a, b] of PEER_PAIRS) {
    if (!(a in deps) || !(b in deps)) continue;
    const majorA = parseMajor(deps[a]);
    const majorB = parseMajor(deps[b]);
    if (majorA === null || majorB === null || majorA === majorB) continue;
    out.push({ app: appName, pairA: a, rangeA: deps[a], majorA, pairB: b, rangeB: deps[b], majorB });
  }
  return out;
}

/**
 * Cross-app anchor-group mismatches: among apps that declare the same major
 * of an anchor package, a paired package whose declared major disagrees
 * across those apps. Apps in different anchor-major groups are never
 * compared against each other — that split is this repo's deliberate,
 * independent-versioning design, not a defect.
 */
export function findAnchorGroupMismatches(apps) {
  const out = [];
  for (const { anchor, paired } of ANCHOR_GROUPS) {
    const groups = new Map(); // anchorMajor -> [{ name, deps }]
    for (const { name, deps } of apps) {
      const anchorMajor = parseMajor(deps[anchor]);
      if (anchorMajor === null) continue;
      if (!groups.has(anchorMajor)) groups.set(anchorMajor, []);
      groups.get(anchorMajor).push({ name, deps });
    }
    for (const [anchorMajor, groupApps] of groups) {
      for (const pairedName of paired) {
        const seen = new Map(); // pairedMajor -> [appName, ...]
        for (const { name, deps } of groupApps) {
          if (!(pairedName in deps)) continue;
          const major = parseMajor(deps[pairedName]);
          if (major === null) continue;
          if (!seen.has(major)) seen.set(major, []);
          seen.get(major).push(name);
        }
        if (seen.size > 1) {
          out.push({
            anchor, anchorMajor, paired: pairedName,
            majors: [...seen.entries()].map(([major, appNames]) => ({ major, appNames })),
          });
        }
      }
    }
  }
  return out;
}

/** Every mismatch across a set of `{ name, deps }` apps. */
export function checkAllApps(apps) {
  return {
    peerMismatches: apps.flatMap(({ name, deps }) => findPeerPairMismatches(name, deps)),
    anchorMismatches: findAnchorGroupMismatches(apps),
  };
}

/* -------------------------------------------------------------------- */
/* CLI                                                                    */
/* -------------------------------------------------------------------- */

/** Every `projects/<name>/package.json` on disk, as `{ name, deps }[]`. */
export function loadApps(repoRoot, readDir = readdirSync, readFile = readFileSync) {
  const projectsDir = join(repoRoot, 'projects');
  let entries;
  try {
    entries = readDir(projectsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return [];
  }
  const apps = [];
  for (const entry of entries) {
    const pkgPath = join(projectsDir, entry.name, 'package.json');
    let pkg;
    try {
      pkg = JSON.parse(readFile(pkgPath, 'utf8'));
    } catch {
      continue; // no readable package.json — nothing to check for this entry
    }
    apps.push({ name: entry.name, deps: mergedDeps(pkg) });
  }
  return apps;
}

function main() {
  const repoRoot = join(__dirname, '..');
  const apps = loadApps(repoRoot);
  const { peerMismatches, anchorMismatches } = checkAllApps(apps);

  if (peerMismatches.length === 0 && anchorMismatches.length === 0) {
    console.log(
      `${C.green}PEER-CONSISTENCY gate PASSED.${C.reset} ${apps.length} app(s) checked — ` +
        'no split peer pairs, no split anchor groups.',
    );
    return;
  }

  console.error(`${C.red}PEER-CONSISTENCY gate FAILED.${C.reset}`);

  for (const m of peerMismatches) {
    console.error(
      `\n  ${C.cyan}${m.app}${C.reset}: ${C.yellow}${m.pairA}${C.reset} is ${m.rangeA} ` +
        `(major ${m.majorA}) but ${C.yellow}${m.pairB}${C.reset} is ${m.rangeB} (major ${m.majorB}).`,
    );
    console.error(
      `  ${C.dim}These must move together — a split major here is the exact shape that made ` +
        '`npm install` fail outright in .agents/AGENTS.md §6, "A Dependency Bump Is Only Safe ' +
        `If Its Peers Move With It".${C.reset}`,
    );
  }

  for (const m of anchorMismatches) {
    console.error(
      `\n  ${C.cyan}${m.paired}${C.reset} disagrees across apps that all declare ` +
        `${C.yellow}${m.anchor}@${m.anchorMajor}${C.reset}:`,
    );
    for (const { major, appNames } of m.majors) {
      console.error(`    major ${C.yellow}${major}${C.reset}: ${appNames.join(', ')}`);
    }
    console.error(
      `  ${C.dim}npm workspace hoisting resolves ${m.paired} to ONE physical copy across apps ` +
        `sharing an ${m.anchor} major — a disagreement here reproduces the mood-diner ` +
        '"allowShortCircuit" crash in .agents/AGENTS.md §6, "Workspace Hoisting Can Split a Peer ' +
        `Set...". Converge every app in this group onto the same ${m.paired} major.${C.reset}`,
    );
  }

  process.exit(1);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('check-peer-consistency.mjs');
if (invokedDirectly) main();
