# AGENTS.md — Rules for every AI agent touching this repo

> **Universal entry point.** This file is the cross-tool standard ([agents.md](https://agents.md)) read
> natively by OpenAI Codex, Cursor, GitHub Copilot, Gemini CLI, Aider, Windsurf, Zed, Warp, RooCode,
> Factory, Google Jules, Devin, **Google Antigravity**, and by **Claude Code** as a fallback. Whatever
> agent you are, these rules are binding — and they are **enforced in CI, not just documented**, so a
> non-compliant change fails the build regardless of which tool wrote it.

**The full, authoritative rulebook is [`.agents/AGENTS.md`](.agents/AGENTS.md). Read it before changing any code.**

@.agents/AGENTS.md

**Orientation first.** [`IDENTITY.md`](IDENTITY.md) and [`CONTEXT.md`](CONTEXT.md) at the repo root are
an [ICM](https://github.com/ktnCodes/icm-template) navigation layer — a workspace map and a
task-routing table sitting on top of the rulebook above, not replacing it. Read them before exploring
the tree by hand.

---

## The non-negotiables (summary — the link above governs)

1. **Spec is the single source of truth.** Never write code or add a feature without first reading the
   matching spec in [`specs/`](specs/). The spec dictates architecture, data models, and acceptance
   criteria. If a request contradicts the spec, stop and flag it — don't silently diverge.

2. **Contract-first schema validation (Zod).** Every app's data models are runtime `zod` schemas with
   types inferred via `z.infer<typeof Schema>`. Validate untrusted input (storage, imports) at the boundary.

3. **No vibe coding.** Don't make architectural decisions on the fly. If something is ambiguous or
   underspecified, **STOP** and ask — or update the spec and get approval — before implementing.

4. **Work in the right directory.** This is a monorepo; apps live under [`projects/`](projects/). Scope
   every command and edit to the correct `projects/<app-name>`.

5. **Testing is mandatory, and unit tests come first.** For any change to a logic module
   (`src/lib`, `src/utils`, `src/services`, `src/engine`, `src/data`, …) write the failing Vitest
   case **first**, watch it fail, then make it pass — and prove it can fail by breaking the code
   once. Playwright E2E for critical flows; `@axe-core/playwright` accessibility. All test
   scenarios — unit *and* E2E — use BDD `Given → When → Then`. A feature is not complete until
   `node scripts/test-app.mjs <AppName>` passes (security, lint, type-check, Vitest, Playwright +
   a11y). `node scripts/harness-status.mjs` reports every logic module no unit test reaches; see
   `.agents/AGENTS.md` §5.

6. **Never self-merge.** An agent may open a PR but a human reviews and merges. See the Sense → Propose →
   Act → Verify → Learn loop in `.agents/AGENTS.md` §8.

7. **Report what you ran, not what you meant to run.** Never self-certify verification — paste
   what the command printed. Widening a `z.enum` or union obliges you to open every consumer of
   that type (`grep -rln "<TypeName>" projects/<app>/src/`), add a fixture to every test sweep the
   new case kind belongs in, and prove each new test can fail by breaking the code. See
   `.agents/AGENTS.md` §9, which is written against a PR that got each of these wrong.

8. **Close the loop.** When you hit a bug or learn a reusable lesson, don't just patch the code — persist
   the lesson into `.agents/AGENTS.md` and, when the pattern is mechanically detectable, encode it as a
   guardrail in `scripts/harness-status.mjs` (with a self-test) so the harness catches the regression
   deterministically. See the "adding a learned lesson" protocol in `.agents/AGENTS.md` §8.

## Verify your work locally

```
node scripts/harness-status.mjs --gate   # blocking gate: guardrails + missing specs
node scripts/harness-learn.mjs           # lesson ⇄ guardrail ⇄ self-test traceability
node scripts/check-doc-claims.mjs --gate # blocking gate: checked-in docs match what they claim
node scripts/test-app.mjs <AppName>      # full per-app suite (security, lint, tsc, Vitest, Playwright)
```

The loop core (`harness-status.mjs`, `emit-tasks.mjs`, `harness-learn.mjs`) **and the full per-app suite**
(`test-app.mjs`) are zero-dependency Node ESM and run cross-platform — you do not need PowerShell for any
gate. The `.ps1` scripts remain as thin wrappers so existing CI and muscle memory keep working.
