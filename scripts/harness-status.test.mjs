#!/usr/bin/env node
// Self-test for the VERIFY gate: proves every guardrail fires on a known-bad
// line and stays silent on a known-good line. If a guardrail's regex rots
// (stops catching the regression, or starts flagging clean code), this fails —
// so the thing that gates merges is itself gated. Zero dependencies; run with:
//   node scripts/harness-status.test.mjs

import { GUARDRAILS, senseMobileRelease, senseProductionBundleTest, senseUnitTests, isBlocking } from './harness-status.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// For each guardrail id: a line that MUST trip it, and one that MUST NOT.
const CASES = {
  'viewport-no-zoom': {
    bad: ['<meta name="viewport" content="width=device-width, user-scalable=no">',
          '<meta name="viewport" content="width=device-width, maximum-scale=1.0">'],
    good: ['<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">'],
  },
  'explicit-any': {
    bad: ['const x = foo as any;', 'let y: any = 1;', 'function f(z: any) {}'],
    good: ['const x: string = "a";', 'let items: Recipe[] = [];', 'const anything = true;'],
  },
  'root-service-worker': {
    bad: ["navigator.serviceWorker.register('/sw.js');", 'navigator.serviceWorker.register("/sw.js", {})'],
    good: ["navigator.serviceWorker.register(window.location.pathname + 'sw.js');"],
  },
  'pbkdf2-salt-buffer': {
    bad: ['salt: saltBytes.buffer,', 'const s = saltRaw.buffer;'],
    good: ['salt: new Uint8Array(saltBytes),', 'salt: saltBytes,'],
  },
  'responsive-grid': {
    bad: [
      "gridTemplateColumns: '1fr 1fr'",
      "gridTemplateColumns: '1fr 2fr'",
      "gridTemplateColumns: '1fr 1fr 1fr'",
      'grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));',
    ],
    good: [
      "gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))'",
      'grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));',
      "gridTemplateColumns: '1fr'",
      'grid-template-columns: 1fr 1fr; /* handled by @media below */',
    ],
  },
  'no-op-assertion': {
    bad: [
      '  expect(result);',
      '  expect(splitCosts(plan));',
      '  await expect(loadPlan());',
      '  const _: typeof PlanSchema = undefined as unknown as typeof PlanSchema;',
    ],
    good: [
      '  expect(result).toBe(3);',
      '  expect(result).not.toBeNull();',
      '  expect(() => parse(bad)).toThrow();',
      '  await expect(page.getByRole("button")).toBeVisible();',
      '  expect(', // a wrapped call: the matcher is on a later line
      '  ).toEqual({ a: 1 });',
      // The other wrap: the call closes here and the matcher is on the NEXT
      // line. This shape is real — it is how mood-diner/src/lib/schemas.test.ts
      // formats a long parse assertion, and an earlier version of this guardrail
      // false-positived on exactly it. Only the absent semicolon separates it
      // from `expect(x);`, which is why the regex requires one.
      '    expect(OpeningHourRangeSchema.parse({ openHour: 12, closeHour: 23 }))',
      '      .toEqual({ openHour: 12, closeHour: 23 });',
      '  expect.assertions(2);',
      '  const parsed: typeof PlanSchema = OtherSchema;',
      '  const w: typeof A = b as unknown as typeof B;',
    ],
  },
  'capacitor-absolute-base': {
    bad: [
      "base: '/agentic-app-harness/mood-diner/',",
      "base: process.env.NODE_ENV === 'production' ? '/agentic-app-harness/mood-diner/' : '/',",
      'basePath: "/agentic-app-harness/travel-packing-app",',
    ],
    good: [
      "base: './',",
      "base: '/',",
      "base: process.env.NODE_ENV === 'production' ? './' : '/',",
      "const dbUrl = database: '/not/a/base';",
    ],
  },
};

let failures = 0;
const seen = new Set();

