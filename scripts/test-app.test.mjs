#!/usr/bin/env node
// Self-test for scripts/test-app.mjs's --changed diff-to-app mapping.
//
// `affectedApps` is the only pure logic in the gate worth unit-testing in
// isolation — everything else spawns real tools (npm, tsc, vitest, playwright).
// The mapping is where a wrong decision costs the most: a false skip lets an
// agent claim a green inner loop on an app that actually changed, and a false
// widen re-runs the whole monorepo for a one-app edit. Both are silent until
// they cost someone real time, so this is pinned down directly.
//
// Zero dependencies; run with:
//   node scripts/test-app.test.mjs

import { affectedApps } from './test-app.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

const APPS = [
  'elder-care-planner',
  'legal-financial-rag',
  'mood-diner',
  'portfolio-hub',
  'smart-recipe-app',
  'travel-packing-app',
];
const ALL = [...APPS].sort();
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---- the empty case -------------------------------------------------------- */

ok(eq(affectedApps([], APPS), []), 'an empty changed-file list affects no app');

/* ---- a file under one app --------------------------------------------------- */

ok(
  eq(affectedApps(['projects/mood-diner/src/app.tsx'], APPS), ['mood-diner']),
  'a file under one app affects only that app',
);

ok(
  eq(affectedApps(['projects/mood-diner'], APPS), ['mood-diner']),
  'the app directory itself, with no trailing slash, still maps to that app',
);

/* ---- prefix safety ---------------------------------------------------------- */

ok(
  eq(affectedApps(['projects/mood-diner-extra/file.ts'], APPS), ALL),
  'an unknown directory under projects/ is never misattributed to a prefix-sharing app; it widens to all apps',
);

/* ---- repo-wide paths (conservative default) -------------------------------- */

ok(
  eq(affectedApps(['package.json'], APPS), ALL),
  'a root-level file (package.json) affects every app',
);

ok(
  eq(affectedApps(['specs/mood-diner-spec.md'], APPS), ALL),
  'a spec change affects every app, since specs are cross-referenced as the single source of truth',
);

ok(
  eq(affectedApps(['scripts/harness-status.mjs'], APPS), ALL),
  'a harness change affects every app',
);

/* ---- aggregation ------------------------------------------------------------ */

ok(
  eq(
    affectedApps(['projects/mood-diner/a.ts', 'projects/portfolio-hub/b.ts'], APPS),
    ['mood-diner', 'portfolio-hub'],
  ),
  'multiple app paths map to each touched app, sorted',
);

ok(
  eq(affectedApps(['projects/mood-diner/a.ts', 'package.json'], APPS), ALL),
  'one repo-wide path among app paths widens the scope to every app',
);

/* ---- path-shape robustness -------------------------------------------------- */

ok(
  eq(affectedApps(['projects\\mood-diner\\src\\a.tsx'], APPS), ['mood-diner']),
  'a backslash-separated path (defensive) still maps to the app',
);

ok(
  eq(affectedApps(['', '  ', 'projects/mood-diner/x.ts'], APPS), ['mood-diner']),
  'blank entries are ignored rather than widening the scope',
);

/* ---- summary ---------------------------------------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} test-app self-test(s) FAILED.`);
  process.exit(1);
} else {
  console.log('\nAll test-app self-tests passed.');
}
