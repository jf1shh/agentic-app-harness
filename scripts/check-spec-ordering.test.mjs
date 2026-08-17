#!/usr/bin/env node
// Self-test for the spec-before-code ordering sensor (see check-spec-ordering.mjs header).
//
// Zero dependencies; run with:
//   node scripts/check-spec-ordering.test.mjs

import {
  extractLogicApp,
  isTestFileForApp,
  specPathForApp,
  isSpecUnchangedAcknowledged,
  findOrderingViolations,
  LOGIC_DIRS,
} from './check-spec-ordering.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- extractLogicApp ------------------------------------------------------- */

ok(
  extractLogicApp('projects/mood-diner/src/lib/schemas.ts') === 'mood-diner',
  'extractLogicApp: detects a logic module in src/lib/',
);
ok(
  extractLogicApp('projects/elder-care-planner/src/engine/breakeven.ts') === 'elder-care-planner',
  'extractLogicApp: detects a logic module in src/engine/',
);
ok(
  extractLogicApp('projects/travel-packing-app/src/utils/format.ts') === 'travel-packing-app',
  'extractLogicApp: detects a logic module in src/utils/',
);
ok(
  extractLogicApp('projects/legal-financial-rag/src/services/search.ts') === 'legal-financial-rag',
  'extractLogicApp: detects a logic module in src/services/',
);
ok(
  extractLogicApp('projects/smart-recipe-app/src/data/recipes.ts') === 'smart-recipe-app',
  'extractLogicApp: detects a logic module in src/data/',
);
ok(
  extractLogicApp('projects/portfolio-hub/src/hooks/useTheme.ts') === 'portfolio-hub',
  'extractLogicApp: detects a logic module in src/hooks/',
);
ok(
  extractLogicApp('projects/mood-diner/src/core/model.ts') === 'mood-diner',
  'extractLogicApp: detects a logic module in src/core/',
);
ok(
  extractLogicApp('projects/mood-diner/src/domain/types.ts') === 'mood-diner',
  'extractLogicApp: detects a logic module in src/domain/',
);
ok(
  extractLogicApp('projects/mood-diner/src/store/appStore.ts') === 'mood-diner',
  'extractLogicApp: detects a logic module in src/store/',
);
ok(
  extractLogicApp('projects/mood-diner/src/state/reducer.ts') === 'mood-diner',
  'extractLogicApp: detects a logic module in src/state/',
);

ok(
  extractLogicApp('projects/mood-diner/src/App.tsx') === null,
  'extractLogicApp: returns null for a root src/ file (not a logic dir)',
);
ok(
  extractLogicApp('projects/mood-diner/src/components/Card.tsx') === null,
  'extractLogicApp: returns null for a component file',
);
ok(
  extractLogicApp('projects/mood-diner/src/pages/Home.tsx') === null,
  'extractLogicApp: returns null for a page file',
);
ok(
  extractLogicApp('scripts/harness-status.mjs') === null,
  'extractLogicApp: returns null for a harness script',
);
ok(
  extractLogicApp('projects/mood-diner/package.json') === null,
  'extractLogicApp: returns null for a non-src file',
);

ok(
  extractLogicApp('projects/mood-diner/src/lib/schemas.test.ts') === null,
  'extractLogicApp: returns null for a test file (*.test.ts)',
);
ok(
  extractLogicApp('projects/mood-diner/src/lib/schemas.test.tsx') === null,
  'extractLogicApp: returns null for a test file (*.test.tsx)',
);

/* ---- LOGIC_DIRS coverage --------------------------------------------------- */

ok(
  LOGIC_DIRS.length >= 10,
  'LOGIC_DIRS: covers at least 10 directory names (all from §5)',
);

for (const dir of LOGIC_DIRS) {
  ok(
    extractLogicApp(`projects/test-app/src/${dir}/module.ts`) === 'test-app',
    `extractLogicApp: recognizes src/${dir}/ as a logic directory`,
  );
}

/* ---- isTestFileForApp ------------------------------------------------------ */

ok(
  isTestFileForApp('projects/mood-diner/src/lib/schemas.test.ts', 'mood-diner') === true,
  'isTestFileForApp: recognizes a unit test under the correct app',
);
ok(
  isTestFileForApp('projects/mood-diner/e2e/main.spec.ts', 'mood-diner') === false,
  'isTestFileForApp: rejects a Playwright spec (not .test.ts)',
);
ok(
  isTestFileForApp('projects/mood-diner/src/lib/schemas.test.ts', 'elder-care-planner') === false,
  'isTestFileForApp: rejects a test file under a different app',
);
ok(
  isTestFileForApp('projects/mood-diner/src/lib/schemas.test.tsx', 'mood-diner') === true,
  'isTestFileForApp: recognizes .test.tsx files',
);

