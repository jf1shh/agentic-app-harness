#!/usr/bin/env node
// Self-test for the peer-consistency gate (see check-peer-consistency.mjs
// header for the full rationale). The gate blocks merges, so the gate is
// itself gated: known-bad inputs that must fire, known-good inputs that must
// stay silent, and one assertion pinned to the real six package.json files
// on disk so the gate cannot silently stop reflecting reality (the same
// trick check-loop-stats.test.mjs uses against the real generated fixture).
//
// The known-bad anchor-group case reproduces the mood-diner incident exactly:
// three ESLint-8 apps, two pinned to @typescript-eslint ^7.18.0, one to
// ^8.65.0 — no version bump anywhere else in that PR's diff, only this split.
//
// Zero dependencies; run with:
//   node scripts/check-peer-consistency.test.mjs

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMajor,
  mergedDeps,
  findPeerPairMismatches,
  findAnchorGroupMismatches,
  checkAllApps,
  loadApps,
} from './check-peer-consistency.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- parseMajor --------------------------------------------------------- */

ok(parseMajor('^19.2.8') === 19, 'parseMajor: reads the major out of a caret range');
ok(parseMajor('~5.3.3') === 5, 'parseMajor: reads the major out of a tilde range');
ok(parseMajor('^7') === 7, 'parseMajor: handles a bare major-only range');
ok(parseMajor('19.2.8') === 19, 'parseMajor: handles an exact pin with no operator');
ok(parseMajor('>=16.8.0') === 16, 'parseMajor: handles a >= range');
ok(parseMajor('') === null, 'parseMajor: empty string is unparseable');
ok(parseMajor(undefined) === null, 'parseMajor: undefined is unparseable');
ok(parseMajor('workspace:*') === null, 'parseMajor: a non-numeric range is unparseable');

/* ---- mergedDeps ----------------------------------------------------------- */

ok(
  Object.keys(mergedDeps({ dependencies: { react: '^19' }, devDependencies: { eslint: '^9' } }))
    .length === 2,
  'mergedDeps: combines dependencies and devDependencies',
);
ok(
  Object.keys(mergedDeps({})).length === 0,
  'mergedDeps: a package.json with neither field merges to empty',
);

/* ---- findPeerPairMismatches (within-app split) ---------------------------- */

// The exact shape .agents/AGENTS.md §6 names: react-dom bumped to 19 while
// react stayed at 18.
{
  const mismatches = findPeerPairMismatches('some-app', {
    react: '^18.2.0',
    'react-dom': '^19.0.0',
  });
  ok(mismatches.length === 1, 'findPeerPairMismatches: catches react/react-dom split by one major');
  ok(mismatches[0].pairA === 'react' && mismatches[0].pairB === 'react-dom', 'findPeerPairMismatches: names both halves of the pair');
}

// The other named shape: @typescript-eslint/eslint-plugin at 8 while parser stayed at 7.
{
  const mismatches = findPeerPairMismatches('some-app', {
    '@typescript-eslint/eslint-plugin': '^8.65.0',
    '@typescript-eslint/parser': '^7.18.0',
  });
  ok(
    mismatches.length === 1,
    'findPeerPairMismatches: catches a split @typescript-eslint plugin/parser pair',
  );
}

ok(
  findPeerPairMismatches('some-app', { react: '^19.2.8', 'react-dom': '^19.2.8' }).length === 0,
  'findPeerPairMismatches: matching majors are silent',
);
ok(
  findPeerPairMismatches('some-app', { react: '^18.2.0' }).length === 0,
  'findPeerPairMismatches: only one half declared is not a mismatch',
);
ok(
  findPeerPairMismatches('some-app', {}).length === 0,
  'findPeerPairMismatches: no declared pairs at all is silent',
);

/* ---- findAnchorGroupMismatches (cross-app hoisting split) ------------------ */

