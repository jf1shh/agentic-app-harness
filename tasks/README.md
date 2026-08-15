# Agent Work Orders — Bring-Your-Own-Agent Contract

This directory is the **propose** half of the harness's agentic loop. It is
populated automatically; you generally don't hand-write files here.

```
SENSE      node scripts/harness-status.mjs        → harness-status.json
PROPOSE    node scripts/emit-tasks.mjs             → tasks/<finding-id>.md   (you are here)
ACT        any AI agent claims a task, does the work, opens a PR
VERIFY     node scripts/harness-status.mjs --gate  → CI fails on blocking findings
LEARN      node scripts/harness-learn.mjs          → CI fails unless new guardrails
                                                     trace to a documented lesson
```

The LEARN gate enforces a closed loop — **Lesson ⇄ Guardrail ⇄ Self-test** — so a
guardrail can't exist without a documented lesson, and a lesson can't claim
enforcement without a working, tested guardrail. See the "adding a learned
lesson" protocol in [`.agents/AGENTS.md`](../.agents/AGENTS.md).

## What blocks a merge (the Verify gate)

`--gate` (run in CI by `sdd-sentinel.yml`) fails the build **only on blocking
findings** — the regressions we've already paid for:

| Finding type | Blocks merge? | Rationale |
|---|---|---|
| `guardrail` | **yes** | A documented anti-pattern was reintroduced. |
| `missing-artifact` (missing spec) | **yes** | Hard SDD mandate. |
| `drift` (unchecked spec features) | no — informs | Legitimate open work; tracked as a task. |
| `contract` / `test-coverage` | no here* | Already enforced by `validate-specs.ps1 -Strict`. |
| `manual-review` | no — informs | Needs human judgement. |

\* The guardrails are also self-tested: `scripts/harness-status.test.mjs`
proves every guardrail fires on a known-bad line and stays silent on a
known-good one, so the gate itself can't silently rot. Use
`.\scripts\harness.ps1 verify` to run the self-test + gate locally.

The point of this layer is that **the harness writes the agent's task for it**.
Nothing here calls an LLM or needs an API key — the AI is a pluggable actuator,
and the repo stays neutral about which one you use.

## The contract

A work order (`tasks/<finding-id>.md`) is a self-contained prompt. Any agent —
Claude Code, Cursor, Copilot, Aider, or a human — may claim one. To act on it:

1. Read [`.agents/AGENTS.md`](../.agents/AGENTS.md) and the referenced spec first.
2. Do the work in the named `projects/<app>` (or fix the spec, and say so in the PR).
3. Make the **acceptance gate** in the work order go green.
4. Run `node scripts/emit-tasks.mjs --prune` to retire the resolved order.
5. Open a PR. **Agents never self-merge** — a human reviews.

## Session & model discipline (efficiency, not correctness)

Work orders are self-contained on purpose — each one can be executed in a **fresh
session** (or a `/clear`ed one) without losing anything the task needs. Three habits
make the most of that design:

- **One task per session.** Don't carry an unrelated PR's context into the next work
  order; the always-loaded rulebook + the task file + its spec are the whole contract.
  Start clean, end clean — a bloated session is re-billed on every turn.
- **Delegate exploration, not implementation.** Heavy repo-wide reads (dependency
  graphs, "who calls this?", history) belong in a subagent or a tool (see the optional
  repowise MCP in the README), so the main session stays on the files the task touches.
- **Split models per phase.** Plan with the strongest reasoner (spec/architecture is
  where an expensive model earns its tokens), execute the mechanical work with a
  cheaper one, review with the strong one. Point directly at the spec/task file
  instead of re-grepping the tree.

None of this changes the *gate* — `node scripts/test-app.mjs <AppName>` (or
`--changed` for the inner loop) still has to go green, and CI still runs the full
suite. These are cost/attention habits, not shortcuts.

## Regenerating

```bash
node scripts/harness-status.mjs      # sense: report + write harness-status.json
node scripts/emit-tasks.mjs          # sense, then emit work orders (idempotent)
node scripts/emit-tasks.mjs --prune  # also delete orders whose finding is resolved
```

Or via the harness CLI: `.\scripts\harness.ps1 status` and `.\scripts\harness.ps1 tasks`.

`harness-status.json` is a generated snapshot (git-ignored). The `tasks/*.md`
work orders **are** committed, so an open task is visible to every agent and in
every PR diff until it's resolved and pruned.

## Optional: bulk-import as GitHub Issues

`tasks/*.md` work orders are the primary, committed contract — every agent
should read those. If your team also wants findings tracked as real GitHub
Issues, `scripts/emit-github-issues.mjs` renders the same findings as a
bulk-importable JSON file instead:

```bash
node scripts/emit-github-issues.mjs             # sense, then write tasks/issues.json
node scripts/emit-github-issues.mjs --no-sense  # reuse existing harness-status.json
node scripts/emit-github-issues.mjs --upload    # also print the gh CLI upload loop
```

`tasks/issues.json` is git-ignored (a derived snapshot, same as
`harness-status.json`), and the `gh` CLI has no native bulk-JSON-import
subcommand, so upload is a loop — one `gh issue create` per array element:

```bash
jq -c '.[]' tasks/issues.json | while read -r issue; do
  gh issue create \
    --title "$(echo "$issue" | jq -r '.title')" \
    --body "$(echo "$issue" | jq -r '.body')" \
    --label "$(echo "$issue" | jq -r '.labels | join(",")')"
done
```

This is optional tooling, not part of the blocking gate — nothing in
`scripts/test-app.mjs` or `sdd-sentinel.yml` calls it.
