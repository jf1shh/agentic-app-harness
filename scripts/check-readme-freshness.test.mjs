#!/usr/bin/env node
// Self-test for the README freshness sensor (see check-readme-freshness.mjs header).
//
// Zero dependencies; run with:
//   node scripts/check-readme-freshness.test.mjs

import {
  extractAppFromSrc,
  isInfraFile,
  readmePathForApp,
  isReadmeUnchangedAcknowledged,
  findReadmeViolations,
} from './check-readme-freshness.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- extractAppFromSrc ---------------------------------------------------- */

ok(
  extractAppFromSrc('projects/mood-diner/src/lib/schemas.ts') === 'mood-diner',
  'extractAppFromSrc: detects src/ file in mood-diner',
);
ok(
  extractAppFromSrc('projects/elder-care-planner/src/engine/breakeven.ts') === 'elder-care-planner',
  'extractAppFromSrc: detects src/ file in elder-care-planner',
);
ok(
  extractAppFromSrc('projects/travel-packing-app/src/App.tsx') === 'travel-packing-app',
  'extractAppFromSrc: detects root src/ file (component)',
);
ok(
  extractAppFromSrc('projects/mood-diner/src/components/Card.tsx') === 'mood-diner',
  'extractAppFromSrc: detects component file',
);
ok(
  extractAppFromSrc('projects/mood-diner/package.json') === null,
  'extractAppFromSrc: returns null for a non-src file',
);
ok(
  extractAppFromSrc('scripts/harness-status.mjs') === null,
  'extractAppFromSrc: returns null for a harness script',
);
ok(
  extractAppFromSrc('README.md') === null,
  'extractAppFromSrc: returns null for root README',
);
ok(
  extractAppFromSrc('projects/mood-diner/README.md') === null,
  'extractAppFromSrc: returns null for an app README (not under src/)',
);

/* ---- isInfraFile ---------------------------------------------------------- */

ok(
  isInfraFile('scripts/harness-status.mjs') === true,
  'isInfraFile: recognizes a harness script',
);
ok(
  isInfraFile('scripts/check-readme-freshness.mjs') === true,
  'isInfraFile: recognizes this sensor script',
);
ok(
  isInfraFile('.agents/AGENTS.md') === true,
  'isInfraFile: recognizes .agents/AGENTS.md',
);
ok(
  isInfraFile('.github/workflows/sdd-sentinel.yml') === true,
  'isInfraFile: recognizes a CI workflow',
);
ok(
  isInfraFile('.github/workflows/ci.yml') === true,
  'isInfraFile: recognizes ci.yml',
);
ok(
  isInfraFile('projects/mood-diner/src/lib/schemas.ts') === false,
  'isInfraFile: rejects an app source file',
);
ok(
  isInfraFile('README.md') === false,
  'isInfraFile: rejects root README',
);
ok(
  isInfraFile('CLAUDE.md') === false,
  'isInfraFile: rejects CLAUDE.md (not in the infra patterns)',
);
ok(
  isInfraFile('scripts/README.md') === false,
  'isInfraFile: rejects a non-.mjs file under scripts/',
);

/* ---- readmePathForApp ----------------------------------------------------- */

ok(
  readmePathForApp('mood-diner') === 'projects/mood-diner/README.md',
  'readmePathForApp: generates correct path for mood-diner',
);
ok(
  readmePathForApp('elder-care-planner') === 'projects/elder-care-planner/README.md',
  'readmePathForApp: generates correct path for elder-care-planner',
);

/* ---- isReadmeUnchangedAcknowledged ---------------------------------------- */

ok(
  isReadmeUnchangedAcknowledged('[readme-unchanged: pure bugfix, no feature change]') === true,
  'isReadmeUnchangedAcknowledged: recognizes the acknowledgment marker',
);
ok(
  isReadmeUnchangedAcknowledged('Some PR body without the marker.') === false,
  'isReadmeUnchangedAcknowledged: returns false without the marker',
);
ok(
  isReadmeUnchangedAcknowledged('') === false,
  'isReadmeUnchangedAcknowledged: returns false for empty body',
);
ok(
  isReadmeUnchangedAcknowledged(null) === false,
  'isReadmeUnchangedAcknowledged: returns false for null body',
);
ok(
  isReadmeUnchangedAcknowledged('[readme-unchanged:]') === false,
  'isReadmeUnchangedAcknowledged: rejects empty reason',
);

/* ---- findReadmeViolations ------------------------------------------------- */

// App src changed, no README touched → violation
{
  const touched = ['projects/mood-diner/src/lib/schemas.ts'];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 1,
    'findReadmeViolations: flags src change with no README touch',
  );
  ok(
    violations[0].scope === 'app',
    'findReadmeViolations: violation scope is "app"',
  );
  ok(
    violations[0].app === 'mood-diner',
    'findReadmeViolations: reports the correct app name',
  );
  ok(
    violations[0].readmePath === 'projects/mood-diner/README.md',
    'findReadmeViolations: reports the expected README path',
  );
}

