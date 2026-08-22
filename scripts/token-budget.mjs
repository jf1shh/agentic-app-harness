#!/usr/bin/env node
// Token Budget — a non-blocking sensor that tracks per-session token usage
// and flags when the always-loaded context grows past a threshold.
//
// Inspired by `caveman learn` usage analysis. The agent self-reports token
// data via `--record`; the harness never reads agent session logs from disk.
// Sensor only — never gates a merge. Observability, not enforcement.
//
// Usage:
//   node scripts/token-budget.mjs                     # report
//   node scripts/token-budget.mjs --record            # read JSON from stdin + record
//   node scripts/token-budget.mjs --json              # machine-readable report
//   node scripts/token-budget.mjs --quiet             # exit code only
//
// Self-report examples (agent pipes this to --record):
//   echo '{"totalTokens":45000,"contextTokens":12000,"completionTokens":8000}' \
//     | node scripts/token-budget.mjs --record
//
// Data file: token-budget.json (committed to the repo, like harness-history.json).
//
// Zero dependencies. Exits 0 when no threshold is crossed, 1 otherwise.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const budgetPath = join(repoRoot, 'token-budget.json');

// Thresholds for always-loaded context tokens. These are per-session costs
// paid before any task-specific work begins — the rulebook, skills, workspace
// map, and other files every agent loads.
const WARN_THRESHOLD = 15_000;  // medium severity
const CRIT_THRESHOLD = 25_000;  // high severity
// How many consecutive sessions with contextTokens above the warn threshold
// before it's considered a systemic trend worth flagging.
const TREND_WINDOW = 5;

const MAX_SESSIONS = 200; // bounded growth, same discipline as harness-history.mjs

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', bold: '\x1b[1m', reset: '\x1b[0m',
};

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   at: string,
 *   commit: string,
 *   totalTokens: number,
 *   contextTokens: number,
 *   completionTokens: number,
 *   agent?: string,
 *   note?: string
 * }} TokenSession
 */

/** @returns {TokenSession[]} */
export function loadBudget(readFile = readFileSync) {
  if (!existsSync(budgetPath)) return [];
  try {
    const parsed = JSON.parse(readFile(budgetPath, 'utf8'));
    if (!Array.isArray(parsed.sessions)) throw new Error('malformed');
    return parsed.sessions;
  } catch {
    return [];
  }
}

/** @param {TokenSession[]} sessions */
export function saveBudget(sessions, writeFile = writeFileSync) {
  const trimmed = sessions.slice(-MAX_SESSIONS);
  writeFile(budgetPath, JSON.stringify({ schemaVersion: 1, sessions: trimmed }, null, 2) + '\n');
}

/** @returns {{ sha: string|null, dirty: boolean }} */
function currentGitState() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim();
    const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot }).toString();
    return { sha, dirty: porcelain.trim().length > 0 };
  } catch {
    return { sha: null, dirty: true };
  }
}

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

/**
 * Parse and validate a self-reported token session from JSON.
 * @param {string} raw - JSON string from the agent
 * @returns {{ session: TokenSession|null, error: string|null }}
 */
export function parseSession(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { session: null, error: `Invalid JSON: ${e.message}` };
  }

  const required = ['totalTokens', 'contextTokens', 'completionTokens'];
  for (const key of required) {
    if (typeof parsed[key] !== 'number' || parsed[key] < 0) {
      return { session: null, error: `Missing or invalid field: ${key} (must be a non-negative number)` };
    }
  }

  return {
    session: {
      at: parsed.at || new Date().toISOString(),
      commit: 'dirty', // filled in by record()
      totalTokens: parsed.totalTokens,
      contextTokens: parsed.contextTokens,
      completionTokens: parsed.completionTokens,
      agent: parsed.agent || undefined,
      note: parsed.note || undefined,
    },
    error: null,
  };
}

/**
 * Record a new token session.
 * @param {string} rawJson
 * @returns {{ session: TokenSession|null, error: string|null }}
 */
export function recordSession(rawJson) {
  const { session, error } = parseSession(rawJson);
  if (error) return { session: null, error };

  const { sha, dirty } = currentGitState();
  session.commit = dirty || !sha ? 'dirty' : sha;

  const sessions = loadBudget();
  // Replace any existing dirty entry (one live snapshot at a time).
  if (session.commit === 'dirty') {
    const existing = sessions.filter((s) => s.commit !== 'dirty');
    existing.push(session);
    saveBudget(existing);
  } else {
    sessions.push(session);
    saveBudget(sessions);
  }

  return { session, error: null };
}

// ---------------------------------------------------------------------------
// Analysis — pure functions for the report and sensor findings
// ---------------------------------------------------------------------------

/**
 * Analyze sessions and return findings.
 * @param {TokenSession[]} sessions
 * @returns {{ findings: object[], stats: object }}
 */
