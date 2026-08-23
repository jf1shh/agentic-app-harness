# Hidden Text Overflow Must Indicate Truncation

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Hidden Text Overflow Must Indicate Truncation** `[guardrail: text-truncate-missing]`:
  Combining `overflow-hidden` with `whitespace-nowrap` clips text invisibly — the user sees a
  sentence stop mid-word and has no visual indicator that content was hidden. Add `truncate`
  (Tailwind), `text-ellipsis`, or `line-clamp-N` so the truncation is visually communicated with
  an ellipsis or fade. `overflow-hidden` alone (layout containment) and `whitespace-nowrap` alone
  (preventing wrap) are not this anti-pattern — only the specific combination without a
  truncation indicator fires.
