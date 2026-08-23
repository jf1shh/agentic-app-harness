# Mobile PWA Viewport Accessibility

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Mobile PWA Viewport Accessibility** `[guardrail: viewport-no-zoom]`: When configuring `<meta name="viewport">` for mobile PWA standalone apps, avoid setting `user-scalable=no` or `maximum-scale=1.0`, as `@axe-core/playwright` flags this as a WCAG 1.4.4 text zoom violation. Use `width=device-width, initial-scale=1.0, viewport-fit=cover`.
