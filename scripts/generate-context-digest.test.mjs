#!/usr/bin/env node
// Self-test for the context staleness marker (see generate-context-digest.mjs header).
//
// Zero dependencies; run with:
//   node scripts/generate-context-digest.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  sha256,
  findSchemaFile,
  countFiles,
  countLogicModules,
  countTestFiles,
  buildAppDigest,
  countGuardrails,
  countLessons,
  buildDigest,
  diffDigests,
} from './generate-context-digest.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- sha256 --------------------------------------------------------------- */

ok(
  sha256('hello world') === 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  'sha256: produces correct hash for "hello world"',
);
ok(
  sha256('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'sha256: produces correct hash for empty string',
);
ok(
  sha256('a') !== sha256('b'),
  'sha256: different inputs produce different hashes',
);

/* ---- fixture tree --------------------------------------------------------- */

const tmpRoot = mkdtempSync(join(tmpdir(), 'ctx-digest-test-'));
const cleanup = () => { try { rmSync(tmpRoot, { recursive: true }); } catch {} };

function makeFixtureTree() {
  const root = join(tmpRoot, 'repo');
  mkdirSync(root, { recursive: true });

  mkdirSync(join(root, 'projects', 'app-one', 'src', 'lib', 'engine'), { recursive: true });
  mkdirSync(join(root, 'projects', 'app-one', 'src', 'utils'), { recursive: true });
  mkdirSync(join(root, 'projects', 'app-two', 'src', 'lib'), { recursive: true });
  mkdirSync(join(root, 'specs'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, '.agents'), { recursive: true });

  writeFileSync(join(root, 'projects', 'app-one', 'src', 'lib', 'schemas.ts'), 'export const S = {};');
  writeFileSync(join(root, 'projects', 'app-one', 'src', 'lib', 'engine', 'calc.ts'), 'export const x = 1;');
  writeFileSync(join(root, 'projects', 'app-one', 'src', 'lib', 'engine', 'calc.test.ts'), 'test()');
  writeFileSync(join(root, 'projects', 'app-one', 'src', 'lib', 'helpers.ts'), 'export const h = 2;');
  writeFileSync(join(root, 'projects', 'app-one', 'src', 'lib', 'helpers.test.ts'), 'test()');
  writeFileSync(join(root, 'projects', 'app-one', 'src', 'utils', 'fmt.ts'), 'export const f = 3;');

  writeFileSync(join(root, 'projects', 'app-two', 'src', 'lib', 'data.ts'), 'export const d = 1;');
  writeFileSync(join(root, 'projects', 'app-two', 'src', 'schemas.ts'), 'export const S2 = {};');

  writeFileSync(join(root, 'specs', 'app-one-spec.md'), '# App One Spec\nSome content.');

  writeFileSync(join(root, 'scripts', 'harness-status.mjs'), `
const GUARDRAILS = [
  { id: 'viewport-no-zoom', test: () => {} },
  { id: 'explicit-any', test: () => {} },
  { id: 'responsive-grid', test: () => {} },
];
`);

  writeFileSync(join(root, '.agents', 'AGENTS.md'), `
## 6. Learned Lessons & Best Practices
- **Lesson one**: do the thing.
- **Lesson two**: do the other thing.
- **Lesson three** \`[guardrail: x]\`: checked.
- **Lesson four**: unchecked.

## 7. Mandatory Session Wrap-up
`);

  return root;
}

const fixtureRoot = makeFixtureTree();

/* ---- findSchemaFile ------------------------------------------------------- */

ok(
  findSchemaFile(join(fixtureRoot, 'projects', 'app-one'))?.endsWith('src/lib/schemas.ts'),
  'findSchemaFile: finds src/lib/schemas.ts',
);
ok(
  findSchemaFile(join(fixtureRoot, 'projects', 'app-two'))?.endsWith('src/schemas.ts'),
  'findSchemaFile: finds src/schemas.ts as fallback',
);
ok(
  findSchemaFile(join(fixtureRoot, 'projects', 'nonexistent')) === null,
  'findSchemaFile: returns null when no schema file exists',
);

/* ---- countFiles ----------------------------------------------------------- */

ok(
  countFiles(join(fixtureRoot, 'projects', 'app-one', 'src', 'lib'), (n) => n.endsWith('.ts')) === 5,
  'countFiles: counts all .ts files under lib (including subdirs)',
);
ok(
  countFiles(join(fixtureRoot, 'projects', 'nonexistent'), () => true) === 0,
  'countFiles: returns 0 for non-existent directory',
);

/* ---- countLogicModules ---------------------------------------------------- */

ok(
  countLogicModules(join(fixtureRoot, 'projects', 'app-one')) === 4,
  'countLogicModules: counts non-test .ts files in logic dirs (lib/schemas.ts, engine/calc.ts, lib/helpers.ts, utils/fmt.ts)',
);
ok(
  countLogicModules(join(fixtureRoot, 'projects', 'app-two')) === 1,
  'countLogicModules: counts lib/data.ts for app-two',
);

/* ---- countTestFiles ------------------------------------------------------- */

ok(
  countTestFiles(join(fixtureRoot, 'projects', 'app-one')) === 2,
  'countTestFiles: finds both .test.ts files',
);
ok(
  countTestFiles(join(fixtureRoot, 'projects', 'app-two')) === 0,
  'countTestFiles: returns 0 when no test files exist',
);

/* ---- countGuardrails ------------------------------------------------------ */

{
  const src = `const GUARDRAILS = [
  { id: 'a', test: () => {} },
  { id: 'b', test: () => {} },
];`;
  ok(countGuardrails(src) === 2, 'countGuardrails: counts guardrail ids');
}
ok(countGuardrails('no array here') === 0, 'countGuardrails: returns 0 when no array found');

/* ---- countLessons --------------------------------------------------------- */

{
  const src = `
## 6. Learned Lessons & Best Practices
- **Lesson A**: thing one.
- **Lesson B**: thing two.
- **Lesson C**: thing three.

## 7. Mandatory Session Wrap-up
`;
  ok(countLessons(src) === 3, 'countLessons: counts §6 lesson bullets');
}
ok(countLessons('no section here') === 0, 'countLessons: returns 0 when §6 not found');

/* ---- buildDigest ---------------------------------------------------------- */

{
  const digest = buildDigest({
    repoRoot: fixtureRoot,
    headCommit: 'abc1234def5678',
    gitLogForSpec: null,
  });

  ok(digest.headCommit === 'abc1234def5678', 'buildDigest: includes headCommit');
  ok(digest.guardrailCount === 3, 'buildDigest: counts guardrails from fixture harness-status.mjs');
  ok(digest.lessonCount === 4, 'buildDigest: counts lessons from fixture AGENTS.md');
  ok(typeof digest.generatedAt === 'string', 'buildDigest: includes generatedAt timestamp');

  ok(Object.keys(digest.apps).length === 2, 'buildDigest: includes both apps');
  ok(digest.apps['app-one'] != null, 'buildDigest: includes app-one');
  ok(digest.apps['app-two'] != null, 'buildDigest: includes app-two');

  ok(
    digest.apps['app-one'].specHash?.startsWith('sha256:'),
    'buildDigest: app-one has a spec hash',
  );
  ok(
    digest.apps['app-two'].specHash === null,
    'buildDigest: app-two has no spec (no spec file exists)',
  );

  ok(
    digest.apps['app-one'].schemaHash?.startsWith('sha256:'),
    'buildDigest: app-one has a schema hash',
  );
  ok(
    digest.apps['app-two'].schemaHash?.startsWith('sha256:'),
    'buildDigest: app-two has a schema hash (src/schemas.ts)',
  );

  ok(
    digest.apps['app-one'].logicModules === 4,
    'buildDigest: app-one logic module count correct',
  );
  ok(
    digest.apps['app-one'].unitTestFiles === 2,
    'buildDigest: app-one unit test file count correct',
  );
}

/* ---- buildDigest: spec hash changes when spec is modified ----------------- */

{
  const digest1 = buildDigest({ repoRoot: fixtureRoot, headCommit: null, gitLogForSpec: null });
  const origHash = digest1.apps['app-one'].specHash;

  writeFileSync(join(fixtureRoot, 'specs', 'app-one-spec.md'), '# App One Spec\nModified content.');
  const digest2 = buildDigest({ repoRoot: fixtureRoot, headCommit: null, gitLogForSpec: null });

  ok(
    digest2.apps['app-one'].specHash !== origHash,
    'buildDigest: spec hash changes when spec file is modified',
  );
  ok(
    digest2.apps['app-one'].specHash?.startsWith('sha256:'),
    'buildDigest: modified spec hash still has sha256: prefix',
  );

  writeFileSync(join(fixtureRoot, 'specs', 'app-one-spec.md'), '# App One Spec\nSome content.');
}

/* ---- diffDigests ---------------------------------------------------------- */

{
  const saved = {
    generatedAt: '2026-08-17T00:00:00Z',
    headCommit: 'aaaa111',
    guardrailCount: 7,
    lessonCount: 48,
    apps: {
      'app-one': { specHash: 'sha256:aaa', schemaHash: 'sha256:bbb', logicModules: 5, unitTestFiles: 3 },
      'app-two': { specHash: null, schemaHash: 'sha256:ccc', logicModules: 2, unitTestFiles: 1 },
    },
  };

  const liveNoChange = { ...saved, generatedAt: '2026-08-17T01:00:00Z' };
  ok(
    diffDigests(saved, liveNoChange).length === 0,
    'diffDigests: no changes when digests are identical (except generatedAt)',
  );
}

{
  const saved = {
    headCommit: 'aaaa111',
    guardrailCount: 7,
    lessonCount: 48,
    apps: {
      'app-one': { specHash: 'sha256:aaa', schemaHash: 'sha256:bbb', logicModules: 5, unitTestFiles: 3 },
    },
  };
  const live = {
    headCommit: 'bbbb222',
    guardrailCount: 7,
    lessonCount: 48,
    apps: {
      'app-one': { specHash: 'sha256:xxx', schemaHash: 'sha256:bbb', logicModules: 5, unitTestFiles: 3 },
    },
  };
  const changes = diffDigests(saved, live);
  ok(
    changes.some((c) => c.includes('HEAD moved')),
    'diffDigests: detects HEAD commit change',
  );
  ok(
    changes.some((c) => c.includes('app-one') && c.includes('spec changed')),
    'diffDigests: detects spec hash change',
  );
}

{
  const saved = {
    headCommit: 'aaa',
    guardrailCount: 7,
    lessonCount: 48,
    apps: { 'app-one': { specHash: null, schemaHash: null, logicModules: 3, unitTestFiles: 2 } },
  };
  const live = {
    headCommit: 'aaa',
    guardrailCount: 8,
    lessonCount: 49,
    apps: { 'app-one': { specHash: null, schemaHash: 'sha256:new', logicModules: 4, unitTestFiles: 2 } },
  };
  const changes = diffDigests(saved, live);
  ok(
    changes.some((c) => c.includes('Guardrail count')),
    'diffDigests: detects guardrail count change',
  );
  ok(
    changes.some((c) => c.includes('Lesson count')),
    'diffDigests: detects lesson count change',
  );
  ok(
    changes.some((c) => c.includes('schema changed')),
    'diffDigests: detects schema hash change',
  );
  ok(
    changes.some((c) => c.includes('logic modules')),
    'diffDigests: detects logic module count change',
  );
}

{
  const saved = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: { 'app-one': { specHash: null, schemaHash: null, logicModules: 1, unitTestFiles: 0 } },
  };
  const live = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: {
      'app-one': { specHash: null, schemaHash: null, logicModules: 1, unitTestFiles: 0 },
      'app-new': { specHash: null, schemaHash: null, logicModules: 0, unitTestFiles: 0 },
    },
  };
  const changes = diffDigests(saved, live);
  ok(
    changes.some((c) => c.includes('app-new') && c.includes('new app appeared')),
    'diffDigests: detects a new app appearing',
  );
}

