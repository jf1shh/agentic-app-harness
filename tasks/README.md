# Agent Work Orders — Bring-Your-Own-Agent Contract

This directory is the **propose** half of the harness's agentic loop. It is
populated automatically; you generally don't hand-write files here.

```
SENSE      node scripts/harness-status.mjs   → harness-status.json
PROPOSE    node scripts/emit-tasks.mjs        → tasks/<finding-id>.md   (you are here)
ACT        any AI agent claims a task, does the work, opens a PR
VERIFY     CI re-runs the sensors; the task's acceptance gate must go green
LEARN      a novel fix becomes a new guardrail in harness-status.mjs
```

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
