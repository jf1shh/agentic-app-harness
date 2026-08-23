# A GPU-less Container Cannot Create a WebGL Context in the Pinned Headless Shell — Degrade Gracefully, and Test the No-WebGL Path

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A GPU-less Container Cannot Create a WebGL Context in the Pinned Headless Shell — Degrade
  Gracefully, and Test the No-WebGL Path**: In the GPU-less sandbox/CI containers this repo runs
  in, Playwright's bundled headless shell cannot create a WebGL context
  (`BindToCurrentSequence failed`), and neither `--enable-unsafe-swiftshader` nor
  `--use-angle=swiftshader` rescues it. Two consequences. (1) *Any WebGL renderer must survive that
  condition*: `travel-packing-app`'s `new THREE.WebGLRenderer()` threw uncaught in its mount
  effect, which React's error boundary turned into the whole Knapsack Engine panel unmounting —
  including the accessible text breakdown the spec promises. Guard renderer creation and degrade to
  the text fallback; assert it with an E2E that stubs `HTMLCanvasElement.prototype.getContext` to
  return null via `page.addInitScript`. (2) *To test the working-WebGL path in such a container*,
  run the suite against the full Chrome binary with `--no-sandbox --in-process-gpu
  --enable-unsafe-swiftshader` through the existing `HARNESS_CHROMIUM_PATH` override — a small
  wrapper script suffices, and it is an environment override, not part of the app. Not tagged as a
  guardrail: WebGL availability is a runtime/environment property, not a line pattern.
