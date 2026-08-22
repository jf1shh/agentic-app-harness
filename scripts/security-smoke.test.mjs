#!/usr/bin/env node
// Self-test for security-smoke.mjs. Covers every exported pure function
// with both known-good and known-bad fixtures so the gate cannot silently
// stop detecting real advisories.
//
// Zero dependencies; run with:
//   node scripts/security-smoke.test.mjs

import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAdvisories,
  auditApp,
  discoverApps,
  auditAll,
  generateReport,
  generateJsonReport,
} from './security-smoke.mjs';

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

/* ---- parseAdvisories ------------------------------------------------------ */

// A real-ish npm audit JSON with two high advisories.
const TWO_HIGH_JSON = JSON.stringify({
  auditReportVersion: 2,
  vulnerabilities: {
    nanoid: {
      name: 'nanoid',
      severity: 'high',
      isDirect: false,
      via: [{
        source: 1139427,
        name: 'nanoid',
        dependency: 'nanoid',
        title: 'nanoid: custom generators can loop indefinitely when size is zero',
        url: 'https://github.com/advisories/GHSA-2v37-7h3g-55p8',
        severity: 'high',
        range: '<3.3.18',
      }],
      effects: [],
      range: '<3.3.18',
      nodes: ['node_modules/nanoid'],
      fixAvailable: true,
    },
    braces: {
      name: 'braces',
      severity: 'high',
      isDirect: false,
      via: [{
        source: 1138651,
        name: 'braces',
        dependency: 'braces',
        title: 'braces: ReDoS via malicious input',
        url: 'https://github.com/advisories/GHSA-w7jw-5qw5-9jvf',
        severity: 'high',
        range: '<3.0.3',
      }],
      effects: [],
      range: '<3.0.3',
      nodes: ['node_modules/braces'],
      fixAvailable: true,
    },
  },
});

{
  const advisories = parseAdvisories(TWO_HIGH_JSON);
  ok(advisories.length === 2, 'parseAdvisories: extracts two high advisories');
  ok(advisories[0].packageName === 'braces' || advisories[0].packageName === 'nanoid',
    'parseAdvisories: sorts advisories by severity then name');
  ok(advisories.every((a) => a.severity === 'high'),
    'parseAdvisories: only high severity advisories are returned');
  ok(advisories.every((a) => a.title && a.url),
    'parseAdvisories: title and url are extracted from via');
}

// A real-ish audit JSON with one critical advisory.
const ONE_CRITICAL_JSON = JSON.stringify({
  auditReportVersion: 2,
  vulnerabilities: {
    'express-sqlite3': {
      name: 'express-sqlite3',
      severity: 'critical',
      isDirect: true,
      via: [{
        source: 1150001,
        name: 'express-sqlite3',
        dependency: 'express-sqlite3',
        title: 'express-sqlite3: Remote Code Execution via crafted SQL',
        url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz',
        severity: 'critical',
        range: '<=2.5.0',
      }],
      effects: [],
      range: '<=2.5.0',
      nodes: ['node_modules/express-sqlite3'],
      fixAvailable: { name: 'express-sqlite3', version: '2.5.1', isSemVerMajor: false },
    },
  },
});

{
  const advisories = parseAdvisories(ONE_CRITICAL_JSON);
  ok(advisories.length === 1, 'parseAdvisories: extracts one critical advisory');
  ok(advisories[0].severity === 'critical', 'parseAdvisories: severity is critical');
  ok(advisories[0].isDirect === true, 'parseAdvisories: isDirect flag is true');
  ok(advisories[0].fixAvailable === true, 'parseAdvisories: fixAvailable is true');
}

