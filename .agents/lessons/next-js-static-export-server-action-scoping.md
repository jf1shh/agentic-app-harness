# Next.js Static Export Server Action Scoping

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Next.js Static Export Server Action Scoping**: In Next.js static exports (`output: 'export'`), Node filesystem calls and Server Actions (`'use server'`) fail static page generation during `next build`. Refactor server actions to browser-compatible storage (`localStorage`) and import functions directly inside `'use client'` components rather than passing functions as props across server/client component boundaries.