export function analyzeSessions(sessions) {
  const findings = [];
  const cleanSessions = sessions.filter((s) => s.commit !== 'dirty');

  // Nothing to analyze yet.
  if (cleanSessions.length === 0) {
    return {
      findings,
      stats: {
        totalSessions: sessions.length,
        cleanSessions: 0,
        latestContext: null,
        avgContext: null,
        trend: [],
      },
    };
  }

  const latest = cleanSessions[cleanSessions.length - 1];
  const contextValues = cleanSessions.map((s) => s.contextTokens);
  const avgContext = Math.round(contextValues.reduce((a, b) => a + b, 0) / contextValues.length);

  // --- Finding 1: latest session context above threshold ---
  if (latest.contextTokens >= CRIT_THRESHOLD) {
    findings.push({
      ruleId: 'token-budget:context-critical',
      severity: 'high',
      title: `Latest session context is critically large (${latest.contextTokens.toLocaleString()} tokens)`,
      detail: `The always-loaded context (rulebook, skills, workspace map) has grown past the ${CRIT_THRESHOLD.toLocaleString()}-token critical threshold. The \`.agents/AGENTS.md\` rulebook alone is a known contributor — consider the slim rulebook proposal in docs/SLIM_RULEBOOK_PROPOSAL.md.`,
      evidence: sessionsToEvidence(cleanSessions),
    });
  } else if (latest.contextTokens >= WARN_THRESHOLD) {
    findings.push({
      ruleId: 'token-budget:context-warning',
      severity: 'medium',
      title: `Latest session context is large (${latest.contextTokens.toLocaleString()} tokens)`,
      detail: `The always-loaded context is above the ${WARN_THRESHOLD.toLocaleString()}-token warning threshold. Monitor the trend — if context keeps growing, the slim rulebook proposal in docs/SLIM_RULEBOOK_PROPOSAL.md should be prioritised.`,
      evidence: sessionsToEvidence(cleanSessions),
    });
  }

  // --- Finding 2: upward trend ---
  if (cleanSessions.length >= TREND_WINDOW) {
    const recentWindow = contextValues.slice(-TREND_WINDOW);
    const prevWindow = contextValues.slice(-TREND_WINDOW * 2, -TREND_WINDOW);

    if (prevWindow.length >= TREND_WINDOW) {
      const recentAvg = Math.round(recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length);
      const prevAvg = Math.round(prevWindow.reduce((a, b) => a + b, 0) / prevWindow.length);

      // A 15%+ increase across windows is worth flagging.
      if (recentAvg > prevAvg * 1.15 && recentAvg >= WARN_THRESHOLD) {
        findings.push({
          ruleId: 'token-budget:context-trending-up',
          severity: 'medium',
          title: `Always-loaded context is trending upward (${prevAvg.toLocaleString()} → ${recentAvg.toLocaleString()} tokens avg)`,
          detail: `Over the last ${TREND_WINDOW * 2} sessions, the average context size grew ${Math.round(((recentAvg - prevAvg) / prevAvg) * 100)}%. The rulebook and agent instructions may be accumulating bloat — review recent additions to .agents/AGENTS.md and CLAUDE.md.`,
          evidence: sessionsToEvidence(cleanSessions),
        });
      }
    }
  }

  return {
    findings,
    stats: {
      totalSessions: sessions.length,
      cleanSessions: cleanSessions.length,
      latestContext: latest.contextTokens,
      avgContext,
      minContext: Math.min(...contextValues),
      maxContext: Math.max(...contextValues),
      trend: contextValues.slice(-TREND_WINDOW),
      lastRecordedAt: latest.at,
      latestTotal: latest.totalTokens,
      latestCompletion: latest.completionTokens,
    },
  };
}

function sessionsToEvidence(sessions) {
  return sessions.slice(-8).map((s) => ({
    file: `token-budget.json (session at ${s.at.slice(0, 10)})`,
    line: 0,
    snippet: `${s.contextTokens.toLocaleString()} context / ${s.totalTokens.toLocaleString()} total${s.note ? ` — ${s.note}` : ''}`,
  }));
}

// ---------------------------------------------------------------------------
// Sensor integration — callable from harness-status.mjs
// ---------------------------------------------------------------------------

/**
 * Generate harness-compatible findings from the current token budget.
 * Designed as a supplemental sensor in harness-status.mjs.
 *
 * @returns {object[]} — findings shaped like harness-status Finding[]
 */
export function senseTokenBudget() {
  const sessions = loadBudget();
  if (sessions.length === 0) return [];

  const { findings } = analyzeSessions(sessions);
  return findings.map((f) => ({
    id: f.ruleId,
    ruleId: f.ruleId,
    type: 'token-budget',
    severity: f.severity,
    gate: 'manual-review',
    title: f.title,
    detail: f.detail,
    evidence: f.evidence,
  }));
}

// ---------------------------------------------------------------------------
// Terminal report
// ---------------------------------------------------------------------------

