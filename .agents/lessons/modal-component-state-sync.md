# Modal Component State Sync

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Modal Component State Sync**: When opening modals with contextual initial tab props (e.g. "Book Table" vs "Menu"), assign a unique `key` (e.g. `key={restaurantId + tab}`) to force a clean remount of modal state.
