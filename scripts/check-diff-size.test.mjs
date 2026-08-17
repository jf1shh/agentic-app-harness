#!/usr/bin/env node
/**
 * Self-test for check-diff-size.mjs — the diff-size gate.
 *
 * Same zero-dependency, pure-core-only test shape as
 * check-enum-blast-radius.test.mjs: imports only exported functions,
 * no git, no filesystem, uses the ok()/failures counter that
 * check-guardrail-integrity.mjs's countAssertions() recognises.
 */

import {
  WARN_THRESHOLD,
  BLOCK_THRESHOLD,
  isExcluded,
  parseNumstat,
  computeDiffSize,
  isLargeDiffAcknowledged,
} from './check-diff-size.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- thresholds are sane ---- */

ok(WARN_THRESHOLD === 400, 'WARN_THRESHOLD is 400');
ok(BLOCK_THRESHOLD === 800, 'BLOCK_THRESHOLD is 800');
ok(WARN_THRESHOLD < BLOCK_THRESHOLD, 'warn is below block');

/* ---- isExcluded ---- */

ok(isExcluded('package-lock.json'), 'isExcluded: root package-lock.json');
ok(isExcluded('projects/mood-diner/package-lock.json'), 'isExcluded: nested package-lock.json');
ok(isExcluded('projects/portfolio-hub/src/data/loopStats.generated.ts'), 'isExcluded: .generated.ts');
ok(isExcluded('projects/portfolio-hub/src/data/loopStats.generated.test.ts'), 'isExcluded: .generated.test.ts');
ok(isExcluded('harness-status.json'), 'isExcluded: harness-status.json');
ok(isExcluded('harness-history.json'), 'isExcluded: harness-history.json');
ok(isExcluded('projects/mood-diner/playwright-report/index.html'), 'isExcluded: playwright-report subpath');
ok(isExcluded('projects/mood-diner/test-results/output.json'), 'isExcluded: test-results subpath');

ok(!isExcluded('projects/mood-diner/src/App.tsx'), 'isExcluded: app source is NOT excluded');
ok(!isExcluded('scripts/harness-status.mjs'), 'isExcluded: harness script is NOT excluded');
ok(!isExcluded('specs/mood-diner-spec.md'), 'isExcluded: spec file is NOT excluded');

/* ---- parseNumstat ---- */

{
  const input = [
    '10\t5\tprojects/mood-diner/src/App.tsx',
    '3\t1\tscripts/harness-status.mjs',
    '-\t-\tprojects/mood-diner/public/logo.png',
    '',
  ].join('\n');

  const result = parseNumstat(input);
  ok(result.length === 2, 'parseNumstat: binary files are excluded');
  ok(result[0].path === 'projects/mood-diner/src/App.tsx', 'parseNumstat: first file path');
  ok(result[0].added === 10, 'parseNumstat: first file added count');
  ok(result[0].deleted === 5, 'parseNumstat: first file deleted count');
  ok(result[1].path === 'scripts/harness-status.mjs', 'parseNumstat: second file path');
}

{
  const tabInPath = '5\t3\tpath with\ttab.txt';
  const result = parseNumstat(tabInPath);
  ok(result.length === 1, 'parseNumstat: handles tab-in-path (rename)');
  ok(result[0].path === 'path with\ttab.txt', 'parseNumstat: preserves tab in path');
}

ok(parseNumstat('').length === 0, 'parseNumstat: empty input returns empty');

/* ---- computeDiffSize ---- */

{
  const stats = [
    { path: 'projects/mood-diner/src/App.tsx', added: 50, deleted: 20 },
    { path: 'projects/mood-diner/src/lib/engine.ts', added: 30, deleted: 10 },
  ];
  const result = computeDiffSize(stats);
  ok(result.totalChanged === 110, 'computeDiffSize: sums added+deleted');
  ok(result.totalAdded === 80, 'computeDiffSize: sums added');
  ok(result.totalDeleted === 30, 'computeDiffSize: sums deleted');
  ok(result.verdict === 'pass', 'computeDiffSize: 110 lines is a pass');
  ok(result.perApp['mood-diner'].added === 80, 'computeDiffSize: per-app breakdown');
}

