# Performance backlog — measured, not implemented

> Status: **notated, not done.** This file records optimization opportunities that were
> identified and measured during the lean-and-fast audit but deliberately left unimplemented,
> either because they change user-facing behavior, need product sign-off, or carry real risk.
> The items that were safe to land immediately shipped in the optimization PR instead.
>
> **Re-audited 2026-08-22** (second pass). All six apps rebuilt fresh (`npm run build` for each);
> the shipped items still hold, two backlog items were closed as safe, and the remaining two
> backlog items were re-measured with current numbers. See [Measurements](#measurements-2026-08-22)
> below.

## Done (shipped in the PR)

- mood-diner: deleted `public/playstore-banner.jpg` (681 KB) and `public/icon-512.jpg` (489 KB),
  both obsolete/unreferenced by app code — ~1.17 MB off every web build.
- mood-diner: favicon shrunk from 489 KB to 4 KB (`public/favicon.png`, 64×64 palette PNG
  derived from `icon-192.png`); `index.html` repointed.
- smart-recipe-app: `@huggingface/transformers` moved from `dependencies` to `devDependencies`
  (build-time `embed-corpus.mjs` only) — removes ~100 MB+ of onnxruntime from a production install.
- **mood-diner: `public/icon-512.png` re-encoded 497 KB → 109 KB** (sharp, 512×512 RGB preserved;
  closes the old backlog item #2). Verified lossless in practice by pixel diff against the
  original: mean per-channel delta 1.3, max delta 29 confined to anti-aliased edges (1.2% of
  pixels), invisible at launcher/PWA sizes. Referenced only by `manifest.json` (PWA install icon);
  the store-listing README reuses it as-is, so no listing screenshot changes.
- **travel-packing-app + smart-recipe-app: deleted 10 dead `public/` SVGs** — the
  `create-next-app` placeholders `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`
  in each app. Zero references in `src/`, `index.html`, layouts, specs, E2E or docs. This is the
  same dead-asset class the audit found by hand before; it has now recurred once, which is the
  argument for backlog item #3 (the guardrail).

## Backlog (needs a decision)

### 1. travel-packing-app — serve the ONNX WASM from a CDN instead of bundling it

- **Measured (2026-08-22):** the static export ships **two** ort WASM files — `ort-wasm-simd-threaded.jsep.*.wasm` at **26.8 MB** and `ort-wasm-simd-threaded.asyncify.*.wasm` at **24.3 MB** (51.1 MB total, up from 22.8 MB when this was first recorded) plus `ort.*.min.mjs` bundles (~0.5 MB). This is `onnxruntime-web` (peer dep of `@imgly/background-removal`), pulled in only when the user invokes background removal.
- **Why it's on hold:** it *is* already lazy (`await import('@imgly/background-removal')` in `WardrobeAnalyzer.tsx` / `WardrobeManager.tsx`; re-verified — zero `ort-wasm` references in the exported `index.html`), so it never blocks first paint. Serving the WASM from a CDN instead would cut ~51 MB from the worst-case download but adds a third-party runtime dependency and a config change in `WardrobeAnalyzer.tsx` / `WardrobeManager.tsx`.
- **Acceptance criteria if picked up:** background removal still works offline/Capacitor; no CSP changes required; chunk removed from the exported bundle.

### 2. Optional — add a bundle-size guardrail to the harness

- **Why useful:** the audit found the mood-diner dead assets and the ten dead SVGs only by manual inspection. A `scripts/harness-status.mjs` guardrail (e.g., flag `public/` assets > 400 KB that no `src/` file references, and/or unreferenced `public/` files of any size) would catch this class mechanically — and this class has now recurred once since the idea was first recorded.
- **Why on hold:** per `.agents/AGENTS.md` §8, a guardrail requires a traced lesson in §6 and a self-test in `harness-status.test.mjs` — that's a deliberate addition, not a drive-by.
- **Acceptance criteria:** the rule fires on a committed fixture, self-tests pass, and the gate stays green for the existing six apps.

## Measurements (2026-08-22)

All numbers from fresh production builds (`npm run build` per app, Turbopack for Next.js apps).

| App | Build output | JS | Notes |
|---|---|---|---|
| mood-diner (Vite) | `dist/` 516 KB | 307.0 kB (89.5 kB gzip) | single chunk + 3.7 kB CSS |
| legal-financial-rag (Vite) | `dist/` 220 KB | 198.2 kB (63.6 kB gzip) | single chunk + 4.2 kB CSS |
| portfolio-hub (Vite) | `dist/` 312 KB | 302.7 kB (92.1 kB gzip) | single chunk + 5.6 kB CSS |
| elder-care-planner (Next) | `out/` 1.3 MB | ~1.03 MB total; largest chunk 467 kB | 101 kB `index.html`; static export |
| smart-recipe-app (Next) | `out/` 1.3 MB | ~0.90 MB total; largest chunk 287 kB | `rag-index.json` 58 kB is live (embedding corpus) |
| travel-packing-app (Next) | `out/` 52 MB | ~1.01 MB first-load; largest first-load chunk 445 kB | 51.1 MB is the lazy ONNX WASM (backlog #1); `three`/Wardrobe chunks (~552 kB, ~395 kB) are lazy too |

First-load JS for the Next.js apps is the sum of chunks referenced by the exported `index.html`;
the prior audit's "0.5 MB max first-load chunk" figure was the largest single chunk, which is
unchanged (0.44–0.47 MB) — total first-load JS for travel-packing is ~1 MB and was not measured
as a total before.

## Tracked but not actionable

- **Local dev caches** (`projects/*/.next` ≈ 219 MB total after clean rebuilds; root `node_modules`
  3.2 GB): gitignored, cleared by `npm run clean`. Disk-only; no code change. (The previous audit
  recorded a 471 MB `.next` for travel-packing alone; `npm run clean` in this pass also removed a
  stale 27 MB `.next-capacitor` and a 1.3 MB `.next-prod`.)
- **Root `node_modules` 3.2 GB**: dominated by the ML toolchain (`@huggingface/transformers`
  → onnxruntime, `@imgly/background-removal` → onnxruntime, `three`). Unavoidable while those
  features exist; `npm install --omit=dev` for production installs skips the transformers subtree
  now that it's a devDependency.
- **Main entry chunks are already small** (elder-care-planner 0.47 MB, travel-packing 0.45 MB max
  first-load chunk) and heavy libs (`three`, imgly/onnx, i18n) are already dynamic-imported.