// The real mood-diner incident, reproduced exactly: three apps all on
// eslint ^8.x, two on @typescript-eslint ^7.18.0, one drifted to ^8.65.0.
{
  const apps = [
    {
      name: 'legal-financial-rag',
      deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' },
    },
    {
      name: 'portfolio-hub',
      deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' },
    },
    {
      name: 'mood-diner',
      deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^8.65.0', '@typescript-eslint/parser': '^8.65.0' },
    },
  ];
  const mismatches = findAnchorGroupMismatches(apps);
  ok(
    mismatches.length === 2,
    'findAnchorGroupMismatches: reproduces the mood-diner incident — plugin AND parser both split',
  );
  const pluginMismatch = mismatches.find((m) => m.paired === '@typescript-eslint/eslint-plugin');
  ok(pluginMismatch.anchorMajor === 8, 'findAnchorGroupMismatches: names the shared eslint major');
  ok(
    pluginMismatch.majors.find((g) => g.major === 8)?.appNames.includes('mood-diner')
      && pluginMismatch.majors.find((g) => g.major === 7)?.appNames.includes('legal-financial-rag')
      && pluginMismatch.majors.find((g) => g.major === 7)?.appNames.includes('portfolio-hub'),
    'findAnchorGroupMismatches: correctly buckets each app under its declared major',
  );
}

// The fixed state — mood-diner reconverged onto ^7.18.0 — must be silent.
{
  const apps = [
    { name: 'legal-financial-rag', deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' } },
    { name: 'portfolio-hub', deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' } },
    { name: 'mood-diner', deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' } },
  ];
  ok(
    findAnchorGroupMismatches(apps).length === 0,
    'findAnchorGroupMismatches: silent once every app in the group agrees',
  );
}

// Apps in DIFFERENT anchor-major groups must never be compared — that split
// is this repo's deliberate independent-versioning design, not a defect.
{
  const apps = [
    { name: 'eslint8-app', deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' } },
    { name: 'eslint9-app', deps: { eslint: '^9.0.0' } }, // no @typescript-eslint declared at all
  ];
  ok(
    findAnchorGroupMismatches(apps).length === 0,
    'findAnchorGroupMismatches: apps on different eslint majors are never cross-checked',
  );
}

// An app that shares the anchor major but never declares the paired package
// (e.g. a framework config bundles it transitively) contributes nothing.
{
  const apps = [
    { name: 'eslint8-app-a', deps: { eslint: '^8.57.0', '@typescript-eslint/eslint-plugin': '^7.18.0', '@typescript-eslint/parser': '^7.18.0' } },
    { name: 'eslint8-app-b', deps: { eslint: '^8.57.0' } },
  ];
  ok(
    findAnchorGroupMismatches(apps).length === 0,
    'findAnchorGroupMismatches: an app that never declares the paired package is not a false positive',
  );
}

/* ---- checkAllApps (orchestration) ------------------------------------------ */

{
  const apps = [
    { name: 'split-app', deps: { react: '^18.2.0', 'react-dom': '^19.0.0', eslint: '^8.57.0' } },
    { name: 'clean-app', deps: { react: '^19.2.8', 'react-dom': '^19.2.8', eslint: '^8.57.0' } },
  ];
  const { peerMismatches, anchorMismatches } = checkAllApps(apps);
  ok(peerMismatches.length === 1 && peerMismatches[0].app === 'split-app', 'checkAllApps: surfaces the within-app split');
  ok(anchorMismatches.length === 0, 'checkAllApps: no @typescript-eslint declared anywhere, so no anchor findings');
}

/* ---- loadApps against a fake tree ------------------------------------------ */

{
  const fakeReadDir = () => [{ name: 'app-a', isDirectory: () => true }, { name: 'not-a-dir.txt', isDirectory: () => false }];
  const fakeReadFile = (path) => {
    if (path.endsWith('app-a/package.json')) return JSON.stringify({ dependencies: { react: '^19' } });
    throw new Error('ENOENT');
  };
  const apps = loadApps('/repo', fakeReadDir, fakeReadFile);
  ok(apps.length === 1 && apps[0].name === 'app-a', 'loadApps: skips non-directories, reads each package.json');
  ok(apps[0].deps.react === '^19', 'loadApps: merges the loaded package.json into a deps map');
}

/* ---- the gate reflects the real repo right now ------------------------------ */

{
  const apps = loadApps(REPO_ROOT, readdirSync, readFileSync);
  ok(apps.length === 6, 'the real repo currently has six projects/*/package.json files to check');
  const { peerMismatches, anchorMismatches } = checkAllApps(apps);
  ok(
    peerMismatches.length === 0 && anchorMismatches.length === 0,
    'the real repo on disk is peer-consistent right now (no split pairs, no split anchor groups)',
  );
}

/* ---- summary ------------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  '\nPeer-consistency gate verified: within-app splits caught, cross-app anchor-group splits ' +
    'caught, independent-versioning-by-design left alone, real repo currently clean.',
);
