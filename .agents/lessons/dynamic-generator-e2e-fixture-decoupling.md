# Dynamic Generator & E2E Fixture Decoupling

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Dynamic Generator & E2E Fixture Decoupling**: When switching from static mock data to dynamic generator logic (e.g. Archetype generation), update Playwright E2E tests to assert generic structural elements rather than hardcoded fixture strings (e.g. specific item names), ensuring tests remain resilient to generator changes.
