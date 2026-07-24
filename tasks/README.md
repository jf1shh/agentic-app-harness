# Agent Work Orders — Bring-Your-Own-Agent Contract

This directory is the **propose** half of the harness's agentic loop. It is
populated automatically; you generally don't hand-write files here.

```
SENSE      node scripts/harness-status.mjs        → harness-status.json
PROPOSE    node scripts/emit-tasks.mjs             → tasks/<finding-id>.md   (you are here)
ACT        any AI agent claims a task, does the work, opens a PR
VERIFY     node scripts/harness-status.mjs --gate  → CI fails on blocking findings
LEARN      a novel fix becomes a new guardrail in harness-status.mjs
```

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
