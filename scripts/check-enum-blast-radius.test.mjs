#!/usr/bin/env node
// Self-test for the blast-radius gate (.agents/AGENTS.md §9.2).
//
// The gate blocks merges, so the gate is itself gated: each case below pins one
// behaviour that must fire and one that must stay silent. The known-bad cases
// are lifted from the real shape of PR #41 — a member added to CareTypeSchema
// while three of that type's consumers went unopened.
//
// Zero dependencies; run with:
//   node scripts/check-enum-blast-radius.test.mjs

import {
  extractEnums,
  inferredTypeName,
  gainedMembers,
  isAcknowledged,
  unacknowledged,
  findConsumers,
} from './check-enum-blast-radius.mjs';

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}`);
    failures += 1;
  }
};

/* ---- the real shape from PR #41 ------------------------------------- */

const BASE = `
export const CareTypeSchema = z.enum([
  'in_home_homemaker',
  'adult_day_care',
  'assisted_living',
]);
export type CareType = z.infer<typeof CareTypeSchema>;
`;

const HEAD = `
export const CareTypeSchema = z.enum([
  'in_home_homemaker',
  'adult_day_care',
  'independent_living', // the member PR #41 added
  'assisted_living',
]);
export type CareType = z.infer<typeof CareTypeSchema>;
`;

/* ---- extraction ------------------------------------------------------ */

const enums = extractEnums(HEAD);
ok(enums.has('CareTypeSchema'), 'extractEnums: finds an exported z.enum declaration');
ok(enums.get('CareTypeSchema').size === 4, 'extractEnums: reads every member literal');
ok(
  extractEnums('const NotExported = z.enum([\'a\']);').size === 0,
  'extractEnums: ignores a non-exported declaration',
);
ok(
  extractEnums('export const S = z.enum(["a", "b"]);').get('S').has('b'),
  'extractEnums: handles double-quoted members',
);

/* ---- inferred type resolution ---------------------------------------- */

ok(
  inferredTypeName(HEAD, 'CareTypeSchema') === 'CareType',
  'inferredTypeName: resolves the z.infer alias',
);
ok(
  inferredTypeName(HEAD, 'SomethingElseSchema') === null,
  'inferredTypeName: returns null when no alias exists',
);

/* ---- widening detection ---------------------------------------------- */

const gained = gainedMembers(BASE, HEAD);
ok(gained.length === 1, 'gainedMembers: reports the widened schema');
ok(
  gained[0].added.length === 1 && gained[0].added[0] === 'independent_living',
  'gainedMembers: names exactly the added member',
);
ok(gained[0].typeName === 'CareType', 'gainedMembers: carries the inferred type name');

ok(gainedMembers(HEAD, HEAD).length === 0, 'gainedMembers: silent when nothing changed');
ok(
  gainedMembers(HEAD, BASE).length === 0,
  'gainedMembers: a REMOVED member is not a widening',
);

const REORDERED = `
export const CareTypeSchema = z.enum([
  'assisted_living',
  'adult_day_care',
  'in_home_homemaker',
]);
export type CareType = z.infer<typeof CareTypeSchema>;
`;
ok(
  gainedMembers(BASE, REORDERED).length === 0,
  'gainedMembers: reordering members is not a widening',
);

const BRAND_NEW = `${BASE}
export const NewThingSchema = z.enum(['x', 'y']);
export type NewThing = z.infer<typeof NewThingSchema>;
`;
ok(
  gainedMembers(BASE, BRAND_NEW).length === 0,
  'gainedMembers: a brand-new enum is not a widening (it has no existing consumers)',
);

/* ---- acknowledgement via the PR body --------------------------------- */

const CONSUMER = 'projects/elder-care-planner/src/lib/data/costOfCare.ts';

ok(
  isAcknowledged(`| ${CONSUMER} | adds the label |`, CONSUMER),
  'isAcknowledged: accepts the full repo-relative path',
);
ok(
  isAcknowledged('| data/costOfCare.ts | adds the label |', CONSUMER),
  'isAcknowledged: accepts a two-segment suffix, as a table naturally writes it',
);
ok(
  !isAcknowledged('| costOfCare.ts | adds the label |', CONSUMER),
  'isAcknowledged: a bare filename is NOT enough — one segment collides too easily',
);
ok(!isAcknowledged('', CONSUMER), 'isAcknowledged: an empty body accounts for nothing');
ok(
  !isAcknowledged('nothing relevant here', CONSUMER),
  'isAcknowledged: unrelated prose accounts for nothing',
);

/* ---- the gate decision ------------------------------------------------ */

const CONSUMERS = [
  'projects/elder-care-planner/src/lib/data/costOfCare.ts',
  'projects/elder-care-planner/src/lib/explain/build.ts',
  'projects/elder-care-planner/src/app/page.tsx',
  'projects/elder-care-planner/src/lib/engine/cost.ts',
];

// PR #41 exactly: it touched cost.ts and left the other three unopened.
const missed = unacknowledged({
  consumers: CONSUMERS,
  touched: ['projects/elder-care-planner/src/lib/engine/cost.ts'],
  body: 'Engine only. No UI changes in this PR.',
});
ok(missed.length === 3, 'unacknowledged: reproduces PR #41 — three consumers unhandled');
ok(
  missed.includes('projects/elder-care-planner/src/lib/data/costOfCare.ts'),
  'unacknowledged: names the file whose Record<CareType, string> broke the build',
);

// The same PR, once every consumer is touched.
ok(
  unacknowledged({ consumers: CONSUMERS, touched: CONSUMERS, body: '' }).length === 0,
  'unacknowledged: silent when every consumer was touched',
);

// A consumer that legitimately needs no change, declared in the body.
ok(
  unacknowledged({
    consumers: CONSUMERS,
    touched: [
      'projects/elder-care-planner/src/lib/engine/cost.ts',
      'projects/elder-care-planner/src/lib/data/costOfCare.ts',
      'projects/elder-care-planner/src/lib/explain/build.ts',
    ],
    body: '| src/app/page.tsx | dropdown is filtered, no change needed |',
  }).length === 0,
  'unacknowledged: a body entry counts as handled, so "no change needed" stays available',
);

/* ---- consumer discovery over a fake tree ------------------------------ */
{
  const files = ['/app/src/a.ts', '/app/src/b.ts', '/app/src/schemas.ts'];
  const contents = {
    '/app/src/a.ts': 'const x: CareType = "y";',
    '/app/src/b.ts': 'nothing to see',
    '/app/src/schemas.ts': 'export type CareType = ...',
  };
  const found = findConsumers('/app/src', 'CareType', '/app/src/schemas.ts', () => files, (f) => contents[f]);
  ok(
    found.length === 1 && found[0] === '/app/src/a.ts',
    'findConsumers: finds referencing files and excludes the declaring file',
  );

  const notSubstring = findConsumers(
    '/app/src',
    'Care',
    '/app/src/schemas.ts',
    () => ['/app/src/a.ts'],
    () => 'const x: CareType = "y";',
  );
  ok(
    notSubstring.length === 0,
    'findConsumers: matches whole words only — "Care" must not match "CareType"',
  );
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log('\nBlast-radius gate verified: widening detected, removals ignored, body acknowledgement honoured.');