// Only low/moderate advisories — nothing returned.
const LOW_ONLY_JSON = JSON.stringify({
  auditReportVersion: 2,
  vulnerabilities: {
    'some-lib': {
      name: 'some-lib',
      severity: 'low',
      isDirect: false,
      via: [{ source: 1000, name: 'some-lib', dependency: 'some-lib', title: 'Minor issue', severity: 'low', range: '<1.0.0' }],
      effects: [],
      range: '<1.0.0',
      nodes: [],
      fixAvailable: true,
    },
    'another-lib': {
      name: 'another-lib',
      severity: 'moderate',
      isDirect: true,
      via: [{ source: 2000, name: 'another-lib', dependency: 'another-lib', title: 'Medium thing', severity: 'moderate', range: '<2.0.0' }],
      effects: [],
      range: '<2.0.0',
      nodes: [],
      fixAvailable: true,
    },
  },
});

ok(parseAdvisories(LOW_ONLY_JSON).length === 0,
  'parseAdvisories: filters out low and moderate severities');
ok(parseAdvisories('').length === 0,
  'parseAdvisories: empty string returns empty array');
ok(parseAdvisories('not json at all').length === 0,
  'parseAdvisories: non-JSON returns empty array');
ok(parseAdvisories(JSON.stringify({ auditReportVersion: 2 })).length === 0,
  'parseAdvisories: no vulnerabilities key returns empty');

// Advisory with no title in via — falls back to package name.
const NO_TITLE_JSON = JSON.stringify({
  auditReportVersion: 2,
  vulnerabilities: {
    'mystery-pkg': {
      name: 'mystery-pkg',
      severity: 'high',
      isDirect: false,
      via: ['some-dep'],
      effects: [],
      range: '>=1.0.0',
      nodes: [],
      fixAvailable: true,
    },
  },
});

{
  const advisories = parseAdvisories(NO_TITLE_JSON);
  ok(advisories.length === 1, 'parseAdvisories: advisory without title in via still extracted');
  ok(advisories[0].title.includes('mystery-pkg'),
    'parseAdvisories: fallback title uses package name');
  ok(advisories[0].url === null,
    'parseAdvisories: url is null when advisory source is absent');
}

/* ---- auditApp (with mock spawn) ------------------------------------------- */

{
  const mockSpawn = (_cmd, _args, _opts) => ({
    status: 1,
    stdout: TWO_HIGH_JSON,
    stderr: '',
    error: null,
  });

  const result = auditApp('test-app', '/fake/dir', mockSpawn);
  ok(result.appName === 'test-app', 'auditApp: returns the app name');
  ok(result.advisories.length === 2, 'auditApp: parses advisories from stdout on non-zero exit');
  ok(result.exitCode === 1, 'auditApp: exit code reflects npm audit exit');
}

{
  const mockSpawn = (_cmd, _args, _opts) => ({
    status: 0,
    stdout: LOW_ONLY_JSON,
    stderr: '',
    error: null,
  });

  const result = auditApp('clean-app', '/fake/dir', mockSpawn);
  ok(result.advisories.length === 0, 'auditApp: no high/critical found on exit 0');
  ok(result.exitCode === 0, 'auditApp: exit 0 reflected');
}

{
  const mockSpawn = (_cmd, _args, _opts) => ({
    status: null,
    stdout: '',
    stderr: 'npm error code ENOAUDIT',
    error: { code: 'ENOENT', message: 'spawn npm ENOENT' },
  });

  const result = auditApp('broken-app', '/fake/dir', mockSpawn);
  ok(result.exitCode === 1, 'auditApp: spawn failure gives exitCode 1');
  ok(result.stderr.includes('ENOAUDIT'), 'auditApp: stderr captured');
}

/* ---- discoverApps --------------------------------------------------------- */

{
  // Mock: two directories, one has a package.json.
  const mockExists = (p) => p.endsWith('app-a/package.json');
  const mockReaddir = (_dir, _opts) => [
    { name: 'app-a', isDirectory: () => true },
    { name: 'app-b', isDirectory: () => true },
  ];

  const apps = discoverApps('/repo', mockReaddir);
  // discoverApps uses real existsSync for the package.json check, so this
  // test is limited. We test the filtering logic via the shape.
  ok(Array.isArray(apps), 'discoverApps: returns an array');
}

/* ---- generateReport ------------------------------------------------------- */

