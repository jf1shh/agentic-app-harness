# The App Development Cycle

A single, sequenced walkthrough of how an app — a brand-new one under `projects/`, or a feature
inside an existing one — moves from idea to merged PR to living under the harness's own
self-improvement loop. Every rule cited here already exists in `.agents/AGENTS.md`; this doc adds
no new rules and duplicates no prose — it orders what's already mandatory into the sequence you'd
actually follow, and links to the section that governs each step. If anything here ever seems to
disagree with `.agents/AGENTS.md`, that file wins.

Two different journeys share this cycle: **building a new app** runs Phases 0–9 once, start to
finish. **Adding a feature to an existing app** re-enters at Phase 1 (does the spec already cover
this? if not, amend it first) and skips scaffolding.

---

## Phase 0 — Orient

Before anything else, know where you are and what already exists.

1. Read `IDENTITY.md` (workspace map) and `CONTEXT.md` (task-routing table) — 30 seconds each.
2. Read `AGENTS.md` → `.agents/AGENTS.md` in full. Not skimmed, not "read once last month" —
   `.agents/AGENTS.md` §6 is explicit that this happens at the start of *every* change set, because
   a first-time read is not an up-to-date read after the repo evolves.
3. Check `HANDOFF.md` for whatever the previous agent left as open state.
4. If you're touching an existing app, read `specs/<app-name>-spec.md` before reading its code.

## Phase 1 — Spec first

**Nothing gets built without a spec.** `.agents/AGENTS.md` §1.

- New app: copy `specs/templates/APP_SPEC_TEMPLATE.md` to `specs/<app-name>-spec.md` and fill in
  every section — product overview, core features, stack, Zod-shaped data models, UI/UX system,
  testing/compliance targets, acceptance criteria, and (critically) **open questions**. An
  unresolved architectural decision belongs in that last section, not in your head.
- New component within an app: `specs/templates/COMPONENT_SPEC_TEMPLATE.md` covers the
  narrower case.
- Existing app, new feature: check whether `specs/<app-name>-spec.md` already describes it.
  - Covered → build against what's written.
  - Not covered → this is the "No vibe coding" trip-wire (§2): stop, propose a spec amendment,
    get it agreed, *then* build. Don't let an implementation decide the spec retroactively.
  - Contradicts what's written → stop and flag the conflict to the user. Don't silently diverge
    (§1), and don't assume the spec is wrong — §6's facility-score and IL-basis lessons are both
    examples where the *spec itself* needed a written correction before anyone built against it;
    that correction is a deliberate step, not a shortcut around Phase 1.

## Phase 2 — Scaffold (new apps only)

