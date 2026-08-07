# Agentic App Harness — AI Agent Handoff Document

_Last updated 2026-08-07. This file describes the state of the repo **right now** —
it is rewritten, not appended to, each time it's updated. Session-by-session
history belongs in git log and PR descriptions, not here._

## 1. Workspace & Architecture Overview
- **Repository:** `jf1shh/agentic-app-harness`
- **Live Portfolio Hub:** https://jf1shh.github.io/agentic-app-harness/
- **Six apps total** — the hub itself, plus five showcased apps, all live on GitHub Pages:
  - `MoodDiner`: https://jf1shh.github.io/agentic-app-harness/mood-diner/
  - `Travel Packing App`: https://jf1shh.github.io/agentic-app-harness/travel-packing-app/
  - `Smart Kitchen Recipe Manager`: https://jf1shh.github.io/agentic-app-harness/smart-recipe-app/
  - `LexiVault Financial RAG`: https://jf1shh.github.io/agentic-app-harness/legal-financial-rag/
  - `Elder Care Cost Planner`: https://jf1shh.github.io/agentic-app-harness/elder-care-planner/
- **What this repo is:** a spec-driven development (SDD) harness — specs, scripts,
  and CI gates that keep AI-assisted app development rigorous and drift-free. The
  quality bar (Zod contracts, BDD tests, accessibility, spec coverage) is enforced
  in CI, not just documented. Full rulebook: `.agents/AGENTS.md`.

## 2. The Agentic Loop (harness self-improvement)
The harness closes its own improvement loop **with no embedded LLM and no API
key** — the AI agent is a pluggable actuator, and the repo stays provider-neutral.
The loop core is zero-dependency Node ESM and runs anywhere Node does.

| Stage | Command | What it does |
|---|---|---|
| **Sense** | `node scripts/harness-status.mjs` | Scans every app for missing artifacts, contract/BDD gaps, spec drift, and guardrail violations → `harness-status.json`. |
| **Propose** | `node scripts/emit-tasks.mjs` | Turns each finding into a self-contained work order under `tasks/`. |
| **Act** | (any agent) | An agent claims a task, does the work, opens a PR — never self-merges. |
| **Verify** | `node scripts/harness-status.mjs --gate` | Blocking CI gate: fails on guardrail regressions + missing specs (drift only informs). Guardrails are self-tested (`harness-status.test.mjs`). |
| **Learn** | `node scripts/harness-learn.mjs` | Enforces a closed `Lesson ⇄ Guardrail ⇄ Self-test` loop so new guardrails must trace to a documented lesson. |

Currently: **7 blocking guardrails**, all traced to `.agents/AGENTS.md` §6 lessons
(`node scripts/harness-learn.mjs` verifies this). Three sensors run alongside them:
`senseMobileRelease` and `senseProductionBundleTest` (non-blocking), and
`senseUnitTests` (blocking — every logic module needs a unit test reaching it).
As of this writing, `node scripts/harness-status.mjs --gate` reports **0 findings**
across all 6 apps.