// App src changed + app README touched → no violation
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/mood-diner/README.md',
  ];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 0,
    'findReadmeViolations: no violation when app README is also touched',
  );
}

// App src changed + root README touched → no violation
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'README.md',
  ];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 0,
    'findReadmeViolations: no violation when root README is also touched',
  );
}

// PR body acknowledgment silences all findings
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'scripts/harness-status.mjs',
  ];
  const violations = findReadmeViolations(touched, '[readme-unchanged: test-only change]');
  ok(
    violations.length === 0,
    'findReadmeViolations: no violation when [readme-unchanged: reason] is in PR body',
  );
}

// Infra file changed, no root README → violation
{
  const touched = ['scripts/harness-status.mjs'];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 1,
    'findReadmeViolations: flags infra change with no root README touch',
  );
  ok(
    violations[0].scope === 'infra',
    'findReadmeViolations: infra violation scope is "infra"',
  );
  ok(
    violations[0].infraFiles.length === 1,
    'findReadmeViolations: lists the infra files that triggered the finding',
  );
}

// Infra file changed + root README touched → no violation
{
  const touched = [
    'scripts/harness-status.mjs',
    'README.md',
  ];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 0,
    'findReadmeViolations: no infra violation when root README is touched',
  );
}

// Multiple apps, both missing README → two violations
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/elder-care-planner/src/engine/breakeven.ts',
  ];
  const violations = findReadmeViolations(touched, '');
  const appViolations = violations.filter((v) => v.scope === 'app');
  ok(
    appViolations.length === 2,
    'findReadmeViolations: reports violations for multiple apps independently',
  );
  const apps = appViolations.map((v) => v.app).sort();
  ok(
    apps[0] === 'elder-care-planner' && apps[1] === 'mood-diner',
    'findReadmeViolations: correctly identifies both affected apps',
  );
}

// Multiple apps, one has README → only one violation
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/mood-diner/README.md',
    'projects/elder-care-planner/src/engine/breakeven.ts',
  ];
  const violations = findReadmeViolations(touched, '');
  const appViolations = violations.filter((v) => v.scope === 'app');
  ok(
    appViolations.length === 1,
    'findReadmeViolations: only flags the app without a README touch',
  );
  ok(
    appViolations[0].app === 'elder-care-planner',
    'findReadmeViolations: the unfixed app is elder-care-planner',
  );
}

// Non-src files (package.json, config) → no violation
{
  const touched = [
    'projects/mood-diner/package.json',
    'projects/mood-diner/vite.config.ts',
  ];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 0,
    'findReadmeViolations: non-src files do not trigger the check',
  );
}

// Multiple src files in same app → one violation listing all
{
  const touched = [
    'projects/mood-diner/src/lib/a.ts',
    'projects/mood-diner/src/lib/b.ts',
    'projects/mood-diner/src/components/Card.tsx',
  ];
  const violations = findReadmeViolations(touched, '');
  const appViolations = violations.filter((v) => v.scope === 'app');
  ok(
    appViolations.length === 1,
    'findReadmeViolations: multiple src files in one app produce one violation',
  );
  ok(
    appViolations[0].srcFiles.length === 3,
    'findReadmeViolations: all src files are listed in the violation',
  );
}

// Both app src and infra changed, no READMEs → both kinds of violations
{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'scripts/harness-status.mjs',
  ];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 2,
    'findReadmeViolations: reports both app and infra violations',
  );
  ok(
    violations.some((v) => v.scope === 'app') && violations.some((v) => v.scope === 'infra'),
    'findReadmeViolations: one app violation and one infra violation',
  );
}

// Workflow file changed, no root README → infra violation
{
  const touched = ['.github/workflows/ci.yml'];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 1 && violations[0].scope === 'infra',
    'findReadmeViolations: workflow change without root README triggers infra violation',
  );
}

// .agents/AGENTS.md changed, no root README → infra violation
{
  const touched = ['.agents/AGENTS.md'];
  const violations = findReadmeViolations(touched, '');
  ok(
    violations.length === 1 && violations[0].scope === 'infra',
    'findReadmeViolations: AGENTS.md change without root README triggers infra violation',
  );
}

// Empty touched list → no violations
{
  const violations = findReadmeViolations([], '');
  ok(
    violations.length === 0,
    'findReadmeViolations: empty file list produces no violations',
  );
}

/* ---- Summary --------------------------------------------------------------- */

console.log(`\n${failures === 0 ? '✓ All' : `✗ ${failures}`} README-freshness self-test(s) ${failures === 0 ? 'passed' : 'FAILED'}.`);
if (failures > 0) process.exit(1);
