#!/usr/bin/env node
// Self-test for the VERIFY gate: proves every guardrail fires on a known-bad
// line and stays silent on a known-good line. If a guardrail's regex rots
// (stops catching the regression, or starts flagging clean code), this fails —
// so the thing that gates merges is itself gated. Zero dependencies; run with:
//   node scripts/harness-status.test.mjs

import { GUARDRAILS, scanGuardrails, senseMobileRelease, senseProductionBundleTest, isBlocking } from './harness-status.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
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
// Single-pass scanner equivalence.
//
// scanGuardrails() walks an app once and reads each file once, instead of
// re-walking and re-reading per guardrail (4.4x fewer reads on this repo). That
// is only worth having if it is a *pure* refactor, so this asserts it against
// the naive implementation it replaced: same findings, same order, same
// evidence, same line numbers — on a fixture built to stress exactly the cases
// where a single pass could diverge.
// ---------------------------------------------------------------------------
function naiveScan(projPath, guardrails) {
  const out = [];
  for (const g of guardrails) {
    if (g.appliesTo && !g.appliesTo(projPath)) continue;
    const evidence = [];
    for (const f of walkFixture(projPath, g.exts)) {
      if (g.excludePath && g.excludePath(f)) continue;
      const lines = readFileSync(f, 'utf8').split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (g.test(lines[i])) evidence.push({ file: f, line: i + 1, snippet: lines[i].trim().slice(0, 160) });
      }
    }
    if (evidence.length) out.push({ id: g.id, evidence });
  }
  return out;
}

// Mirrors harness-status.mjs's walk() traversal order (stack-based, leaf-filtered).
function walkFixture(root, exts) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (exts.includes(extname(e.name))) out.push(full);
    }
  }
  return out;
}

const tmp3 = mkdtempSync(join(tmpdir(), 'harness-scan-'));
try {
  // A tree that exercises the divergence risks: guardrails overlapping on one
  // extension, one line tripping two guardrails at once, an excludePath'd file,
  // a scoped (appliesTo) guardrail, multiple hits per file, and nesting so
  // traversal order actually matters.
  const app = join(tmp3, 'app');
  mkdirSync(join(app, 'src', 'nested', 'deep'), { recursive: true });
  mkdirSync(join(app, 'e2e'), { recursive: true });

  writeFileSync(join(app, 'index.html'),
    '<meta name="viewport" content="width=device-width, user-scalable=no">\n'
    + '<script>navigator.serviceWorker.register("/sw.js")</script>\n');

  // Two guardrails (explicit-any, responsive-grid) on one file; line 3 is clean.
  writeFileSync(join(app, 'src', 'a.ts'), [
    'let x: any = 1;',
    "const s = { gridTemplateColumns: '1fr 1fr' };",
    'const ok: string = "fine";',
    'const y = z as any;',
  ].join('\n'));

  // One line tripping explicit-any AND pbkdf2-salt-buffer simultaneously.
  writeFileSync(join(app, 'src', 'nested', 'b.tsx'),
    'const k = derive({ salt: saltBytes.buffer } as any);\n');

  writeFileSync(join(app, 'src', 'nested', 'deep', 'c.ts'), 'let deep: any;\n');
  writeFileSync(join(app, 'src', 'styles.css'), 'grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));\n');

  // excludePath: explicit-any must ignore e2e/ and *.test.ts.
  writeFileSync(join(app, 'e2e', 'flow.spec.ts'), 'const ignored: any = 1;\n');
  writeFileSync(join(app, 'src', 'a.test.ts'), 'const alsoIgnored: any = 1;\n');

  // appliesTo: capacitor-absolute-base only fires with a native container.
  writeFileSync(join(app, 'vite.config.ts'), "export default { base: '/agentic-app-harness/app/' };\n");

  for (const [label, native] of [['web-only app', false], ['native-container app', true]]) {
    if (native) mkdirSync(join(app, 'android'), { recursive: true });

    const fast = scanGuardrails(app).map((r) => ({ id: r.guardrail.id, evidence: r.evidence }));
    const slow = naiveScan(app, GUARDRAILS);

    // Compare ids+order first so a mismatch reports something readable.
    const fastIds = fast.map((r) => r.id).join(',');
    const slowIds = slow.map((r) => r.id).join(',');
    if (fastIds !== slowIds) {
      console.error(`✗ scanGuardrails (${label}): finding set/order differs\n    single-pass: ${fastIds}\n    naive:       ${slowIds}`);
      failures++;
    } else {
      // Evidence: same count, same line numbers, same snippets, same order.
      // (Paths differ by design — scanGuardrails returns repo-relative.)
      for (let i = 0; i < fast.length; i++) {
        const f = fast[i].evidence.map((e) => `${e.line}:${e.snippet}`).join('|');
        const s = slow[i].evidence.map((e) => `${e.line}:${e.snippet}`).join('|');
        if (f !== s) {
          console.error(`✗ scanGuardrails (${label}): evidence differs for '${fast[i].id}'\n    single-pass: ${f}\n    naive:       ${s}`);
          failures++;
        }
      }
    }

    // The fixture must actually be exercising something, or this proves nothing.
    if (fast.length < 4) {
      console.error(`✗ scanGuardrails (${label}): fixture only tripped ${fast.length} guardrail(s); it is not stressing the scanner`);
      failures++;
    }
    if (native && !fastIds.includes('capacitor-absolute-base')) {
      console.error('✗ scanGuardrails: appliesTo guardrail did not fire on a native-container fixture'); failures++;
    }
    if (!native && fastIds.includes('capacitor-absolute-base')) {
      console.error('✗ scanGuardrails: appliesTo guardrail fired on a web-only fixture'); failures++;
    }
  }

  // excludePath must have held: no evidence may come from e2e/ or *.test.ts.
  const anyEvidence = scanGuardrails(app).flatMap((r) => r.evidence).map((e) => e.file);
  if (anyEvidence.some((f) => /[\\/]e2e[\\/]|\.test\.ts$/.test(f))) {
    console.error(`✗ scanGuardrails: excludePath ignored — evidence from ${anyEvidence.filter((f) => /[\\/]e2e[\\/]|\.test\.ts$/.test(f)).join(', ')}`);
    failures++;
  }

  if (!failures) console.log('✓ single-pass scanner (finding order, evidence order, excludePath and appliesTo all match the naive scan)');
} finally {
  rmSync(tmp3, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} self-test failure(s).`);
  process.exit(1);
}
console.log(`\nAll ${GUARDRAILS.length} guardrails + the mobile-readiness and production-bundle sensors verified.`);