for (const g of GUARDRAILS) {
  const c = CASES[g.id];
  if (!c) {
    console.error(`✗ ${g.id}: no test case defined — every guardrail must be self-tested`);
    failures++;
    continue;
  }
  seen.add(g.id);
  for (const line of c.bad) {
    if (!g.test(line)) { console.error(`✗ ${g.id}: MISSED a known-bad line: ${line}`); failures++; }
  }
  for (const line of c.good) {
    if (g.test(line)) { console.error(`✗ ${g.id}: false-positive on a known-good line: ${line}`); failures++; }
  }
  if (!failures) console.log(`✓ ${g.id}`);
}

// A test case for a guardrail that no longer exists is dead weight.
for (const id of Object.keys(CASES)) {
  if (!seen.has(id)) { console.error(`✗ orphan test case '${id}' — no matching guardrail`); failures++; }
}

// ---------------------------------------------------------------------------
// Mobile release readiness sensor. Not a guardrail (these are absence checks,
// not line patterns) and non-blocking by design — but still self-tested, so it
// cannot silently stop reporting. Driven against real fixture trees on disk.
// ---------------------------------------------------------------------------

// The real Capacitor default hdpi launcher icon, byte for byte — this is what
// the unbranded-icon check hashes against, so the fixture must keep matching a
// CAPACITOR_DEFAULT_ICON_SHA256 entry in harness-status.mjs.
//
// A committed fixture, NOT a live app icon. This originally pointed at
// projects/mood-diner's icon, which broke the moment that app was branded — the
// fixture stopped being a default and the check silently looked broken. A test
// for "is this the stock scaffold asset?" must own a copy of the stock asset.
//
// fileURLToPath, not URL.pathname — the latter yields '/C:/...' on Windows and
// the harness CI runs on windows-latest.
const DEFAULT_ICON_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures', 'capacitor-default-ic_launcher-hdpi.png');

function buildFixture(root, { signed, versionCode, appName, icon, manifestIcons, privacy, ci }) {
  const res = join(root, 'android', 'app', 'src', 'main', 'res');
  mkdirSync(join(res, 'values'), { recursive: true });
  mkdirSync(join(res, 'mipmap-hdpi'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });

  writeFileSync(join(root, 'android', 'app', 'build.gradle'), [
    'android {',
    `    defaultConfig { versionCode ${versionCode} versionName "1.0" }`,
    signed ? '    signingConfigs { release { storeFile file(System.getenv("KEYSTORE")) } }' : '',
    '    buildTypes { release { } }',
    '}',
  ].join('\n'));

  writeFileSync(join(res, 'values', 'strings.xml'),
    `<resources><string name="app_name">${appName}</string></resources>`);

  // 'default' copies the genuine Capacitor scaffold icon; 'custom' is distinct bytes.
  writeFileSync(join(res, 'mipmap-hdpi', 'ic_launcher.png'),
    icon === 'default' ? readFileSync(DEFAULT_ICON_SRC) : Buffer.from('custom-branded-icon'));

  writeFileSync(join(root, 'public', 'manifest.json'),
    JSON.stringify({ icons: [{ src: '/icon-512.png' }] }));
  if (manifestIcons === 'present') writeFileSync(join(root, 'public', 'icon-512.png'), Buffer.from('x'));

  if (privacy) writeFileSync(join(root, 'PRIVACY.md'), '# Privacy Policy');

  const wf = join(root, 'wf');
  mkdirSync(wf, { recursive: true });
  writeFileSync(join(wf, 'ci.yml'), ci ? 'run: ./gradlew bundleRelease' : 'run: npm test');
  return wf;
}