`scripts/scaffold-app.ps1` generates the expected skeleton — package.json, test config
(`src/**/*.test.ts` included, `e2e/**` excluded per §6's Vitest/Playwright split lesson), the
`specs/` slot, README stub. Pick a dev-server port that doesn't collide with the other five apps
(`.agents/AGENTS.md` §6, "Monorepo Dev Server Port Collisions") and record it in
`playwright.config.ts` explicitly.

## Phase 3 — Contract-first data models

Before writing logic, define every entity the spec describes as a runtime Zod schema
(typically `src/lib/schemas.ts` or `src/schemas.ts`), with TypeScript types inferred via
`z.infer<typeof Schema>` — never hand-written interfaces that can drift from what's actually
validated. `.agents/AGENTS.md` §1. Validate untrusted input (storage reads, imports) at this
boundary; trust nothing implicitly past it.

This is also the moment to think about **blast radius**: if a schema is a `z.enum` or union that
future work will widen, know now that widening it later obliges a full-repo grep of every consumer
(§9.2) — not a reason to avoid enums, just a cost to plan for.

## Phase 4 — Build, test-first

For every logic module (`src/lib`, `src/utils`, `src/services`, `src/engine`, `src/data`,
`src/hooks`, `src/store`, `src/state`, or a top-level `src/*.ts`), the order is fixed by
`.agents/AGENTS.md` §5:

1. **Red** — write the failing Vitest case first (`Given/When/Then` in the name/description, per
   the BDD standard), run it, confirm it fails for the reason you expect.
2. **Green** — write the smallest implementation that passes it.
3. **Prove** — break your own implementation once, confirm the test goes red, restore it. This is
   not optional ceremony; §9.4 exists because a PR shipped a "tripwire" assertion that was
   type-tautological and could never fail under any change. You'll state this mutation in the PR
   body in Phase 7.

**Backfilling a test onto already-correct code** is the one place Red is skipped — you can't write
a failing test for behavior that already works — but Prove is then not optional, it's the entire
guarantee (§5).

Components/pages/routes (`.tsx`) are deliberately **not** unit-tested — that's Playwright's job,
next phase.

If your change touches a case-enumerating sweep (a `CASES` array, a table-driven test, an
invariant checked across fixtures) and adds a *new kind* of case, add a fixture for it to every
such sweep, not just the one you're focused on — §9.3 is the cautionary tale of a suite that
stayed green by never looking at the new case.

## Phase 5 — E2E and accessibility

Playwright specs in `e2e/*.spec.ts`, BDD-formatted, covering critical user flows, plus
`@axe-core/playwright` accessibility checks. `.agents/AGENTS.md` §5. If the app ships to more than
one origin (e.g. GitHub Pages *and* a Capacitor Android shell), it needs a smoke test against the
**built** output at **each** origin — see §6 "Test the Artifact You Ship" — not just the dev
server, which rewrites away exactly the deploy-specific config that breaks in production.

## Phase 6 — Run the gate

```
node scripts/test-app.mjs <AppName>
```

This wraps clean → security audit → lint → type-check → Vitest → Playwright + axe a11y, installing
deps/browsers on demand. It is **the** authoritative check — not a per-app script run in isolation,
and not something you trust CI to tell you about after the fact (§5, §9.1). Run it locally before
you push, every time, even if you're confident nothing broke.

## Phase 7 — Open the PR

`.agents/AGENTS.md` §9, all five rules, each written against a real defect a real PR shipped:

- **§9.1** Report what the gate actually printed. Never write "CI-clean" or "0 blocking findings"
  unless you ran that command this session and are pasting its output. A red suite honestly
  reported is fine; a green suite claimed but not run is the one thing this section exists to stop.
- **§9.2** If you widened an enum/union, `grep -rln "<TypeName>" projects/<app>/src/` and list
  every consumer file in the PR body with how it handles the new case (or why it needs no change).
  `check-enum-blast-radius.mjs` enforces this in CI — it fails if a referencing file was neither
  touched nor named.
- **§9.3** Confirm every case-enumerating sweep you touched in Phase 4 actually got the new
  fixture, and say so.
- **§9.4** State the mutation you proved in Phase 4's Prove step and its result.
- **§9.5** Only claim scope you can actually deliver — if a change forces a visible surface (a new
  enum member showing up in a dropdown built from `Object.keys(...)`, say), either handle it or say
  plainly it's unhandled. Don't write "no UI changes" if the type system disagrees with you.

Check for a PR template before writing the body. **Never self-merge** — a human reviews and merges
(§5, §8).

## Phase 8 — After merge: the harness loop takes over

This is where the cycle stops being something *you* drive by hand and becomes something the repo
drives on every future commit. Full detail in `.agents/AGENTS.md` §8; `stages/*/CONTEXT.md` mirrors
each stage below as its own contract.

| Stage | Command | What it does |
|---|---|---|
| Sense | `node scripts/harness-status.mjs` | Deterministically scans every app for missing specs, contract/BDD gaps, spec drift, and guardrail hits |
| Propose | `node scripts/emit-tasks.mjs` | Turns findings into self-contained work orders under `tasks/` |
| Act | (any agent) | Claims a task, does the work, opens a PR — this is Phases 1–7 again, for someone else's finding |
| Verify | `node scripts/harness-status.mjs --gate` | Blocking CI gate — guardrail regressions and missing specs fail the build |
| Learn | `node scripts/harness-learn.mjs` | Enforces that every guardrail traces to a documented lesson, so enforcement can't silently rot or silently expand |

`node scripts/harness-history.mjs --record` snapshots this commit's per-rule finding counts so a
non-blocking sensor's backlog, or a guardrail's total silence, is something the repo can report on
command instead of something a human has to remember to check.

## Phase 9 — Close the loop

Hit a bug, or learn something that'll bite the next agent too? `.agents/AGENTS.md` §8's "Protocol:
adding a learned lesson":

1. **Mechanically detectable** (a regex could catch it): add a `GUARDRAILS` entry in
   `scripts/harness-status.mjs` with a `lesson` field, a known-bad + known-good case in
   `scripts/harness-status.test.mjs`, and a prose bullet in §6 tagged `` `[guardrail: <id>]` ``.
   Run `harness-learn.mjs` — it fails the build if the tag doesn't resolve to a real, self-tested
   guardrail.
2. **Needs human judgment** (most of §6's longest lessons are this): a plain prose bullet in §6,
   no guardrail tag.

A new sensor (an absence check no single line can express — a missing spec, an unmounted modal)
starts **non-blocking** and is promoted to blocking only once its backlog is provably closed —
`senseUnitTests`'s history is the worked example in §8. Don't gate a check on day one; it reddens
unrelated PRs and teaches agents to route around the gate instead of satisfying it.

---

## One-page checklist

- [ ] Read `IDENTITY.md`, `CONTEXT.md`, `AGENTS.md` → `.agents/AGENTS.md`, `HANDOFF.md`
- [ ] Spec exists and covers this change, or was amended and agreed first
- [ ] New app scaffolded via `scaffold-app.ps1`, with a non-colliding dev port
- [ ] Data models are Zod schemas with `z.infer` types
- [ ] Every logic-module change: Red → Green → Prove
- [ ] Every changed case-enumerating sweep has a fixture for the new case
- [ ] Playwright + axe E2E cover the new flow; multi-origin apps have a built-output smoke test
- [ ] `node scripts/test-app.mjs <AppName>` run locally, output pasted (not paraphrased)
- [ ] PR body: gate output, enum blast-radius (if any), sweep fixtures (if any), mutation proof,
      honest scope
- [ ] Opened, not self-merged
- [ ] Any reusable lesson persisted to `.agents/AGENTS.md` §6 (+ guardrail if mechanical)