{
  const stats = [
    { path: 'projects/elder-care-planner/src/lib/engine.ts', added: 200, deleted: 150 },
    { path: 'projects/elder-care-planner/src/lib/data.ts', added: 30, deleted: 25 },
  ];
  const result = computeDiffSize(stats);
  ok(result.totalChanged === 405, 'computeDiffSize: 405 lines triggers warn');
  ok(result.verdict === 'warn', 'computeDiffSize: verdict is warn');
}

{
  const stats = [
    { path: 'projects/mood-diner/src/App.tsx', added: 500, deleted: 350 },
  ];
  const result = computeDiffSize(stats);
  ok(result.totalChanged === 850, 'computeDiffSize: 850 lines triggers block');
  ok(result.verdict === 'block', 'computeDiffSize: verdict is block');
}

{
  const stats = [
    { path: 'projects/mood-diner/src/App.tsx', added: 100, deleted: 50 },
    { path: 'package-lock.json', added: 5000, deleted: 4000 },
  ];
  const result = computeDiffSize(stats);
  ok(result.totalChanged === 150, 'computeDiffSize: excluded files not counted in total');
  ok(result.excludedLines === 9000, 'computeDiffSize: excluded lines tracked separately');
  ok(result.verdict === 'pass', 'computeDiffSize: lockfile churn does not trigger');
}

{
  const stats = [
    { path: 'projects/mood-diner/src/App.tsx', added: 100, deleted: 50 },
    { path: 'projects/elder-care-planner/src/lib/engine.ts', added: 80, deleted: 30 },
    { path: 'scripts/harness-status.mjs', added: 10, deleted: 5 },
  ];
  const result = computeDiffSize(stats);
  ok(Object.keys(result.perApp).length === 3, 'computeDiffSize: three apps in breakdown');
  ok(result.perApp['(root)'] !== undefined, 'computeDiffSize: root scripts go into (root)');
  ok(result.perApp['(root)'].added === 10, 'computeDiffSize: root added count');
}

{
  const stats = [
    { path: 'projects/portfolio-hub/src/data/loopStats.generated.ts', added: 100, deleted: 80 },
    { path: 'projects/mood-diner/src/App.tsx', added: 10, deleted: 5 },
  ];
  const result = computeDiffSize(stats);
  ok(result.totalChanged === 15, 'computeDiffSize: .generated.ts excluded from count');
  ok(result.excludedLines === 180, 'computeDiffSize: .generated.ts tracked as excluded');
}

/* ---- isLargeDiffAcknowledged ---- */

ok(
  isLargeDiffAcknowledged('This is a big change.\n[large-diff-acknowledged]\nBecause we scaffolded a new app.'),
  'isLargeDiffAcknowledged: marker in body is detected',
);

ok(
  !isLargeDiffAcknowledged('This is a normal PR with no special markers.'),
  'isLargeDiffAcknowledged: missing marker returns false',
);

ok(
  !isLargeDiffAcknowledged(''),
  'isLargeDiffAcknowledged: empty body returns false',
);

ok(
  !isLargeDiffAcknowledged(null),
  'isLargeDiffAcknowledged: null body returns false',
);

/* ---- edge: exact thresholds ---- */

{
  const stats = [{ path: 'a.ts', added: 400, deleted: 0 }];
  const result = computeDiffSize(stats);
  ok(result.verdict === 'warn', 'computeDiffSize: exactly WARN_THRESHOLD triggers warn');
}

{
  const stats = [{ path: 'a.ts', added: 399, deleted: 0 }];
  const result = computeDiffSize(stats);
  ok(result.verdict === 'pass', 'computeDiffSize: one below WARN_THRESHOLD is pass');
}

{
  const stats = [{ path: 'a.ts', added: 800, deleted: 0 }];
  const result = computeDiffSize(stats);
  ok(result.verdict === 'block', 'computeDiffSize: exactly BLOCK_THRESHOLD triggers block');
}

{
  const stats = [{ path: 'a.ts', added: 799, deleted: 0 }];
  const result = computeDiffSize(stats);
  ok(result.verdict === 'warn', 'computeDiffSize: one below BLOCK_THRESHOLD is warn');
}

/* ---- summary ---- */

console.log(`\n${failures === 0 ? '✓' : '✗'} check-diff-size.test.mjs: ${failures === 0 ? 'all passed' : `${failures} failure(s)`}`);
if (failures > 0) process.exit(1);
