#!/usr/bin/env node
// Security Smoke — a standalone `npm audit` sensor.
//
// Runs `npm audit --json` in each app under projects/ and surfaces high +
// critical advisories as informational findings. Designed as a sensor (never
// blocks a merge) because advisories are often transitive, unrelated to the
// change under test, and have no code-level fix an agent can author.
//
// Usage:
//   node scripts/security-smoke.mjs               # terminal report
//   node scripts/security-smoke.mjs --json        # machine-readable JSON
//   node scripts/security-smoke.mjs --app <name>  # single-app mode
//   node scripts/security-smoke.mjs --quiet       # exit code only
//
// Zero dependencies. Exits 0 when no high/critical advisories are found
// across all scanned apps, 1 otherwise.

import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const projectsDir = join(repoRoot, 'projects');

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m',
};

const SEVERITY_RANK = { critical: 0, high: 1, moderate: 2, low: 3 };

// ---------------------------------------------------------------------------
// Pure core — importable for self-tests
// ---------------------------------------------------------------------------

/**
 * Parse `npm audit --json` stdout into advisory objects, filtering to
 * high + critical only.
 *
 * @param {string} stdout - raw JSON from npm audit --json
 * @returns {{ packageName: string, severity: string, title: string, url: string,
 *   isDirect: boolean, fixAvailable: boolean|object, range: string }[]}
 */
export function parseAdvisories(stdout) {
  if (!stdout || !stdout.trim()) return [];
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return [];
  }

  const vulns = report.vulnerabilities || {};
  const advisories = [];

  for (const [pkgName, vuln] of Object.entries(vulns)) {
    // Only high + critical — these are the ones that matter for a smoke test.
    if (vuln.severity !== 'high' && vuln.severity !== 'critical') continue;

    // Extract the best advisory info from the `via` array. The first entry
    // with a `title` field is the actual advisory; bare strings are just
    // dependency names on the path.
    const advisorySource = (vuln.via || []).find((v) => typeof v === 'object' && v.title);

    advisories.push({
      packageName: pkgName,
      severity: vuln.severity,
      title: advisorySource ? advisorySource.title : `${pkgName}: ${vuln.severity} severity vulnerability`,
      url: advisorySource ? advisorySource.url : null,
      isDirect: !!vuln.isDirect,
      fixAvailable: !!vuln.fixAvailable,
      range: vuln.range || 'unknown',
    });
  }

  // Sort: critical first, then high.
  advisories.sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return a.packageName.localeCompare(b.packageName);
  });

  return advisories;
}

/**
 * Run `npm audit --json` in the app directory and return the parsed result.
 *
 * @param {string} appName
 * @param {string} appDir
 * @param {object} opts
 * @param {number} opts.timeoutMs
 * @returns {Promise<{ appName: string, advisories: object[], exitCode: number,
 *   stderr: string, timedOut: boolean }>}
 */