export function generateReport(opts = {}) {
  const { quiet = false } = opts;
  const lines = [];
  const sessions = loadBudget();
  const { findings, stats } = analyzeSessions(sessions);

  if (quiet) {
    if (findings.length === 0) {
      if (stats.cleanSessions === 0) {
        lines.push(`${C.dim}TOKEN-BUDGET: no sessions recorded yet.${C.reset}`);
      } else {
        lines.push(`${C.green}TOKEN-BUDGET: ${stats.cleanSessions} session(s), context ${stats.latestContext?.toLocaleString() || '?'} tokens — below thresholds.${C.reset}`);
      }
    } else {
      lines.push(`${C.red}TOKEN-BUDGET: ${findings.length} threshold(s) crossed (${findings.map((f) => f.severity).join(', ')}).${C.reset}`);
    }
    return { lines, allGreen: findings.length === 0 };
  }

  lines.push(`${C.bold}Token Budget${C.reset}`);
  lines.push('');

  if (sessions.length === 0) {
    lines.push(`  ${C.dim}No sessions recorded yet.${C.reset}`);
    lines.push('');
    lines.push(`  Record a session with:`);
    lines.push(`    echo '{"totalTokens":45000,"contextTokens":12000,"completionTokens":8000}' \\`);
    lines.push(`      | node scripts/token-budget.mjs --record`);
    lines.push('');
    return { lines, allGreen: true };
  }

  // Stats summary
  lines.push(`  ${C.cyan}Sessions:${C.reset} ${stats.cleanSessions} recorded (${stats.totalSessions} total)`);
  if (stats.latestContext) {
    const ctxColor = stats.latestContext >= CRIT_THRESHOLD ? C.red
      : stats.latestContext >= WARN_THRESHOLD ? C.yellow : C.green;
    lines.push(`  ${C.cyan}Latest context:${C.reset} ${ctxColor}${stats.latestContext.toLocaleString()}${C.reset} tokens`);
    lines.push(`  ${C.cyan}Average context:${C.reset} ${stats.avgContext.toLocaleString()} tokens (min ${stats.minContext.toLocaleString()}, max ${stats.maxContext.toLocaleString()})`);
    lines.push(`  ${C.cyan}Latest total:${C.reset} ${stats.latestTotal.toLocaleString()} tokens (${stats.latestCompletion.toLocaleString()} completion)`);
  }

  if (stats.trend.length >= TREND_WINDOW) {
    const sparkline = stats.trend.map((v) => {
      if (v >= CRIT_THRESHOLD) return `${C.red}█${C.reset}`;
      if (v >= WARN_THRESHOLD) return `${C.yellow}█${C.reset}`;
      return `${C.green}█${C.reset}`;
    }).join('');
    lines.push(`  ${C.cyan}Trend (last ${stats.trend.length}):${C.reset} ${sparkline}`);
  }

  lines.push('');

  // Findings
  if (findings.length === 0) {
    lines.push(`  ${C.green}✓${C.reset} No thresholds crossed. Context budget is healthy.`);
  } else {
    for (const f of findings) {
      const sevIcon = f.severity === 'high' ? `${C.red}✗${C.reset}` : `${C.yellow}⚠${C.reset}`;
      lines.push(`  ${sevIcon} [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(`      ${C.dim}${f.detail}${C.reset}`);
    }
  }

  lines.push('');
  lines.push(`${C.dim}Thresholds: warn at ${WARN_THRESHOLD.toLocaleString()}, critical at ${CRIT_THRESHOLD.toLocaleString()} context tokens.${C.reset}`);
  lines.push(`${C.dim}Budget file: ${relative(repoRoot, budgetPath)}${C.reset}`);

  return { lines, allGreen: findings.length === 0 };
}

export function generateJsonReport() {
  const sessions = loadBudget();
  const { findings, stats } = analyzeSessions(sessions);
  return {
    generatedAt: new Date().toISOString(),
    thresholds: { warn: WARN_THRESHOLD, critical: CRIT_THRESHOLD },
    stats,
    findings,
    sessions: sessions.slice(-10), // last 10 for context
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const doRecord = args.includes('--record');
  const json = args.includes('--json');
  const quiet = args.includes('--quiet');

  if (doRecord) {
    // Read JSON from stdin.
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) {
        console.error(`${C.red}Error: --record requires JSON on stdin.${C.reset}`);
        console.error(`Example: echo '{"totalTokens":45000,"contextTokens":12000,"completionTokens":8000}' | node scripts/token-budget.mjs --record`);
        process.exit(2);
      }

      const { session, error } = recordSession(raw);
      if (error) {
        console.error(`${C.red}Error: ${error}${C.reset}`);
        process.exit(2);
      }

      console.log(`${C.green}Recorded session${C.reset} at ${C.cyan}${session.at}${C.reset} — ` +
        `${session.contextTokens.toLocaleString()} context / ${session.totalTokens.toLocaleString()} total tokens.`);
      if (session.note) console.log(`${C.dim}Note: ${session.note}${C.reset}`);

      // Also show the report if not --quiet
      if (!quiet) {
        console.log('');
        const { lines } = generateReport();
        console.log(lines.join('\n'));
      }

      const { findings } = analyzeSessions(loadBudget());
      if (findings.length > 0) process.exit(1);
    });
    return;
  }

  // Report mode (no --record).
  if (json) {
    console.log(JSON.stringify(generateJsonReport(), null, 2));
  } else {
    const { lines, allGreen } = generateReport({ quiet });
    if (lines.length) console.log(lines.join('\n'));
    if (!allGreen) process.exit(1);
  }
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('token-budget.mjs');
if (invokedDirectly) main();