{
  const saved = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: {
      'app-one': { specHash: null, schemaHash: null, logicModules: 1, unitTestFiles: 0 },
      'app-old': { specHash: null, schemaHash: null, logicModules: 2, unitTestFiles: 1 },
    },
  };
  const live = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: { 'app-one': { specHash: null, schemaHash: null, logicModules: 1, unitTestFiles: 0 } },
  };
  const changes = diffDigests(saved, live);
  ok(
    changes.some((c) => c.includes('app-old') && c.includes('app removed')),
    'diffDigests: detects an app being removed',
  );
}

/* ---- diffDigests: reports correct apps when multiple change ---------------- */

{
  const saved = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: {
      'alpha': { specHash: 'sha256:a1', schemaHash: 'sha256:b1', logicModules: 3, unitTestFiles: 2 },
      'beta': { specHash: 'sha256:a2', schemaHash: 'sha256:b2', logicModules: 5, unitTestFiles: 4 },
      'gamma': { specHash: 'sha256:a3', schemaHash: 'sha256:b3', logicModules: 1, unitTestFiles: 1 },
    },
  };
  const live = {
    headCommit: 'aaa', guardrailCount: 7, lessonCount: 48,
    apps: {
      'alpha': { specHash: 'sha256:a1', schemaHash: 'sha256:b1', logicModules: 3, unitTestFiles: 2 },
      'beta': { specHash: 'sha256:changed', schemaHash: 'sha256:b2', logicModules: 5, unitTestFiles: 4 },
      'gamma': { specHash: 'sha256:a3', schemaHash: 'sha256:b3', logicModules: 1, unitTestFiles: 1 },
    },
  };
  const changes = diffDigests(saved, live);
  ok(
    changes.length === 1 && changes[0].includes('beta') && changes[0].includes('spec changed'),
    'diffDigests: reports only the changed app when others are unchanged',
  );
}

