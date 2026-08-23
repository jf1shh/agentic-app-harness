# Playwright Strict Mode Selectors

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Playwright Strict Mode Selectors**: In Playwright E2E tests, scope selectors tightly to containers (e.g. `.modal-content h2`) to prevent duplicate matching when identical headings exist on background cards.
