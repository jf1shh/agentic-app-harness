# Performance backlog — measured, not implemented

> Status: **notated, not done.** This file records optimization opportunities that were
> identified and measured during the lean-and-fast audit but deliberately left unimplemented,
> either because they change user-facing behavior, need product sign-off, or carry real risk.
> The items that were safe to land immediately shipped in the optimization PR instead.

## Done (shipped in the PR)

- mood-diner: deleted `public/playstore-banner.jpg` (681 KB) and `public/icon-512.jpg` (489 KB),
  both obsolete/unreferenced by app code — ~1.17 MB off every web build.
- mood-diner: favicon shrunk from 489 KB to 4 KB (`public/favicon.png`, 64×64 palette PNG
  derived from `icon-192.png`); `index.html` repointed.
- smart-recipe-app: `@huggingface/transformers` moved from `dependencies` to `devDependencies`
  (build-time `embed-corpus.mjs` only) — removes ~100 MB+ of onnxruntime from a production install.

## Backlog (needs a decision)

### 1. travel-packing-app — serve the ONNX WASM from a CDN instead of bundling it

- **Measured:** `.next-prod` ships `ort-wasm-simd-threaded.jsep.*.wasm` at **22.8 MB** plus three
  `ort.*.min.mjs` bundles (~1.2 MB). This is `onnxruntime-web` (peer dep of
  `@imgly/background-removal`), pulled in only when the user invokes background removal.
- **Why it's on hold:** it *is* already lazy (dynamic `import()` behind the Wardrobe tools), so
  it never blocks first paint. Serving the WASM from a CDN instead would cut ~23 MB from the
  worst-case download but adds a third-party runtime dependency and a config change in
  `WardrobeAnalyzer.tsx` / `WardrobeManager.tsx`.
- **Acceptance criteria if picked up:** background removal still works offline/Capacitor; no
  CSP changes required; chunk removed from the exported bundle.

### 2. mood-diner — re-encode `icon-512.png` (497 KB → ~150 KB)

- **Measured:** `public/icon-512.png` is 497 KB, referenced by `manifest.json` (PWA install icon)
  and used as the Play Console listing icon source.
- **Why on hold:** it's a brand asset with store-listing dependencies; re-encoding via sharp
  palette quantization should be visually lossless but needs an eyeball check before committing.
- **Acceptance criteria:** manifest icon still crisp at 512×512 on a real device; Play listing
  screenshot updated if the file changes.

### 3. Optional — add a bundle-size guardrail to the harness

- **Why useful:** the audit found the two mood-diner dead assets only by manual inspection.
  A `scripts/harness-status.mjs` guardrail (e.g., flag `public/` assets > 400 KB that no
  `src/` file references) would catch this class mechanically.
- **Why on hold:** per `.agents/AGENTS.md` §8, a guardrail requires a traced lesson in §6 and a
  self-test in `harness-status.test.mjs` — that's a deliberate addition, not a drive-by.
- **Acceptance criteria:** the rule fires on a committed fixture, self-tests pass, and the gate
  stays green for the existing six apps.

## Tracked but not actionable

- **Local dev caches** (`projects/travel-packing-app/.next` ≈ 471 MB, repo-local 4.2 GB total):
  gitignored, cleared by `npm run clean`. Disk-only; no code change.
- **Root `node_modules` 3.2 GB**: dominated by the ML toolchain (`@huggingface/transformers`
  → onnxruntime 1.26-dev, `@imgly/background-removal` → onnxruntime 1.27, `three`). Unavoidable
  while those features exist; `npm install --omit=dev` for production installs skips the
  transformers subtree now that it's a devDependency.
- **Main entry chunks are already small** (elder-care-planner 0.45 MB, travel-packing 0.5 MB max
  first-load chunk) and heavy libs (`three`, imgly/onnx, i18n) are already dynamic-imported.
