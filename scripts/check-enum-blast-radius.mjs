#!/usr/bin/env node
/**
 * Blast-radius gate for widened union types (.agents/AGENTS.md §9.2).
 *
 * Adding one member to a `z.enum` is never a local change: every
 * `Record<Type, …>`, `switch`, and `Object.keys()` over the inferred type is
 * now incomplete, and the compiler only catches the exhaustively-typed subset.
 *
 * PR #41 added `'independent_living'` to `CareTypeSchema`. That type had seven
 * consumers in the app and the PR opened two. Three of the five it skipped were
 * where the failures lived — a `Record<CareType, string>` that failed
 * type-check and took the whole E2E stage down with the build, a label lookup
 * that returned `undefined` and crashed the methodology panel, and a dropdown
 * that silently gained an unpriced option.
 *
 * This gate is diff-shaped rather than file-shaped, which is why it lives here
 * rather than in `harness-status.mjs` GUARDRAILS: it compares the enum members
 * at the merge base against the members at HEAD. A guardrail's `test(line)`
 * contract cannot express "this line changed relative to another commit".
 *
 * A consumer counts as handled if the PR touched it, OR if the PR body names it
 * — which is exactly the blast-radius table `.github/PULL_REQUEST_TEMPLATE.md`
 * asks for. So the gate enforces that the table is complete, and "this file
 * needs no change because …" remains a legitimate answer that a human writes
 * and a reviewer can see.
 *
 * Zero dependencies. Run locally with:
 *   node scripts/check-enum-blast-radius.mjs --base origin/master --head HEAD
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  dim: '\x1b[90m', reset: '\x1b[0m',
};

/* -------------------------------------------------------------------- */
/* Pure core — everything below `main` is what the self-test exercises.   */
/* -------------------------------------------------------------------- */

/**
 * Every `export const XSchema = z.enum([...])` in a source file, as
 * schema name → set of member literals.
 */
