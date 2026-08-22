---
name: dependency-doctor
description: "Scan a project's dependency manifests for unpinned versions, duplicate constraints, obsolete backports, and yanked releases. Produces a prioritized fix plan your agent can execute."
argument-hint: "[--app <name>] [--fix] [--json]"
---

# Dependency Doctor

Audit a monorepo app's `package.json` for dependency health issues: unpinned version ranges,
duplicate constraints across workspaces, packages known to be yanked or deprecated, and
standard-library backports that are obsolete on the current Node target. Every finding carries
a one-line fix prescription.

## Step 1: Locate the target

If `--app <name>` is given, work in `projects/<name>/`. If omitted and the agent's current
working context is inside a `projects/<app>/` directory, use that app. Otherwise, prompt:
"Which app should I audit?" and list the six apps in `projects/`.

Read the app's `package.json` (and the root `package.json` workspace config) to understand
the full dependency tree.

## Step 2: Scan for each issue class

### 2a. Unpinned versions

Grep `package.json` for dependency entries whose value string starts with `^`, `~`, `>=`, `>`,
`<`, `*`, or is the literal string `latest`. A pinned dependency uses only digits and dots
(e.g. `"1.2.3"`).

For each unpinned entry, record:
- The package name and current range
- Whether it's a `dependency`, `devDependency`, or `peerDependency`
- A fix prescription: `"<name>": "<current-resolved-version>"` (resolve the actual installed
  version from `node_modules/<name>/package.json`)

### 2b. Duplicate constraints across the workspace

If a package appears in both root `overrides` and an app's own `dependencies`/`devDependencies`
with a different version constraint, flag it. The app's entry wins for that app; the root override
is the one that may be silently ignored.

For each duplicate, record both version strings and note which file(s) to edit.

### 2c. Obsolete backports

Check for packages that polyfill standard-library features available in Node 20+:
- `node-fetch` → `fetch` is built-in
- `crypto-js` or `crypto-browserify` → `node:crypto` and `crypto.subtle` are built-in
- `url`, `querystring`, `buffer`, `stream` polyfills → built-in since Node 18
- `abort-controller` → `AbortController` is global

For each obsolete backport, check whether the app actually imports it (`grep` the app's
`src/` tree). If not imported, it's dead weight. If imported, note the migration path.

### 2d. Yanked or deprecated releases

Check `npm view <pkg> --json` (or the equivalent `https://registry.npmjs.org/<pkg>`) for
the `deprecated` field. Flag any entry where the installed version matches the deprecated
range. This step makes network calls — skip it when offline and note "skipped (offline)".

## Step 3: Prioritize

Assign each finding a severity:
- **high:** Yanked package, unpinned `dependency` (not devDependency), duplicate constraint
  blocking a security patch.
- **medium:** Unpinned `devDependency`, obsolete backport still imported.
- **low:** Obsolete backport not imported (dead weight), unpinned `peerDependency`.

Sort findings by severity, then alphabetically by package name.

## Step 4: Report

Format the report as a Markdown table:

```
| Severity | Package | Issue | Current | Fix |
|----------|---------|-------|---------|-----|
| high     | react   | Unpinned | ^18.2.0 | Pin to "18.2.0" in package.json |
| medium   | node-fetch | Obsolete backport | ^3.3.0 | Replace with built-in fetch(); remove from dependencies |
```

If `--json` is given, output JSON instead of Markdown.

If `--fix` is given AND the user has explicitly approved modifying `package.json`, apply each
fix by editing the file in place. Otherwise, print the table and say: "Run with `--fix` to
apply these changes. Pin versions one at a time and run `npm install` between each to catch
peer conflicts early."

## Step 5: Gate check (guardrail)

The `unpinned-deps` guardrail in `scripts/harness-status.mjs` catches new unpinned entries
at the line level on every PR. This skill finds the *backlog* — existing unpinned entries
that predate the guardrail. After fixing the backlog, any new unpinned entry will fail the
merge gate automatically.

## Dependencies
- `node:fs`, `node:path`, `node:child_process` (built-ins — no npm install)
- `npm view` (for yanked/deprecation check) or `curl` against `https://registry.npmjs.org/`

## Verification
Run `node scripts/harness-status.mjs --gate` after fixing. The `unpinned-deps` guardrail
must show zero hits.