/* ---- buildAppDigest with lastSpecCommitFn --------------------------------- */

{
  const entry = buildAppDigest({
    appPath: join(fixtureRoot, 'projects', 'app-one'),
    specPath: join(fixtureRoot, 'specs', 'app-one-spec.md'),
    schemaPath: join(fixtureRoot, 'projects', 'app-one', 'src', 'lib', 'schemas.ts'),
    lastSpecCommitFn: () => 'deadbeef123',
  });
  ok(
    entry.lastSpecChange === 'deadbeef123',
    'buildAppDigest: includes lastSpecChange from provided function',
  );
}

{
  const entry = buildAppDigest({
    appPath: join(fixtureRoot, 'projects', 'app-one'),
    specPath: null,
    schemaPath: null,
    lastSpecCommitFn: null,
  });
  ok(entry.specHash === null, 'buildAppDigest: null specHash when no spec path');
  ok(entry.schemaHash === null, 'buildAppDigest: null schemaHash when no schema path');
  ok(entry.lastSpecChange === null, 'buildAppDigest: null lastSpecChange when no function');
}

/* ---- Cleanup -------------------------------------------------------------- */

cleanup();

/* ---- Summary --------------------------------------------------------------- */

console.log(`\n${failures === 0 ? '✓ All' : `✗ ${failures}`} context-digest self-test(s) ${failures === 0 ? 'passed' : 'FAILED'}.`);
if (failures > 0) process.exit(1);