export function extractEnums(source) {
  const found = new Map();
  const decl = /export\s+const\s+(\w+)\s*=\s*z\s*\.\s*enum\s*\(\s*\[([\s\S]*?)\]\s*\)/g;
  let m;
  while ((m = decl.exec(source)) !== null) {
    const [, name, body] = m;
    const members = new Set();
    for (const lit of body.matchAll(/['"`]([^'"`]+)['"`]/g)) members.add(lit[1]);
    found.set(name, members);
  }
  return found;
}

/** The type name inferred from a schema, i.e. `export type X = z.infer<typeof XSchema>`. */
export function inferredTypeName(source, schemaName) {
  const re = new RegExp(
    `export\\s+type\\s+(\\w+)\\s*=\\s*z\\s*\\.\\s*infer\\s*<\\s*typeof\\s+${schemaName}\\b`,
  );
  const m = source.match(re);
  return m ? m[1] : null;
}

/**
 * Schemas that gained at least one member between two versions of a file.
 *
 * A schema absent at base is skipped: a brand-new enum has no existing
 * consumers to have missed, so it is not a widening. Removals and reorderings
 * are likewise not widenings and are ignored.
 */
export function gainedMembers(baseSource, headSource) {
  const before = extractEnums(baseSource);
  const after = extractEnums(headSource);
  const out = [];
  for (const [name, members] of after) {
    const prior = before.get(name);
    if (!prior) continue;
    const added = [...members].filter((x) => !prior.has(x));
    if (added.length === 0) continue;
    out.push({ schemaName: name, added, typeName: inferredTypeName(headSource, name) });
  }
  return out;
}

/**
 * Whether a PR body accounts for a consumer path.
 *
 * Accepts the repo-relative path or any suffix of at least two segments, since
 * that is how a table entry is naturally written (`data/costOfCare.ts`). One
 * segment is deliberately not enough — a bare `page.tsx` appears by coincidence
 * far too often to count as having been considered.
 */
export function isAcknowledged(body, consumerPath) {
  if (!body) return false;
  const norm = consumerPath.split(sep).join('/');
  const segments = norm.split('/');
  for (let i = 0; i <= segments.length - 2; i += 1) {
    if (body.includes(segments.slice(i).join('/'))) return true;
  }
  return false;
}

/** Consumers the PR neither touched nor accounted for in its body. */
export function unacknowledged({ consumers, touched, body }) {
  const touchedSet = new Set(touched.map((p) => p.split(sep).join('/')));
  return consumers
    .map((p) => p.split(sep).join('/'))
    .filter((p) => !touchedSet.has(p) && !isAcknowledged(body, p));
}

/** Source files under `dir` that reference `typeName` as a whole word. */
export function findConsumers(dir, typeName, declaringFile, readDir = walk, read = readFileSync) {
  const word = new RegExp(`\\b${typeName}\\b`);
  const out = [];
  for (const file of readDir(dir)) {
    if (file === declaringFile) continue;
    let text;
    try {
      text = read(file, 'utf8');
    } catch {
      continue;
    }
    if (word.test(text)) out.push(file);
  }
  return out;
}

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === 'dist') continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/* -------------------------------------------------------------------- */
/* git plumbing + reporting                                              */
/* -------------------------------------------------------------------- */

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function fileAt(ref, path) {
  try {
    // stderr is discarded: a file absent at `ref` is an ordinary case (it is how
    // a brand-new file looks), and letting git's "fatal: path ... does not
    // exist" reach the CI log makes a passing run read like a broken one.
    return execFileSync('git', ['show', `${ref}:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return ''; // absent at that ref
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const base = arg('--base', 'origin/master');
  const head = arg('--head', 'HEAD');
  const body = process.env.PR_BODY ?? '';

  let mergeBase;
  try {
    mergeBase = git(['merge-base', base, head]).trim();
  } catch {
    console.error(
      `${C.red}Could not find a merge base for ${base}...${head}.${C.reset}\n` +
        'A shallow clone cannot compute this — the workflow needs fetch-depth: 0.',
    );
    process.exit(2);
  }

  const touched = git(['diff', '--name-only', `${mergeBase}`, head])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const schemaFiles = touched.filter((p) => /\.ts$/.test(p) && !/\.test\.ts$/.test(p));

  const problems = [];
  let widened = 0;

  for (const path of schemaFiles) {
    const gained = gainedMembers(fileAt(mergeBase, path), fileAt(head, path));
    for (const { schemaName, added, typeName } of gained) {
      widened += 1;
      if (!typeName) {
        console.log(
          `${C.yellow}  ${schemaName} gained ${added.map((a) => `'${a}'`).join(', ')} but no ` +
            `z.infer type was found for it — skipping (nothing to trace).${C.reset}`,
        );
        continue;
      }
      // Consumers are scoped to the app that declares the schema.
      const appDir = path.includes('/src/') ? path.slice(0, path.indexOf('/src/') + 4) : 'src';
      const consumers = findConsumers(appDir, typeName, path).map((p) =>
        relative(process.cwd(), p).split(sep).join('/'),
      );
      const missed = unacknowledged({ consumers, touched, body });
      if (missed.length) {
        problems.push({ schemaName, added, typeName, consumers, missed });
      } else {
        console.log(
          `${C.green}  ✓ ${schemaName} gained ${added.map((a) => `'${a}'`).join(', ')} — all ` +
            `${consumers.length} consumer(s) of ${typeName} touched or accounted for.${C.reset}`,
        );
      }
    }
  }

  if (widened === 0) {
    console.log(`${C.dim}No z.enum gained a member in this diff. Nothing to check.${C.reset}`);
    return;
  }

  if (problems.length === 0) {
    console.log(`\n${C.green}BLAST-RADIUS gate PASSED.${C.reset}`);
    return;
  }

  console.error(`\n${C.red}BLAST-RADIUS gate FAILED.${C.reset}`);
  for (const p of problems) {
    console.error(
      `\n${C.cyan}${p.schemaName}${C.reset} gained ${p.added.map((a) => `'${a}'`).join(', ')}, ` +
        `widening ${C.cyan}${p.typeName}${C.reset}.`,
    );
    console.error(`  ${p.consumers.length} file(s) reference ${p.typeName}. Not handled:`);
    for (const f of p.missed) console.error(`    ${C.red}${f}${C.reset}`);
  }
  console.error(
    `\n${C.dim}Every consumer of a widened type must be opened. A Record<Type, …>, a switch, or\n` +
      'an Object.keys() over that type is a mandatory edit — see .agents/AGENTS.md §9.2.\n\n' +
      'If a file genuinely needs no change, say so in the PR body\'s blast-radius table and\n' +
      `name the path. This gate reads the body and accepts that as handled.${C.reset}`,
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith('check-enum-blast-radius.mjs');
if (invokedDirectly) main();
