#!/usr/bin/env node
/**
 * Strips the machine-specific absolute repo path that `repowise init` /
 * `repowise update --force` bakes into `.mcp.json` and `.vscode/mcp.json`'s
 * "repowise" server entry on every re-index (README's "Optional: repowise
 * MCP" section). `repowise mcp` defaults to the current working directory
 * when no PATH argument is given, and every MCP client launches the server
 * with cwd already set to the workspace root — so the argument is not just
 * non-portable (it breaks the server for anyone who clones this repo
 * anywhere other than the exact path it was indexed at), it's unnecessary.
 *
 * There is no `repowise init` flag to suppress this (unlike `--no-claude-md`
 * for the wiki page) — confirmed by re-running `repowise init --force` with
 * `REPOWISE_SKIP_EDITOR_SETUP=1` set and watching the absolute path reappear
 * in both files regardless. This script is the mechanical fix for the gap:
 * run it after any re-index, before committing the regenerated config.
 *
 * Idempotent and safe to run whether or not the path is present. Scoped to
 * entries whose `command` is exactly "repowise", so it can't touch an
 * unrelated MCP server that legitimately needs an absolute-path argument.
 *
 * Not wired into CI or harness-status.mjs — repowise itself is an optional,
 * gate-free pilot (see README), and this is upkeep for that pilot's own
 * config, not a repo-wide guardrail.
 *
 * Usage: node scripts/fix-repowise-mcp-paths.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const C = { green: '\x1b[32m', dim: '\x1b[90m', cyan: '\x1b[36m', reset: '\x1b[0m' };

/* -------------------------------------------------------------------- */
/* Pure core — what the self-test exercises. Operates on parsed JSON,     */
/* never touches the filesystem itself.                                   */
/* -------------------------------------------------------------------- */

// Removes any absolute-path argument from a "repowise" server entry's args.
// Returns { args, changed } rather than mutating in place, so callers (and
// the test) can compare before/after without relying on aliasing.
export function stripAbsolutePathArgs(entry) {
  if (!entry || entry.command !== 'repowise' || !Array.isArray(entry.args)) {
    return { args: entry?.args ?? [], changed: false };
  }
  const args = entry.args.filter((a) => typeof a !== 'string' || !path.isAbsolute(a));
  return { args, changed: args.length !== entry.args.length };
}

// Applies stripAbsolutePathArgs to every entry under the given servers map
// (json[serversKey]). Returns { json, changed } with a new top-level object;
// input is not mutated.
export function fixMcpConfig(json, serversKey) {
  const servers = json?.[serversKey];
  if (!servers || typeof servers !== 'object') return { json, changed: false };

  let changed = false;
  const nextServers = {};
  for (const [name, entry] of Object.entries(servers)) {
    const { args, changed: entryChanged } = stripAbsolutePathArgs(entry);
    nextServers[name] = entryChanged ? { ...entry, args } : entry;
    changed = changed || entryChanged;
  }
  return { json: changed ? { ...json, [serversKey]: nextServers } : json, changed };
}

/* -------------------------------------------------------------------- */
/* CLI                                                                     */
/* -------------------------------------------------------------------- */

const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../..');

const TARGETS = [
  { file: path.join(repoRoot, '.mcp.json'), serversKey: 'mcpServers' },
  { file: path.join(repoRoot, '.vscode', 'mcp.json'), serversKey: 'servers' },
];

function fixFile({ file, serversKey }) {
  const rel = path.relative(repoRoot, file);
  if (!existsSync(file)) return { rel, status: 'skip', detail: 'missing' };

  const raw = readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  const { json, changed } = fixMcpConfig(parsed, serversKey);

  if (!changed) return { rel, status: 'ok', detail: 'no absolute path found' };

  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  return { rel, status: 'fixed', detail: 'stripped absolute path from repowise args' };
}

function main() {
  const results = TARGETS.map(fixFile);
  for (const r of results) {
    const label = { fixed: `${C.green}fixed${C.reset}`, ok: `${C.dim}ok   ${C.reset}`, skip: `${C.dim}skip ${C.reset}` }[r.status];
    console.log(`${label} ${C.cyan}${r.rel}${C.reset} — ${r.detail}`);
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('fix-repowise-mcp-paths.mjs');
if (invokedDirectly) main();