export function auditApp(appName, appDir, spawn = spawnSync, opts = {}) {
  const { timeoutMs = 60_000 } = opts;
  let timedOut = false;

  try {
    const result = spawn('npm', ['audit', '--json'], {
      cwd: appDir,
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.error && result.error.code === 'ETIMEDOUT') timedOut = true;
    const exitCode = timedOut ? -1 : (result.status ?? 1);

    // npm audit --json exits non-zero when vulnerabilities are found, but
    // still writes valid JSON to stdout. Non-JSON stderr (e.g. "npm error")
    // means the audit itself failed, which is a different problem.
    const stdout = (result.stdout || '').trim();
    const stderr = (result.stderr || '').trim();
    const advisories = exitCode === 0 || stdout ? parseAdvisories(stdout) : [];

    return { appName, advisories, exitCode, stderr, timedOut };
  } catch (err) {
    return {
      appName, advisories: [], exitCode: -1,
      stderr: err.message, timedOut: false,
    };
  }
}

/**
 * Discover apps under projects/ that have a package.json.
 *
 * @returns {{ name: string, dir: string }[]}
 */
export function discoverApps(repoRootPath, readDir = readdirSync) {
  const projects = join(repoRootPath, 'projects');
  let entries;
  try {
    entries = readDir(projects, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return [];
  }
  return entries
    .filter((e) => existsSync(join(projects, e.name, 'package.json')))
    .map((e) => ({ name: e.name, dir: join(projects, e.name) }));
}

/**
 * Run the full audit across all discovered apps.
 *
 * @returns {Promise<{ results: object[], summary: { total: number, critical: number,
 *   high: number, appsWithFindings: number } }>}
 */
export function auditAll(discover = discoverApps, audit = auditApp, opts = {}) {
  const apps = discover(repoRoot);
  const results = apps.map((app) => audit(app.name, app.dir, undefined, opts));

  let totalAdvisories = 0;
  let criticalCount = 0;
  let highCount = 0;
  let appsWithFindings = 0;

  for (const r of results) {
    if (r.advisories.length) appsWithFindings++;
    totalAdvisories += r.advisories.length;
    for (const a of r.advisories) {
      if (a.severity === 'critical') criticalCount++;
      else if (a.severity === 'high') highCount++;
    }
  }

  return {
    results,
    summary: {
      total: totalAdvisories,
      critical: criticalCount,
      high: highCount,
      appsWithFindings,
    },
  };
}

// ---------------------------------------------------------------------------
// Terminal report
// ---------------------------------------------------------------------------

/**
 * Generate a terminal report from audit results.
 */
export function generateReport(reportData, opts = {}) {
  const { quiet = false } = opts;
  const lines = [];
  const { results, summary } = reportData;

  if (quiet) {
    if (summary.total === 0) {
      lines.push(`${C.green}SECURITY-SMOKE: clean — no high/critical advisories across ${results.length} app(s).${C.reset}`);
    } else {
      lines.push(`${C.red}SECURITY-SMOKE: ${summary.total} high/critical advisorie(s) (${summary.critical} critical, ${summary.high} high) across ${summary.appsWithFindings}/${results.length} app(s).${C.reset}`);
    }
    return { allGreen: summary.total === 0, lines };
  }

  lines.push(`${C.bold}Security Smoke${C.reset}`);
  lines.push('');

  if (summary.total === 0) {
    lines.push(`  ${C.green}✓${C.reset} No high/critical advisories across ${results.length} app(s).`);
    lines.push('');
    lines.push(`${C.green}All clean.${C.reset}`);
    return { allGreen: true, lines };
  }

  for (const r of results) {
    if (r.advisories.length === 0) {
      lines.push(`  ${C.green}✓${C.reset} ${r.appName}: clean`);
      continue;
    }

    lines.push(`  ${C.red}✗${C.reset} ${r.appName}: ${r.advisories.length} high/critical advisorie(s)`);
    for (const adv of r.advisories) {
      const sevC = adv.severity === 'critical' ? C.red : C.yellow;
      const tag = adv.isDirect ? `${C.bold}direct${C.reset}` : `${C.dim}transitive${C.reset}`;
      lines.push(`      ${sevC}[${adv.severity.toUpperCase()}]${C.reset} ${adv.packageName} (${tag}) ${adv.range}`);
      lines.push(`      ${C.dim}${adv.title}${C.reset}`);
      if (adv.url) lines.push(`      ${C.dim}${adv.url}${C.reset}`);
    }
    lines.push('');
  }

  lines.push(`${C.bold}Summary:${C.reset} ${summary.total} total (${summary.critical} critical, ${summary.high} high) across ${summary.appsWithFindings}/${results.length} app(s).`);

  if (r => r.timedOut) {
    const timedOutApps = results.filter((r) => r.timedOut).map((r) => r.appName);
    if (timedOutApps.length) {
      lines.push(`${C.yellow}Timed out: ${timedOutApps.join(', ')}${C.reset}`);
    }
  }

  return { allGreen: false, lines };
}

/**
 * JSON output — machine-readable.
 */
export function generateJsonReport(reportData) {
  const { results, summary } = reportData;
  return {
    generatedAt: new Date().toISOString(),
    summary,
    apps: results.map((r) => ({
      app: r.appName,
      clean: r.advisories.length === 0,
      advisoryCount: r.advisories.length,
      timedOut: r.timedOut,
      advisories: r.advisories,
      error: r.stderr || undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const quiet = args.includes('--quiet');
  const appIdx = args.indexOf('--app');
  const singleApp = appIdx !== -1 ? args[appIdx + 1] : null;

  const apps = discoverApps(repoRoot).filter((a) => !singleApp || a.name === singleApp);

  if (singleApp && apps.length === 0) {
    console.error(`${C.red}No app '${singleApp}' found under projects/.${C.reset}`);
    process.exit(2);
  }

  const results = apps.map((app) => auditApp(app.name, app.dir));

  // Compute summary
  let total = 0, critical = 0, high = 0, appsWithFindings = 0;
  for (const r of results) {
    if (r.advisories.length) appsWithFindings++;
    total += r.advisories.length;
    for (const a of r.advisories) {
      if (a.severity === 'critical') critical++;
      else if (a.severity === 'high') high++;
    }
  }

  const reportData = { results, summary: { total, critical, high, appsWithFindings } };

  if (json) {
    process.stdout.write(JSON.stringify(generateJsonReport(reportData), null, 2) + '\n');
  } else {
    const { lines } = generateReport(reportData, { quiet });
    if (lines.length) process.stdout.write(lines.join('\n') + '\n');
  }

  if (total > 0) process.exit(1);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('security-smoke.mjs');
if (invokedDirectly) main();