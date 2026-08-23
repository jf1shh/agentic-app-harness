# A Dead `public/` File Ships in Every Build, and No Line-Level Rule Can See It

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **A Dead `public/` File Ships in Every Build, and No Line-Level Rule Can See It**: `public/`
  is copied verbatim into every web build and Capacitor container, so an asset nothing references
  is pure payload on every ship — yet "no file references this" is an *absence* check across the
  whole tree (the reference can be several files away: `index.html` → `manifest.json` →
  `icon-512.png`) that no `test(line)` predicate can express. Two 2026-08 optimization audits
  found this class only by hand: mood-diner shipped an obsolete `public/playstore-banner.jpg`
  (681 KB) and `public/icon-512.jpg` (489 KB), and travel-packing-app and smart-recipe-app each
  shipped five unreferenced `create-next-app` placeholder SVGs. The mechanical half is
  `senseDeadPublicAssets` in `scripts/harness-status.mjs`: every file under `<app>/public/` whose
  basename appears nowhere else in the app (src, html, json, markdown, e2e, store-listing, or
  other public files — excluding node_modules/android/build outputs) is reported as
  `dead-public-asset`. It is a **sensor**, not a guardrail, and starts **non-blocking** per §8:
  deleting an asset can need product judgement — a brand asset, a store-listing source, or a
  privacy policy deliberately hosted standalone (`privacy.html` is referenced by each app's
  README/store-listing docs, so it stays silent). What it deliberately does not claim: a
  *referenced* but oversized asset (a 500 KB icon the manifest really uses) is a size-tuning
  question, not this bug — re-encoding wants a human eyeball and is out of scope. Not tagged
  `[guardrail: …]` because it is not line-detectable; it carries a fixture-driven self-test in
  `harness-status.test.mjs`, so it cannot silently stop reporting.