const tmp = mkdtempSync(join(tmpdir(), 'harness-mobile-'));
try {
  // (a) Worst case: every check should fire.
  const badRoot = join(tmp, 'bad');
  mkdirSync(badRoot, { recursive: true });
  const badWf = buildFixture(badRoot, {
    signed: false, versionCode: 1, appName: 'bad-app', icon: 'default',
    manifestIcons: 'missing', privacy: false, ci: false });
  const badIds = senseMobileRelease('bad-app', badRoot, badWf, [badRoot])
    .map((f) => f.id.replace('bad-app-mobile-', '')).sort();
  const expected = ['default-launcher-icon', 'default-version-code', 'manifest-icons-missing',
    'no-android-ci', 'no-privacy-policy', 'no-signing-config', 'slug-app-name'].sort();
  for (const id of expected) {
    if (!badIds.includes(id)) { console.error(`✗ mobile-readiness: MISSED '${id}' on the known-bad fixture`); failures++; }
  }
  if (badIds.length !== expected.length) {
    console.error(`✗ mobile-readiness: unexpected findings on known-bad fixture: ${badIds.join(', ')}`); failures++;
  }

  // (b) Fully prepared release: nothing should fire.
  const goodRoot = join(tmp, 'good');
  mkdirSync(goodRoot, { recursive: true });
  const goodWf = buildFixture(goodRoot, {
    signed: true, versionCode: 12, appName: 'Mood Diner', icon: 'custom',
    manifestIcons: 'present', privacy: true, ci: true });
  const goodIds = senseMobileRelease('good-app', goodRoot, goodWf, [goodRoot]).map((f) => f.id);
  if (goodIds.length) {
    console.error(`✗ mobile-readiness: false-positive on a release-ready fixture: ${goodIds.join(', ')}`); failures++;
  }

  // (b2) A policy published under public/ counts — that is where it has to live
  // to get a public URL, which is what Play actually requires.
  const pubRoot = join(tmp, 'public-policy');
  mkdirSync(pubRoot, { recursive: true });
  const pubWf = buildFixture(pubRoot, {
    signed: true, versionCode: 12, appName: 'Mood Diner', icon: 'custom',
    manifestIcons: 'present', privacy: false, ci: true });
  writeFileSync(join(pubRoot, 'public', 'privacy.html'), '<h1>Privacy Policy</h1>');
  const pubIds = senseMobileRelease('pub-app', pubRoot, pubWf, [pubRoot, join(pubRoot, 'public')])
    .map((f) => f.id);
  if (pubIds.length) {
    console.error(`✗ mobile-readiness: did not accept a policy under public/: ${pubIds.join(', ')}`); failures++;
  }

  // (c) A web-only app has no native container and must be entirely out of scope.
  const webRoot = join(tmp, 'web');
  mkdirSync(join(webRoot, 'src'), { recursive: true });
  if (senseMobileRelease('web-app', webRoot, goodWf, [webRoot]).length) {
    console.error('✗ mobile-readiness: fired on a web-only app with no native container'); failures++;
  }

  // (d) Every finding must be non-blocking — this sensor informs, never gates.
  const blocking = senseMobileRelease('bad-app', badRoot, badWf, [badRoot]).filter(isBlocking);
  if (blocking.length) {
    console.error(`✗ mobile-readiness: ${blocking.length} finding(s) block the gate; this sensor must only inform`); failures++;
  }

  if (!failures) console.log('✓ mobile-readiness sensor (fires on unprepared, silent on release-ready, scoped to native apps, non-blocking)');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Production-bundle coverage sensor. Also non-blocking, also fixture-driven.
// ---------------------------------------------------------------------------
const tmp2 = mkdtempSync(join(tmpdir(), 'harness-prodbundle-'));
try {
  const withConfig = (name, body) => {
    const root = join(tmp2, name);
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'playwright.config.ts'), body);
    return root;
  };

  // Fires: every webServer is a dev server.
  const devOnly = [
    ["webServer: { command: 'npm run dev', url: 'http://localhost:3000' }", 'npm run dev'],
    ["webServer: { command: 'npx vite --port 5178', url: 'http://localhost:5178' }", 'vite dev'],
    ["webServer: { command: 'npm run dev -- -p 3005', url: 'http://localhost:3005' }", 'next dev'],
  ];
  devOnly.forEach(([body, label], i) => {
    const found = senseProductionBundleTest('a', withConfig(`dev${i}`, body));
    if (found.length !== 1 || !found[0].id.endsWith('-no-production-bundle-test')) {
      console.error(`✗ production-bundle: MISSED a dev-server-only config (${label})`); failures++;
    }
  });

  // Silent: the config builds and serves the real output.
  const builds = [
    ["command: 'npx vite build && node ../../scripts/serve-dist.mjs --dist dist --port 5179'", 'vite build + shared server'],
    ["command: 'npm run build && npx serve out -l 4000'", 'next build + serve out'],
    ["command: 'npx next build && node server.mjs'", 'next build'],
  ];
  builds.forEach(([body, label], i) => {
    if (senseProductionBundleTest('a', withConfig(`build${i}`, body)).length) {
      console.error(`✗ production-bundle: false-positive on a config that builds (${label})`); failures++;
    }
  });

  // Silent: no Playwright config at all — that is the separate no-bdd finding.
  const bare = join(tmp2, 'bare');
  mkdirSync(bare, { recursive: true });
  if (senseProductionBundleTest('a', bare).length) {
    console.error('✗ production-bundle: fired on an app with no Playwright config'); failures++;
  }

  // Must only inform, never gate.
  if (senseProductionBundleTest('a', withConfig('blocking', "command: 'npm run dev'")).filter(isBlocking).length) {
    console.error('✗ production-bundle: finding blocks the gate; this sensor must only inform'); failures++;
  }

  if (!failures) console.log('✓ production-bundle sensor (fires on dev-only, silent when the build is served, non-blocking)');
} finally {
  rmSync(tmp2, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Unit-test-driven development sensor. Non-blocking, fixture-driven. The
// fixtures are real files on disk because the sensor resolves import
// specifiers against the filesystem — a string-only fixture would prove the
// regexes and skip the part most likely to break.
// ---------------------------------------------------------------------------
const tmp3 = mkdtempSync(join(tmpdir(), 'harness-unittests-'));
try {
  const write = (root, relPath, body) => {
    const full = join(root, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
    return full;
  };
  const bdd = (subject) => `import { describe, it, expect } from 'vitest';
import { run } from '${subject}';
describe('run', () => {
  it('Given a value, When run, Then it doubles', () => { expect(run(2)).toBe(4); });
});`;
  const idsOf = (root, app = 'a') => senseUnitTests(app, root).map((f) => f.id.replace(`${app}-unit-`, '')).sort();

  // (a) Worst case: logic modules, no tests at all, and an unscoped Vitest config.
  const bare = join(tmp3, 'bare');
  write(bare, 'vitest.config.ts', "export default { test: { environment: 'node' } };");
  write(bare, 'src/lib/engine.ts', 'export function run(n: number) { return n * 2; }');
  const bareIds = idsOf(bare);
  for (const id of ['no-unit-tests', 'vitest-unscoped']) {
    if (!bareIds.includes(id)) { console.error(`✗ unit-tests: MISSED '${id}' on an untested app`); failures++; }
  }

  // (b) Fully covered: every module has a BDD unit test and the config is scoped.
  const good = join(tmp3, 'good');
  write(good, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(good, 'src/lib/engine.ts', 'export function run(n: number) { return n * 2; }');
  write(good, 'src/lib/engine.test.ts', bdd('./engine'));
  const goodIds = idsOf(good);
  if (goodIds.length) { console.error(`✗ unit-tests: false-positive on a fully covered app: ${goodIds.join(', ')}`); failures++; }

  // (c) A test elsewhere in the tree that IMPORTS the module counts as coverage
  // — legal-financial-rag's single unit.test.ts covers eleven modules this way,
  // and a name-only check would report every one of them as untested.
  const byImport = join(tmp3, 'by-import');
  write(byImport, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(byImport, 'src/lib/security/hashChain.ts', 'export function run(n: number) { return n; }');
  write(byImport, 'src/lib/all.test.ts', bdd('./security/hashChain'));
  if (idsOf(byImport).length) {
    console.error('✗ unit-tests: did not credit a module covered by an imported-from test'); failures++;
  }

  // (d) An app-root __tests__/ importing through '../src/...' is the
  // travel-packing-app layout and must resolve.
  const rootTests = join(tmp3, 'root-tests');
  write(rootTests, 'vitest.config.ts', "export default { test: { include: ['__tests__/**/*.test.ts'] } };");
  write(rootTests, 'src/utils/knapsackEngine.ts', 'export const run = (n: number) => n;');
  write(rootTests, '__tests__/knapsackEngine.test.ts', bdd('../src/utils/knapsackEngine'));
  if (idsOf(rootTests).length) {
    console.error('✗ unit-tests: did not resolve an app-root __tests__ importing ../src'); failures++;
  }

  // (e) A type-only module has nothing to execute and must be out of scope.
  const typesOnly = join(tmp3, 'types-only');
  write(typesOnly, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(typesOnly, 'src/types.ts', "export type { Garment } from './schemas';\nexport interface Outfit { id: string }");
  if (idsOf(typesOnly).length) {
    console.error('✗ unit-tests: fired on a module that exports only types'); failures++;
  }

  // (f) Components and routes are E2E territory. Two separate scopings, and the
  // fixture must exercise both — an earlier version only had files outside the
  // logic dirs, so widening `walk` to .tsx was a mutation this case survived.
  //   - directory: src/components, src/app are not logic dirs;
  //   - extension: a .tsx provider INSIDE a logic dir (mood-diner really ships
  //     src/lib/monetization/MonetizationContext.tsx) is still a component.
  const uiOnly = join(tmp3, 'ui-only');
  write(uiOnly, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(uiOnly, 'src/components/Card.tsx', 'export const Card = () => null;');
  write(uiOnly, 'src/app/page.tsx', 'export default function Page() { return null; }');
  write(uiOnly, 'src/lib/monetization/MonetizationContext.tsx', 'export const Provider = () => null;');
  if (idsOf(uiOnly).length) {
    console.error('✗ unit-tests: demanded unit tests for components/routes'); failures++;
  }

  // (g) BDD compliance applies to unit tests, not only E2E specs.
  const noBdd = join(tmp3, 'no-bdd');
  write(noBdd, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(noBdd, 'src/lib/engine.ts', 'export function run(n: number) { return n; }');
  write(noBdd, 'src/lib/engine.test.ts',
    "import { run } from './engine';\ndescribe('run', () => { it('works', () => { expect(run(1)).toBe(1); }); });");
  if (!idsOf(noBdd).includes('bdd-noncompliant')) {
    console.error('✗ unit-tests: MISSED a unit test with no Given/When/Then'); failures++;
  }

  // (h) A Playwright e2e spec is not a unit test: it must neither be graded for
  // unit-BDD here (sensor 4 already does that) nor count as unit coverage.
  const e2eOnly = join(tmp3, 'e2e-only');
  write(e2eOnly, 'vitest.config.ts', "export default { test: { include: ['src/**/*.test.ts'] } };");
  write(e2eOnly, 'src/lib/engine.ts', 'export function run(n: number) { return n; }');
  write(e2eOnly, 'e2e/app.spec.ts', "import { run } from '../src/lib/engine';\ntest('x', () => {});");
  const e2eIds = idsOf(e2eOnly);
  if (!e2eIds.includes('no-unit-tests')) {
    console.error('✗ unit-tests: counted a Playwright e2e spec as unit coverage'); failures++;
  }
  if (e2eIds.includes('bdd-noncompliant')) {
    console.error('✗ unit-tests: graded a Playwright e2e spec against the unit-BDD check'); failures++;
  }

  // (i) These findings MUST gate. Non-blocking while the pre-existing backlog
  // was open; promoted once it was closed, per the §8 criterion. If this ever
  // needs relaxing, the type comes out of isBlocking and this case flips with
  // it — deliberately, rather than by the sensor quietly ceasing to matter.
  const gating = senseUnitTests('a', bare).filter(isBlocking);
  if (gating.length !== senseUnitTests('a', bare).length) {
    console.error('✗ unit-tests: a finding does not block the gate; untested logic must fail the build'); failures++;
  }

  if (!failures) console.log('✓ unit-test sensor (fires on untested logic, credits imported-from tests, scoped off UI, blocking)');
} finally {
  rmSync(tmp3, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log(`\nAll ${GUARDRAILS.length} guardrails + the mobile-readiness, production-bundle and unit-test sensors verified.`);
