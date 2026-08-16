#!/usr/bin/env node
/**
 * Installs this repo's tracked git hooks by pointing `core.hooksPath` at
 * `.githooks/` — the standard, dependency-free way to make git run a
 * version-controlled hook script instead of the untracked, per-clone
 * `.git/hooks/` directory. No lefthook/husky dependency: this repo's own
 * harness scripts are deliberately zero-dependency Node ESM
 * (.agents/AGENTS.md §8), and a `git config` call plus a `chmod` is the
 * whole mechanism needed for one hook.
 *
 * Wired as the root `prepare` script, so `npm install` at the repo root
 * installs the hook automatically for every contributor and every agent —
 * see `.githooks/pre-push` for what it actually runs and why.
 *
 * Safe everywhere `npm install` runs, including CI (several workflows run a
 * root `npm install`): outside a git repository, or when `git` itself is
 * unavailable, this reports and returns rather than throwing — nothing here
 * may fail `npm install`.
 *
 * Zero dependencies. Run with:
 *   node scripts/install-git-hooks.mjs
 */

import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
export const HOOKS_DIR = '.githooks';

/* -------------------------------------------------------------------- */
/* Pure-ish core — I/O injected, so the self-test never touches this      */
/* machine's real git config or filesystem.                               */
/* -------------------------------------------------------------------- */

/**
 * Sets `core.hooksPath` to `.githooks` for the repo at `cwd`, and makes its
 * `pre-push` hook executable if present. Every failure mode reports and
 * returns `{ installed: false, reason }` rather than throwing — this must
 * never be the thing that fails an `npm install`.
 */
export function installGitHooks({
  cwd,
  run = (args, opts) => execFileSync(args[0], args.slice(1), opts),
  chmod = chmodSync,
  exists = existsSync,
  log = console.log,
  warn = console.warn,
}) {
  try {
    run(['git', 'rev-parse', '--is-inside-work-tree'], { cwd, stdio: 'pipe' });
  } catch {
    log('install-git-hooks: not inside a git repository — skipping (nothing to install).');
    return { installed: false, reason: 'not-a-git-repo' };
  }

  try {
    run(['git', 'config', 'core.hooksPath', HOOKS_DIR], { cwd, stdio: 'pipe' });
  } catch (err) {
    warn(
      `install-git-hooks: could not set core.hooksPath (${err.message}). ` +
        'The pre-push gate will not run automatically — run it by hand before pushing:\n' +
        '  node scripts/harness-status.mjs --gate && node scripts/harness-learn.mjs',
    );
    return { installed: false, reason: 'git-config-failed' };
  }

  const hookFile = join(cwd, HOOKS_DIR, 'pre-push');
  if (exists(hookFile)) {
    try {
      chmod(hookFile, 0o755);
    } catch {
      // Best-effort: a filesystem without POSIX permission bits (some
      // Windows setups) still gets the hook run via Git for Windows' bundled
      // sh, which doesn't require the bit to be set by us.
    }
  }

  log(`install-git-hooks: core.hooksPath set to ${HOOKS_DIR} — pre-push gate is active.`);
  return { installed: true };
}

/* -------------------------------------------------------------------- */
/* CLI                                                                    */
/* -------------------------------------------------------------------- */

function main() {
  installGitHooks({ cwd: REPO_ROOT });
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('install-git-hooks.mjs');
if (invokedDirectly) main();
