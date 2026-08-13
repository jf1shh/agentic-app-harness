#!/usr/bin/env node
// Emit GitHub Issues — an alternate PROPOSE output for the agentic loop.
//
// tasks/*.md work orders (emit-tasks.mjs) are the primary, committed contract
// any agent can claim. This script reads the same harness-status.json and
// renders each open finding as a bulk-importable GitHub issue instead, for
// teams that want findings tracked as real Issues rather than files. The
// GitHub CLI has no native bulk-JSON-import subcommand, so the output is a
// JSON array plus a loop invoking `gh issue create` once per element — the
// same shape a human would hand-write, just generated instead of typed.
//
// This is optional tooling, not part of the harness's blocking gate: nothing
// under scripts/test-app.mjs or sdd-sentinel.yml calls it, and its output
// (tasks/issues.json) is gitignored, the same as harness-status.json — a
// derived snapshot, not a source of truth. tasks/*.md work orders remain the
// thing every agent actually reads.
//
// Usage:
//   node scripts/emit-github-issues.mjs             # sense first, then emit tasks/issues.json
//   node scripts/emit-github-issues.mjs --no-sense   # reuse existing harness-status.json
//   node scripts/emit-github-issues.mjs --upload     # also print the gh CLI upload loop

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const statusPath = join(repoRoot, 'harness-status.json');
const tasksDir = join(repoRoot, 'tasks');
const issuesPath = join(tasksDir, 'issues.json');

// A finding -> { title, body, labels }, the shape `gh issue create` expects.
// Pure: no filesystem or process access, so the self-test can call it directly.
export function toIssue(f) {
  const spec = f.specRef ? `\n- **Spec:** \`${f.specRef}\`` : '';
  const evidence = f.evidence?.length
    ? `\n\n## Evidence\n\n${f.evidence.map((e) => `- \`${e.file}:${e.line}\` — \`${e.snippet}\``).join('\n')}`
    : '';
  return {
    title: `[${f.app}] ${f.title}`,
    body: `**Finding ID:** \`${f.id}\`\n**Acceptance gate:** \`${f.gate}\`${spec}\n\n${f.detail}${evidence}\n\n---\n_Auto-generated from \`harness-status.json\` by \`scripts/emit-github-issues.mjs\`. See \`.agents/AGENTS.md\` before claiming this issue._`,
    labels: ['harness', `type:${f.type}`, `severity:${f.severity}`, `app:${f.app}`],
  };
}

// findings[] -> issues.json content, sorted for a stable diff across runs.
export function toIssuesJson(findings) {
  const issues = findings.map(toIssue).sort((a, b) => a.title.localeCompare(b.title));
  return JSON.stringify(issues, null, 2) + '\n';
}

export function uploadLoopScript() {
  return `#!/usr/bin/env bash
# Bulk-import tasks/issues.json into GitHub Issues. Requires the gh CLI
# (authenticated) and jq. gh has no native bulk-JSON-import subcommand, so
# this loops one \`gh issue create\` per array element.
set -euo pipefail
jq -c '.[]' tasks/issues.json | while read -r issue; do
  title=$(echo "$issue" | jq -r '.title')
  body=$(echo "$issue" | jq -r '.body')
  labels=$(echo "$issue" | jq -r '.labels | join(",")')
  gh issue create --title "$title" --body "$body" --label "$labels"
done
`;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const args = new Set(process.argv.slice(2));
  const noSense = args.has('--no-sense');

  if (!noSense) {
    execFileSync(process.execPath, [join(__dirname, 'harness-status.mjs'), '--quiet'], { stdio: 'inherit' });
  }

  if (!existsSync(statusPath)) {
    console.error('harness-status.json not found. Run: node scripts/harness-status.mjs');
    process.exit(1);
  }

  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  if (!existsSync(tasksDir)) mkdirSync(tasksDir, { recursive: true });

  writeFileSync(issuesPath, toIssuesJson(status.findings));
  console.log(`Wrote tasks/issues.json (${status.findings.length} issue(s)).`);

  if (args.has('--upload')) {
    console.log('\nBulk-upload with:\n');
    console.log(uploadLoopScript());
  } else {
    console.log(`\nRun 'node scripts/emit-github-issues.mjs --upload' to print the gh CLI upload loop.`);
  }
}
