#!/usr/bin/env node
// PostToolUse hook — fast inner-loop feedback when a harness script changes.
//
// Wired by .claude/settings.json to fire after every Edit/Write/MultiEdit. It
// stays silent unless the edited file is a top-level `scripts/*.mjs` with a
// sibling `scripts/<name>.test.mjs`, then runs that self-test and hands the
// result back as feedback. PostToolUse cannot block (the edit already landed),
// so this always exits 0; CI remains the authoritative, blocking gate.
//
// Why this exists: the Reddit-derived "vibe coding" practice this harness
// benefits from most is "verify the environment, not the agent's prose — and
// do it cheaply, right after the edit, not at PR time." An agent that edits
// `test-app.mjs` now sees `test-app.test.mjs` fail in the same turn it broke
// it, instead of two workflows later. It is deliberately *not* a blocking
// enforcement layer and *not* wired into CI — the same opt-in, outside-the-gate
// posture as repowise (README "Optional: repowise MCP"), and Claude-Code-only
// like the repo's existing `.claude/skills/`.
//
// Zero dependencies; invoked by Claude Code, not by hand.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

let event;
try {
  event = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // no or malformed input — nothing to do
}

const toolName = event.tool_name ?? '';
const input = event.tool_input ?? {};
const paths = [];
if (typeof input.file_path === 'string') paths.push(input.file_path);
// MultiEdit passes `file_paths` as an array of objects ({ file_path, ... }),
// not bare strings — read each entry's `file_path` rather than stringifying
// the object into "[object Object]" (which would silently match nothing).
for (const entry of input.file_paths ?? []) {
  if (typeof entry === 'string') paths.push(entry);
  else if (entry && typeof entry.file_path === 'string') paths.push(entry.file_path);
}

if (!/^(Edit|Write|MultiEdit)$/.test(toolName) || paths.length === 0) process.exit(0);

// Claude Code usually hands back an absolute path; the regex below matches a
// repo-relative one. Normalize to repo-relative first so both forms work.
const repoRootNorm = repoRoot.replace(/\\/g, '/');
for (const raw of paths) {
  const p = raw.replace(/\\/g, '/');
  const rel = p.startsWith(repoRootNorm + '/') ? p.slice(repoRootNorm.length + 1) : p;
  // Top-level harness scripts only — not fixtures/, not the app trees.
  if (!/^scripts\/[^/]+\.mjs$/.test(rel)) continue;
  const testPath = rel.replace(/\.mjs$/, '.test.mjs');
  if (!existsSync(join(repoRoot, testPath))) continue;

  const r = spawnSync('node', [testPath], { cwd: repoRoot, encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  const tail = out.split('\n').slice(-6).join('\n');
  if (r.status === 0) {
    console.log(`[verify-scripts] ${testPath} passed after editing ${p}.`);
  } else {
    console.error(
      `[verify-scripts] ${testPath} FAILED after editing ${p} (non-blocking — CI is the gate):\n${tail}`,
    );
  }
}

process.exit(0);
