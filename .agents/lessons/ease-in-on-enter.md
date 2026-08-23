# Ease-In Timing On Enter Animations Feels Jarring

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Ease-In Timing On Enter Animations Feels Jarring** `[guardrail: ease-in-on-enter]`: An
  `ease-in` timing curve (Tailwind `ease-in`, Framer Motion `ease: "easeIn"`, CSS
  `cubic-bezier(0.4, 0, 1, 1)`) decelerates into position — the element appears to slow down as
  it arrives, which feels sluggish and physically wrong. Enter/mount animations should use
  `ease-out`: the element accelerates into view and settles naturally (CSS
  `cubic-bezier(0, 0, 0.2, 1)`, the Material Design standard deceleration curve). `ease-in` is
  correct for exit/leave transitions, but those are rare in UI work compared to enter — if a hit
  lands on an exit animation, it is safe to ignore. Inspired by `emilkowalski/skills`.
