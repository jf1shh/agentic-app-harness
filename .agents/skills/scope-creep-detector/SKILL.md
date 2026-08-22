---
name: scope-creep-detector
description: "Check whether a PR diff grew beyond its stated intent. Compares touched files against the PR body's scope claim and reports files that look out-of-scope."
argument-hint: "[--base <ref>] [--head <ref>] [--pr-body <text>]"
---

# Scope Creep Detector

Compare a PR's actual diff against its stated scope and flag files touched outside the
expected blast radius. Distinguishes between "this file is in scope" and "this file was
brushed incidentally" — the first deserves a scope update, the second needs justification.

## When to run

- Before opening a PR: `--pr-body "$(cat .git/PR_BODY)"` to self-check.
- During code review: point at the PR number and let the skill read the body from
  `gh pr view <N> --json body`.
- The harness's `check-containment.mjs` already gates on harness-infrastructure files
  touched without acknowledgment; this skill covers the *other* direction — app files
  touched outside what the PR said it would change.

## Step 1: Gather context

Read the PR body. Extract the scope statement — the sentence(s) that describe what this
PR touches. If the body follows this repo's convention (`.agents/AGENTS.md` §9), the
scope is typically in the first paragraph.

If no scope statement exists: "This PR has no scope statement. Run `/grill-me` (from
`mattpocock/skills`) first to define one, then re-run this check."

## Step 2: Get the diff

Determine the files changed:
- If `--base` and `--head` are given: `git diff --name-only <base>...<head>`
- Otherwise: `git diff --name-only origin/master...HEAD`
- For a PR number: `gh pr diff <N> --name-only`

## Step 3: Categorize each file

For every file in the diff, decide:
- **In scope:** The file path or its parent directory is mentioned in the scope statement,
  or the file is a natural consequence of the change (e.g. a test file for a changed module).
- **Brushed incidentally:** The file was touched by a linter, formatter, or import re-org
  that ran across the whole tree. These are noise — note them but don't flag them.
- **Out of scope — needs justification:** The file is unrelated to the stated scope. Flag it.

Heuristics for "brushed incidentally":
- Only whitespace, semicolon/LF changes (run `git diff --word-diff` to confirm).
- Only import-path changes from a re-export refactor.
- Only `.gitignore`, `.prettierrc`, `.eslintrc` changes (tooling configs).

Heuristics for "out of scope":
- A new file in a directory not mentioned in the scope.
- A logic change (not formatting) in a file whose parent module was not mentioned.
- A spec or README change that accompanies a different feature than the one described.

## Step 4: Report

Output a table:

```
| File | Category | Why |
|------|----------|-----|
| src/lib/engine/costOfCare.ts | IN SCOPE | Scope mentions "cost-of-care data model" |
| src/components/CareTypeDropdown.tsx | OUT OF SCOPE | Scope says "engine only, no UI changes" but this component was edited |
| src/utils/format.test.ts | IN SCOPE | Test file for changed utility |
| .prettierrc | BRUSHED | Only formatting config — no logic change |
```

Summary: "N files in scope, M brushed incidentally, O out of scope."

If any file is OUT OF SCOPE: "Either update the PR body's scope statement to include these
files (if the change genuinely needs them), or revert them. A scope claim that disagrees
with the diff is the `.agents/AGENTS.md` §9.5 defect — don't ship it."

## Dependencies
- `git` (for diff)
- `gh` (for PR body — optional; `--pr-body` bypasses it)

## Relationship to the harness
- `check-containment.mjs` gates on harness-infra files touched without acknowledgment.
- This skill checks the *app* side — the complement direction.
- Both run before opening a PR. Neither replaces the other.

## Verification
After fixing: re-run this check. The OUT OF SCOPE column must be empty.