/* ---- specPathForApp -------------------------------------------------------- */

ok(
  specPathForApp('mood-diner') === 'specs/mood-diner-spec.md',
  'specPathForApp: generates correct path for mood-diner',
);
ok(
  specPathForApp('elder-care-planner') === 'specs/elder-care-planner-spec.md',
  'specPathForApp: generates correct path for elder-care-planner',
);

/* ---- isSpecUnchangedAcknowledged ------------------------------------------- */

ok(
  isSpecUnchangedAcknowledged('[spec-unchanged: pure bugfix matching existing spec]') === true,
  'isSpecUnchangedAcknowledged: recognizes the acknowledgment marker',
);
ok(
  isSpecUnchangedAcknowledged('Some PR body without the marker.') === false,
  'isSpecUnchangedAcknowledged: returns false without the marker',
);
ok(
  isSpecUnchangedAcknowledged('') === false,
  'isSpecUnchangedAcknowledged: returns false for empty body',
);
ok(
  isSpecUnchangedAcknowledged(null) === false,
  'isSpecUnchangedAcknowledged: returns false for null body',
);
ok(
  isSpecUnchangedAcknowledged('[spec-unchanged:]') === false,
  'isSpecUnchangedAcknowledged: rejects empty reason',
);

/* ---- findOrderingViolations ------------------------------------------------ */

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 1,
    'findOrderingViolations: flags a logic change with no spec or test touch',
  );
  ok(
    violations[0].app === 'mood-diner',
    'findOrderingViolations: reports the correct app name',
  );
  ok(
    violations[0].specPath === 'specs/mood-diner-spec.md',
    'findOrderingViolations: reports the expected spec path',
  );
  ok(
    violations[0].logicFiles.length === 1,
    'findOrderingViolations: lists the logic files that triggered the finding',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'specs/mood-diner-spec.md',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 0,
    'findOrderingViolations: no violation when spec is also touched',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/mood-diner/src/lib/schemas.test.ts',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 0,
    'findOrderingViolations: no violation when a test file is also touched',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
  ];
  const violations = findOrderingViolations(touched, '[spec-unchanged: pure bugfix]');
  ok(
    violations.length === 0,
    'findOrderingViolations: no violation when [spec-unchanged: reason] is in PR body',
  );
}

{
  const touched = [
    'projects/mood-diner/src/components/Card.tsx',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 0,
    'findOrderingViolations: component changes do not trigger the check',
  );
}

{
  const touched = [
    'scripts/harness-status.mjs',
    'CLAUDE.md',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 0,
    'findOrderingViolations: non-app files do not trigger the check',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/elder-care-planner/src/engine/breakeven.ts',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 2,
    'findOrderingViolations: reports violations for multiple apps independently',
  );
  const apps = violations.map((v) => v.app).sort();
  ok(
    apps[0] === 'elder-care-planner' && apps[1] === 'mood-diner',
    'findOrderingViolations: correctly identifies both affected apps',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/schemas.ts',
    'projects/elder-care-planner/src/engine/breakeven.ts',
    'specs/mood-diner-spec.md',
    'projects/elder-care-planner/src/engine/breakeven.test.ts',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 0,
    'findOrderingViolations: no violations when each app has either spec or test touched',
  );
}

{
  const touched = [
    'projects/mood-diner/src/lib/a.ts',
    'projects/mood-diner/src/lib/b.ts',
    'projects/mood-diner/src/utils/c.ts',
  ];
  const violations = findOrderingViolations(touched, '');
  ok(
    violations.length === 1,
    'findOrderingViolations: multiple logic files in the same app produce one violation',
  );
  ok(
    violations[0].logicFiles.length === 3,
    'findOrderingViolations: all logic files are listed in the violation',
  );
}

/* ---- Summary --------------------------------------------------------------- */

console.log(`\n${failures === 0 ? '✓ All' : `✗ ${failures}`} spec-ordering self-test(s) ${failures === 0 ? 'passed' : 'FAILED'}.`);
if (failures > 0) process.exit(1);
