#!/usr/bin/env node
/**
 * Self-test for check-containment.mjs — the agent containment gate.
 *
 * Same zero-dependency, pure-core-only test shape as
 * check-enum-blast-radius.test.mjs: imports only exported functions,
 * no git, no filesystem, uses the ok()/failures counter that
 * check-guardrail-integrity.mjs's countAssertions() recognises.
 */

import {
  CONTAINED_PATHS,
  matchesContainment,
  findViolations,
  isContainmentAcknowledged,
  unacknowledgedViolations,
} from './check-containment.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- matchesContainment ---- */

ok(
  matchesContainment('scripts/harness-status.mjs', 'scripts/*.mjs'),
  'matchesContainment: scripts/*.mjs matches scripts/harness-status.mjs',
);

ok(
  matchesContainment('scripts/check-containment.mjs', 'scripts/*.mjs'),
  'matchesContainment: scripts/*.mjs matches scripts/check-containment.mjs',
);

ok(
  !matchesContainment('scripts/nested/deep.mjs', 'scripts/*.mjs'),
  'matchesContainment: scripts/*.mjs does NOT match nested subdirectory',
);

ok(
  !matchesContainment('src/scripts/foo.mjs', 'scripts/*.mjs'),
  'matchesContainment: scripts/*.mjs does NOT match a different parent dir',
);

ok(
  matchesContainment('.agents/AGENTS.md', '.agents/AGENTS.md'),
  'matchesContainment: exact path matches',
);

ok(
  !matchesContainment('.agents/OTHER.md', '.agents/AGENTS.md'),
  'matchesContainment: exact path does NOT match a different file',
);

ok(
  matchesContainment('CLAUDE.md', 'CLAUDE.md'),
  'matchesContainment: root-level exact path matches',
);

ok(
  matchesContainment('.github/workflows/ci.yml', '.github/workflows/*.yml'),
  'matchesContainment: workflow glob matches .yml files',
);

ok(
  !matchesContainment('.github/workflows/ci.yaml', '.github/workflows/*.yml'),
  'matchesContainment: workflow glob does NOT match .yaml extension',
);

ok(
  matchesContainment('.githooks/pre-push', '.githooks/*'),
  'matchesContainment: bare * glob matches any file in dir',
);

ok(
  matchesContainment('specs/templates/spec-template.md', 'specs/templates/*'),
  'matchesContainment: specs/templates/* matches files in templates dir',
);

/* ---- findViolations ---- */

ok(
  findViolations(['projects/mood-diner/src/App.tsx']).length === 0,
  'findViolations: an app source file is not contained',
);

ok(
  findViolations(['scripts/harness-status.mjs']).length === 1,
  'findViolations: a harness script is contained',
);

ok(
  findViolations(['scripts/harness-status.mjs'])[0].description === 'harness scripts',
  'findViolations: carries the correct description',
);

ok(
  findViolations(['.agents/AGENTS.md']).length === 1,
  'findViolations: AGENTS.md is contained',
);

ok(
  findViolations(['CLAUDE.md']).length === 1,
  'findViolations: CLAUDE.md is contained',
);

ok(
  findViolations(['.github/workflows/sdd-sentinel.yml']).length === 1,
  'findViolations: a CI workflow is contained',
);

{
  const multi = findViolations([
    'projects/elder-care-planner/src/lib/engine.ts',
    'scripts/harness-status.mjs',
    '.agents/AGENTS.md',
    'projects/mood-diner/src/App.tsx',
  ]);
  ok(multi.length === 2, 'findViolations: mixed list returns only the contained files');
}

/* ---- isContainmentAcknowledged ---- */

ok(
  isContainmentAcknowledged(
    'This PR modifies [containment-override: scripts/harness-status.mjs] because...',
    'scripts/harness-status.mjs',
  ),
  'isContainmentAcknowledged: [containment-override: path] marker is accepted',
);

ok(
  isContainmentAcknowledged(
    'Updated scripts/harness-status.mjs to add a new sensor.',
    'scripts/harness-status.mjs',
  ),
  'isContainmentAcknowledged: naming the two-segment path in body is accepted',
);

ok(
  !isContainmentAcknowledged(
    'Updated harness-status.mjs to add a new sensor.',
    'scripts/harness-status.mjs',
  ),
  'isContainmentAcknowledged: bare filename (one segment) is NOT accepted',
);

ok(
  !isContainmentAcknowledged('', 'scripts/harness-status.mjs'),
  'isContainmentAcknowledged: empty body accounts for nothing',
);

ok(
  !isContainmentAcknowledged(
    'This PR fixes a bug in the recipe app.',
    'scripts/harness-status.mjs',
  ),
  'isContainmentAcknowledged: unrelated prose does not match',
);

ok(
  isContainmentAcknowledged(
    'Modified .github/workflows/sdd-sentinel.yml to add containment step.',
    '.github/workflows/sdd-sentinel.yml',
  ),
  'isContainmentAcknowledged: workflow path with two+ segments is accepted',
);

/* ---- unacknowledgedViolations (gate decision) ---- */

{
  const violations = [
    { file: 'scripts/harness-status.mjs', pattern: 'scripts/*.mjs', description: 'harness scripts' },
    { file: '.agents/AGENTS.md', pattern: '.agents/AGENTS.md', description: 'authoritative rulebook' },
  ];

  const unacked = unacknowledgedViolations(violations, [], '');
  ok(unacked.length === 2, 'gate: empty body leaves all violations unacknowledged');
}

{
  const violations = [
    { file: 'scripts/harness-status.mjs', pattern: 'scripts/*.mjs', description: 'harness scripts' },
    { file: '.agents/AGENTS.md', pattern: '.agents/AGENTS.md', description: 'authoritative rulebook' },
  ];

  const body = 'This PR updates scripts/harness-status.mjs and .agents/AGENTS.md for the new guardrail.';
  const unacked = unacknowledgedViolations(violations, [], body);
  ok(unacked.length === 0, 'gate: naming both files in body resolves both violations');
}

{
  const violations = [
    { file: 'scripts/harness-status.mjs', pattern: 'scripts/*.mjs', description: 'harness scripts' },
    { file: '.agents/AGENTS.md', pattern: '.agents/AGENTS.md', description: 'authoritative rulebook' },
  ];

  const body = '[containment-override: scripts/harness-status.mjs]\nNeeded for the new sensor.';
  const unacked = unacknowledgedViolations(violations, [], body);
  ok(unacked.length === 1, 'gate: override marker for one file leaves the other unacknowledged');
  ok(unacked[0].file === '.agents/AGENTS.md', 'gate: the unacknowledged file is the one without the marker');
}

/* ---- CONTAINED_PATHS covers key infrastructure ---- */

ok(
  CONTAINED_PATHS.some((p) => p.pattern === 'scripts/*.mjs'),
  'CONTAINED_PATHS includes harness scripts',
);
ok(
  CONTAINED_PATHS.some((p) => p.pattern === '.agents/AGENTS.md'),
  'CONTAINED_PATHS includes the authoritative rulebook',
);
ok(
  CONTAINED_PATHS.some((p) => p.pattern === 'CLAUDE.md'),
  'CONTAINED_PATHS includes CLAUDE.md',
);
ok(
  CONTAINED_PATHS.some((p) => p.pattern === '.github/workflows/*.yml'),
  'CONTAINED_PATHS includes CI workflows',
);

/* ---- summary ---- */

console.log(`\n${failures === 0 ? '✓' : '✗'} check-containment.test.mjs: ${failures === 0 ? 'all passed' : `${failures} failure(s)`}`);
if (failures > 0) process.exit(1);