**CI runner note (resolved):** every workflow — `ci.yml`, `sdd-sentinel.yml`,
`deploy-pages.yml`, and all `android-release*.yml` — now runs on `ubuntu-latest`.
The previous handoff flagged `sdd-sentinel.yml` as still on `windows-latest`
disagreeing with the README's claim; that was fixed in PR #93 (`ci(sdd-sentinel):
move SDD Sentinel to ubuntu-latest, matching the standing claim`) and is confirmed
in the workflow file as of this pass — nothing left to reconcile there.

`.\scripts\harness.ps1` exposes `status`, `tasks`, `verify`, and `learn` as a thin
wrapper. See `.agents/AGENTS.md` §8 and `tasks/README.md` for the bring-your-own-agent
contract.

## 3. Current State / Open Work

**This pass (2026-08-07): full security / functionality / recruiter-facing audit.**
Ran `npm install` at the repo root (dependencies weren't installed in this fresh
container), then audited security, robustness, and how the repo reads to an
outside reviewer (recruiter/hiring-manager lens). Findings and fixes:

- **[Security, real bug] LexiVault's vault-lock passphrase was decorative.**
  `VaultLockModal` derived a PBKDF2 key from whatever was typed and always
  accepted it — there was no stored verifier, so any string unlocked the vault.
  Fixed with `src/lib/security/vaultAuth.ts` (`registerVaultPassphrase` /
  `verifyVaultPassphrase`): the first unlock of a session registers a salt +
  verifier; every unlock after that must reproduce the same passphrase or it's
  rejected. Unit-tested (4 cases, TDD red→green) and mutation-proven (dropping
  the comparison makes the "wrong passphrase" test fail, confirmed then
  reverted). New E2E case in `e2e/rag-flow.spec.ts` proves a wrong passphrase is
  rejected and the right one still works.
- **[Security] Meta-delivered CSP `frame-ancestors`/`X-Frame-Options` are
  silently ignored by browsers**, and GitHub Pages can't send custom HTTP
  headers, so LexiVault's clickjacking defense didn't actually do anything.
  Added real JS frame-busting in `src/main.tsx` as the working defense.
- **[Security] `zero-telemetry` was imprecise** — LexiVault loads Google Fonts
  over the network, which is a real (if content-free) outbound request.
  Reworded to `zero-exfiltration` (the CSP's own `connect-src` scoping is what's
  actually enforced) in `README.md` and `index.html`, with the fonts caveat
  spelled out.
- **[Robustness] Real port collision**: `portfolio-hub` and `legal-financial-rag`
  both pinned dev/Playwright to port 3009 — exactly the trap
  `.agents/AGENTS.md` §6 documents. Moved `legal-financial-rag` to 3010
  (`playwright.config.ts`, `package.json`'s `dev` script). Root `README.md` and
  `CONTRIBUTING.md` also had stale port numbers for `mood-diner` (said 5173,
  actually 5178) and `smart-recipe-app` (said 3001, actually 3005) — corrected
  to match the real `playwright.config.ts` baseURLs everywhere.
- **[CI hygiene]** `ci.yml`'s test job had no explicit `permissions:` block
  (every other workflow scopes one down) — added `permissions: contents: read`.
  `.gitignore` listed `.env`/`.env.local` explicitly instead of the `.env*`
  wildcard two of the six apps already use locally — widened to match.
- **[Recruiter-facing]** All 5 mobile apps' `public/privacy.html` had shipped
  with literal `[DEVELOPER NAME]` / `[CONTACT EMAIL]` placeholders — live on
  the deployed Pages URL. Filled in and removed the stale "before publishing"
  TODO callout; the READMEs that flagged this in bold were updated to match.
  `CONTRIBUTING.md` was missing `legal-financial-rag` and `elder-care-planner`
  from its app list (only 4 of 6), and pointed contributors at the PowerShell
  gate exclusively — added the missing apps and the cross-platform
  `node scripts/test-app.mjs` command that's actually authoritative.
  `portfolio-hub/README.md`'s project layout was stale (missing
  `CaseStudySection.tsx`, `caseStudiesData.ts`, `loopStats.generated.ts`,
  `schemas.test.ts`) — updated, and the Case Studies / Loop Dashboard features
  were undersold in the feature list — added.
  Added `author`/`license`/`repository` fields to every `package.json` (root +
  all 6 apps) — previously present nowhere.
- **[Robustness, real bug already on master] `portfolio-hub` had a split
  `@typescript-eslint` peer set** — `eslint-plugin` at `^7.1.0`,
  `parser` at `^8.65.0` — from Dependabot PR #59 landing alone (its paired
  PR #20 for `eslint-plugin` never merged; this repo's own §6 lesson names
  this exact pair as a known risk). It happened not to crash lint in this
  session's *first* `npm install` (lucky — v7 plugin tolerates a v8 parser's
  output closely enough), but bumping the plugin to match (the "obvious" fix)
  **does** crash: `@typescript-eslint/utils`'s `RuleCreator` built for v8
  doesn't match what ESLint 8.57's rule loader expects, the same
  dual-package-instance failure the Workspace Hoisting lesson documents.
  Verified by reproducing the crash, then reverted `parser` back to `^7.1.0`
  to match — a real pair, not a partial one. Confirmed with a full
  `node scripts/test-app.mjs portfolio-hub` (lint/tsc/vitest/Playwright/a11y
  all green). This means PR #59 should be considered **reverted**, not
  completed — a real ESLint 9 migration for this app is separate, larger
  work, not something to do as a side effect of an audit.
- **`npm audit`**: attempted `npm audit fix` for the one advisory it claims is
  non-breaking (`undici`, nested three levels under `promptfoo`→`ai`→
  `@ai-sdk/provider-utils`). It's a no-op in practice — npm reports "fix
  available via `npm audit fix`" but the vulnerability count and `npm ls
  undici` don't change after running it, because the fix would require
  re-resolving a deeply nested transitive dependency the non-force resolver
  won't touch. Not chasing this further with `--force`: `promptfoo` is a
  devDependency-only eval CLI (`legal-financial-rag`'s `npm run eval`), never
  bundled into any shipped app, so the exposure is low, and forcing it would
  downgrade `promptfoo` to 0.120.14 per npm's own output — a breaking change
  for a tool nothing else depends on. Left as-is alongside `adm-zip`/`sharp`
  (transitive through `@huggingface/transformers`, high severity, no fix
  available upstream) and `uuid` (moderate, via `@capacitor/cli`→`xcode`,
  fix only via a `@capacitor/cli` major bump) — all four are the same
  "don't force a major without checking the whole peer set" lesson in
  `.agents/AGENTS.md` §6; worth a dedicated look, not a drive-by bump.
- **Full `node scripts/test-app.mjs`** was run for `legal-financial-rag` (the
  vault-lock fix) and `portfolio-hub` (the peer-set fix) — both green, see PR
  body for pasted output. The other four apps' `lint`/`tsc` were spot-checked
  clean; no code paths changed in them beyond README/config/package.json text.

**Not fixed this pass — flagged for a human, not auto-actioned:**
- **Two stale `claude/*` branches look abandoned and are safe to delete** —
  verified by diff, not just by staleness: `claude/monorepo-agentic-harness-review-3jkqxe`
  (1 commit, "Harness efficiency, security and de-duplication pass") has both
  its security fixes already merged into `master` via PR #94 (confirmed by
  reading `test-app.mjs`'s allow-list and `serve-dist.mjs`'s containment check
  directly). `claude/github-actions-monorepo-sg51qd` (81 commits, "Add Claude
  Code GitHub Actions workflows") is superseded by PR #95, which shipped the
  same two workflow files (`claude.yml`, `claude-code-review.yml`) already on
  `master`. Neither was deleted in this pass — branch deletion wasn't
  something this session had authorization to do unilaterally; a human should
  delete them (or say why not) since an unreviewed 33/81-commit branch sitting
  indefinitely is a bad look on a repo people are evaluating.
- **`feat/11.11-starting-guide`** (1 commit, "§11.11 starting guide") conflicts
  with a *different* approved §11.11 already in `specs/elder-care-planner-spec.md`
  ("Live headline sentence on the break-even panel") — looks like an earlier,
  un-adopted direction for that section number. Needs a human call on whether
  anything in it is still wanted; not merged or deleted here.
- **GitHub repo description** (Settings → General) still likely says "four live
  web & mobile apps" (per the prior handoff) — there are six now. Still not
  fixable via any tool available to this session (no repo-settings/topics API
  exposed); do it manually.
- **Open issues #69 and #70** — unchanged, still real, still unresolved. Not
  touched this pass; out of scope for a security/recruiter-facing audit.
- **Dependabot backlog** — not re-triaged this pass (last triaged 2026-08-04,
  see prior git history / PR #91 for the mood-diner incident). Re-check before
  it re-accumulates; the "peer set" lesson in `.agents/AGENTS.md` §6 is exactly
  about what happens when it doesn't get periodic attention.

## 4. How to Verify
- Whole-repo sense + gates: `node scripts/harness-status.mjs --gate`, then
  `node scripts/harness-learn.mjs` (or `.\scripts\harness.ps1 verify` / `learn`).
- A single app: `node scripts/test-app.mjs <AppName>` (security, lint, type-check,
  Vitest, Playwright + a11y) — this is the authoritative gate; run it before every
  push, not just on CI.
- Spec/schema coverage: `.\scripts\validate-specs.ps1 -Strict`.
- Enum/union widening blast radius: `node scripts/check-enum-blast-radius.mjs`.

## 5. Next Steps for the Next Agent
1. Get a human to delete (or explicitly keep) the two confirmed-superseded
   branches and decide on `feat/11.11-starting-guide`, per §3 above.
2. Update the GitHub repo description manually (Settings → General) to reflect
   six apps, not four.
3. Triage the Dependabot backlog — don't let it re-accumulate.
4. Close out issues #69 and #70, or at minimum comment with current status.
5. Consider whether `legal-financial-rag`'s vault lock should extend to
   actually encrypting document content at rest (currently: real passphrase
   verification gates the UI, but `SAMPLE_DOCUMENTS`/chunks are held as plain
   strings in React state, matching the app's "session-only, nothing persists"
   design — see its README). That's a larger redesign than this pass's scope
   (fixing the passphrase check to be real, not fake) and would need a spec
   update first per `.agents/AGENTS.md` §1's "no vibe coding" rule.
6. When adding a mechanical lesson, follow the `.agents/AGENTS.md` §6 protocol:
   guardrail + self-test + `[guardrail: <id>]` tag, or the Learn gate fails the build.
