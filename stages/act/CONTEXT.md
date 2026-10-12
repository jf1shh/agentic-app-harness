# Stage 3 — Act

## What do I do here?

Claim one open work order from `tasks/`, do the work in the app it targets, and open a PR. This
is the one stage with no dedicated script — the actuator is any agent, and the harness stays
LLM-free by never assuming which one.

## Contract

- **Reads**: one `tasks/<id>.md` work order, the `specs/<app-name>-spec.md` it targets, and
  `.agents/AGENTS.md` in full (§1–§9 govern how the change itself is made).
- **Does**: implements the change in the correct `projects/<app-name>/`, writes/updates tests per
  `.agents/AGENTS.md` §5, runs `node scripts/test-app.mjs <AppName>` locally before pushing.
- **Sandbox (optional, recommended for agent-generated test commands)**: wrap them in
  `node scripts/sandbox-run.mjs --app projects/<app-name> -- <command>` — an MXC (Bubblewrap) sandbox
  with outbound network **denied** by default, the repo read-only and only the app dir writable. It
  fails closed (exit 3, nothing run) when `@microsoft/mxc-sdk` is not installed; see the script header.
- **Audit** (this stage's pass/fail checklist, before opening the PR): `.agents/AGENTS.md` §10's
  Definition of Ready/Done — run through it line by line rather than trusting memory.
- **Writes**: a pull request. **Never self-merges** — a human reviews and merges
  (`.agents/AGENTS.md` §5/§8). See `.agents/AGENTS.md` §9 for what the PR body must contain
  (what you actually ran, not what you meant to run).

## Next stage

CI re-runs the gate in **Verify** (`../verify/`) on every PR.