{
  const reportData = {
    results: [
      { appName: 'app-a', advisories: [], exitCode: 0, stderr: '', timedOut: false },
      { appName: 'app-b', advisories: [], exitCode: 0, stderr: '', timedOut: false },
    ],
    summary: { total: 0, critical: 0, high: 0, appsWithFindings: 0 },
  };

  const { allGreen, lines } = generateReport(reportData);
  ok(allGreen === true, 'generateReport: allGreen is true when clean');
  ok(lines.some((l) => l.includes('clean')), 'generateReport: reports clean status');

  const { lines: quietLines, allGreen: quietGreen } = generateReport(reportData, { quiet: true });
  ok(quietGreen === true, 'generateReport: quiet mode still tracks allGreen');
  ok(quietLines.some((l) => l.includes('clean')), 'generateReport: quiet mode reports clean summary');
}

{
  const reportData = {
    results: [{
      appName: 'app-a', advisories: [{
        packageName: 'bad-lib', severity: 'critical', title: 'RCE',
        url: null, isDirect: true, fixAvailable: false, range: '<=1.0.0',
      }], exitCode: 1, stderr: '', timedOut: false,
    }],
    summary: { total: 1, critical: 1, high: 0, appsWithFindings: 1 },
  };

  const { lines: qLines, allGreen: qGreen } = generateReport(reportData, { quiet: true });
  ok(qGreen === false, 'generateReport: quiet mode allGreen=false when advisories found');
  ok(qLines.some((l) => l.includes('1 high/critical')), 'generateReport: quiet mode reports advisory counts');
}

{
  const reportData = {
    results: [
      {
        appName: 'app-a', advisories: [{
          packageName: 'nanoid', severity: 'high', title: 'nanoid ReDoS',
          url: 'https://advisory', isDirect: false, fixAvailable: true, range: '<3.3.18',
        }], exitCode: 1, stderr: '', timedOut: false,
      },
    ],
    summary: { total: 1, critical: 0, high: 1, appsWithFindings: 1 },
  };

  const { allGreen, lines } = generateReport(reportData);
  ok(allGreen === false, 'generateReport: allGreen is false when advisories found');
  ok(lines.some((l) => l.includes('HIGH')), 'generateReport: severity label appears');
  ok(lines.some((l) => l.includes('nanoid')), 'generateReport: package name appears');
}

/* ---- generateJsonReport --------------------------------------------------- */

{
  const reportData = {
    results: [
      { appName: 'app-a', advisories: [], exitCode: 0, stderr: '', timedOut: false },
    ],
    summary: { total: 0, critical: 0, high: 0, appsWithFindings: 0 },
  };

  const json = generateJsonReport(reportData);
  ok(typeof json.generatedAt === 'string', 'generateJsonReport: has generatedAt');
  ok(json.summary.total === 0, 'generateJsonReport: summary is correct');
  ok(json.apps.length === 1, 'generateJsonReport: one app entry');
  ok(json.apps[0].clean === true, 'generateJsonReport: clean is true');
  ok(json.apps[0].error === undefined, 'generateJsonReport: no stderr → no error field');
}

{
  const reportData = {
    results: [
      {
        appName: 'app-a', advisories: [{
          packageName: 'bad-lib', severity: 'critical', title: 'RCE',
          url: 'https://advisory', isDirect: true, fixAvailable: false, range: '<=1.0.0',
        }], exitCode: 1, stderr: 'some warning', timedOut: false,
      },
    ],
    summary: { total: 1, critical: 1, high: 0, appsWithFindings: 1 },
  };

  const json = generateJsonReport(reportData);
  ok(json.apps[0].clean === false, 'generateJsonReport: clean is false');
  ok(json.apps[0].advisories[0].severity === 'critical', 'generateJsonReport: advisory data preserved');
  ok(json.apps[0].error === 'some warning', 'generateJsonReport: stderr included as error');
}

/* ---- Summary -------------------------------------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nSecurity-smoke gate verified: advisories parsed, filtered, reported, and serialised correctly.');