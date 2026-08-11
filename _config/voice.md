# Voice

This repo's documentation and PR-body conventions are already governed by
`.agents/AGENTS.md` §9 ("Opening a pull request: report what you ran, not what you meant to
run") — that section is the actual style rule and is not repeated here. This file states only
the tone conventions ICM's own template expects, scoped to files under this ICM layer
(`IDENTITY.md`, `CONTEXT.md`, `_config/`):

- **State, don't narrate.** These files are a map and a routing table, not a walkthrough — prefer
  a table row over a paragraph.
- **Evidence over assertion**, same as the rest of the repo: a claim about what a command does
  should be checked against the script, not written from memory.
- **Link instead of duplicating.** If a fact already has a home in `.agents/AGENTS.md` or
  `CLAUDE.md`, link to it rather than restating it — see `_config/conventions.md`.
