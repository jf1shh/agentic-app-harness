#!/usr/bin/env node
// Self-test for the git-hooks installer (see install-git-hooks.mjs header for
// the full rationale). Two things are pinned:
//
// 1. `installGitHooks` itself, against injected fake `git`/fs calls — never
//    touching this machine's real git config, the same discipline
//    check-doc-claims.mjs's injectable `runCmd` already uses.
// 2. The tracked `.githooks/pre-push` file on disk actually invokes every
//    gate it claims to, and actually aborts on failure (`set -e`) — the same
//    "the artifact on disk matches what it claims" pin check-loop-stats.test.mjs
//    uses against the real generated fixture. A hook that silently dropped
//    `set -e`, or lost a gate line in a future edit, would report success on
//    every push while quietly checking less than it says it does.
//
// Zero dependencies; run with:
//   node scripts/install-git-hooks.test.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installGitHooks, HOOKS_DIR } from './install-git-hooks.mjs';

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

/* ---- installGitHooks: not a git repo ------------------------------------- */
{
  const logs = [];
  const result = installGitHooks({
    cwd: '/not-a-repo',
    run: () => {
      throw new Error('fatal: not a git repository');
    },
    log: (m) => logs.push(m),
  });
  ok(result.installed === false && result.reason === 'not-a-git-repo', 'installGitHooks: reports not-a-git-repo without throwing');
  ok(logs.some((m) => m.includes('not inside a git repository')), 'installGitHooks: logs why nothing was installed');
}

/* ---- installGitHooks: git present but config call fails -------------------- */
{
  const warnings = [];
  let configAttempted = false;
  const result = installGitHooks({
    cwd: '/some-repo',
    run: (args) => {
      if (args[1] === 'rev-parse') return ''; // inside a repo
      if (args[1] === 'config') {
        configAttempted = true;
        throw new Error('permission denied');
      }
      return '';
    },
    warn: (m) => warnings.push(m),
  });
  ok(configAttempted, 'installGitHooks: attempts git config after confirming a repo');
  ok(result.installed === false && result.reason === 'git-config-failed', 'installGitHooks: reports git-config-failed without throwing');
  ok(warnings.some((m) => m.includes('core.hooksPath')), 'installGitHooks: warns with the manual fallback command');
}

/* ---- installGitHooks: full success path ------------------------------------ */
{
  const calls = [];
  const chmodCalls = [];
  const logs = [];
  const result = installGitHooks({
    cwd: '/some-repo',
    run: (args) => {
      calls.push(args.join(' '));
      return '';
    },
    exists: () => true,
    chmod: (path, mode) => chmodCalls.push({ path, mode }),
    log: (m) => logs.push(m),
  });
  ok(result.installed === true, 'installGitHooks: reports success on the happy path');
  ok(
    calls.some((c) => c === `git config core.hooksPath ${HOOKS_DIR}`),
    'installGitHooks: sets core.hooksPath to the tracked hooks directory',
  );
  ok(
    chmodCalls.length === 1 && chmodCalls[0].mode === 0o755 && chmodCalls[0].path.endsWith('.githooks/pre-push'),
    'installGitHooks: makes pre-push executable when it exists',
  );
  ok(logs.some((m) => m.includes('pre-push gate is active')), 'installGitHooks: confirms activation');
}

/* ---- installGitHooks: hook file absent — chmod is skipped, not attempted --- */
{
  let chmodCalled = false;
  const result = installGitHooks({
    cwd: '/some-repo',
    run: () => '',
    exists: () => false,
    chmod: () => {
      chmodCalled = true;
    },
  });
  ok(result.installed === true && !chmodCalled, 'installGitHooks: skips chmod when the hook file is absent, still reports installed');
}

/* ---- installGitHooks: a chmod failure (non-POSIX fs) does not fail the install --- */
{
  const result = installGitHooks({
    cwd: '/some-repo',
    run: () => '',
    exists: () => true,
    chmod: () => {
      throw new Error('EPERM');
    },
  });
  ok(result.installed === true, 'installGitHooks: a chmod failure is swallowed — still reports installed');
}

/* ---- the tracked .githooks/pre-push actually does what it claims ----------- */
{
  const hookPath = join(REPO_ROOT, HOOKS_DIR, 'pre-push');
  const hook = readFileSync(hookPath, 'utf8');

  ok(hook.startsWith('#!'), 'pre-push: starts with a shebang');
  ok(/^set -e\s*$/m.test(hook), 'pre-push: has "set -e" so a failing gate actually aborts the push');

  const EXPECTED_GATES = [
    'node scripts/harness-status.mjs --gate',
    'node scripts/harness-learn.mjs',
    'node scripts/check-loop-stats.mjs',
    'node scripts/check-peer-consistency.mjs',
    'node scripts/check-doc-claims.mjs --gate',
  ];
  for (const cmd of EXPECTED_GATES) {
    ok(hook.includes(cmd), `pre-push: invokes \`${cmd}\``);
  }

  // set -e appears BEFORE the gate invocations — a hook that ran the checks
  // first and enabled strict mode after would not actually abort on failure.
  const setELine = hook.split('\n').findIndex((l) => /^set -e\s*$/.test(l));
  const firstGateLine = hook.split('\n').findIndex((l) => l.includes(EXPECTED_GATES[0]));
  ok(setELine !== -1 && firstGateLine !== -1 && setELine < firstGateLine, 'pre-push: "set -e" is in effect before the first gate runs');
}

/* ---- summary ------------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(
  '\nGit-hooks installer verified: every failure path reports instead of throwing, the happy path ' +
    'sets core.hooksPath and chmods the hook, and the tracked pre-push script actually runs every ' +
    'claimed gate with set -e in effect.',
);
