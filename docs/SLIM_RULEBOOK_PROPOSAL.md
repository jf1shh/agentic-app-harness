# Proposal — Slim the always-loaded rulebook into a lean index

> **Status: Step 1 (§6 only) implemented, approved before the change per §1/§2.** §6's 57 lesson
> bullets moved from inline prose to one-line index entries in `.agents/AGENTS.md`, each linking to
> the full text in its own file under `.agents/lessons/<slug>.md`. Nothing else in this document —
> §5/§8 detail-splitting, the `<250 lines` target for the whole file — has been done; that was always
> a later, separate decision per the Rollout section below, contingent on this step measuring clean.
>
> **Measured, not vibed:** `.agents/AGENTS.md` went from **1,305 lines / 119 KB** to **641 lines /
> 57 KB** — a 51% reduction in what every agent session loads before doing any real work. Every one
> of the four acceptance commands below passed: `node scripts/harness-learn.mjs` (10/10 guardrails
> still trace), `node scripts/check-doc-claims.mjs --gate`, `node scripts/harness-status.test.mjs`,
> and portfolio-hub's `loopStats.generated.test.ts` (57 lessons, unchanged count). Content fidelity
> was verified byte-for-byte: the concatenation of all 57 `.agents/lessons/*.md` bodies, blank lines
> stripped, is character-identical to the original §6 body, blank lines stripped — confirmed by
> script, not by eye. No rule was weakened, removed, or reworded; every guardrail-tagged lesson's
> bold title was cross-checked against its `lesson:` field in `scripts/harness-status.mjs` and
> matches exactly, so `harness-learn.mjs`'s traceability check needed no code change.

## The problem (measured, not vibed)

`.agents/AGENTS.md` is **1,112 lines / ~105 KB**, and it rides along in every agent session
because both the root `AGENTS.md` and `.agents/rules/harness.md` `@`-import it. Add the other
orientation files an agent is told to read — `CLAUDE.md` (198 lines), `HANDOFF.md` (313),
`IDENTITY.md` (79), `CONTEXT.md` (31) — and a fresh session starts with **~1,850 lines** of
context before any real work.

The Reddit/Claude-Code efficiency consensus ("keep the always-loaded file under 200 lines;
push topic detail into path-scoped files that lazy-load") says this is the single biggest
per-turn token and attention tax the harness pays. Prompt caching makes it *cheaper* over a
session, but not *smaller*: a bloated always-on window degrades reasoning regardless of price.

The bulk is concentrated in one place:

| Section | Lines | Always-on worth it? |
|---|---|---|
| §1 Spec first | 6 | yes — non-negotiable |
| §2 No vibe coding | 4 | yes |
| §3 Feedback loops | 3 | yes |
| §4 Work in the right directory | 4 | yes |
| §5 Mandatory testing | 55 | yes (summary); detail can lazy-load per app |
| **§6 Learned lessons** | **612 (55%)** | **no — the long tail** |
| §7 Session wrap-up | 6 | yes |
| §8 Agentic loop | 156 | yes (summary); per-script detail can lazy-load |
| §9 PR discipline | 107 | yes |
| §10 DoR/DoD | 43 | yes |
| §11 Security baseline | 72 | yes |
| §12 Observability | 33 | yes |

§6 "Learned Lessons & Best Practices" is more than half the rulebook. That is exactly the
content a lookup table should route to on demand — a lesson about "Capacitor absolute base
paths" matters when you touch a Capacitor app's config, not while you're writing a Vitest spec
for a Vite app.

## The proposal

Split the rulebook into two layers, keeping the *full text* canonical:

1. **Always-on index (`.agents/AGENTS.md`, target <250 lines).** Keep every binding
   non-negotiable (§1–§5, §8–§12) in full or near-full, plus §6's *titles only* — one line per
   lesson that says what it is and links to where the full text now lives. The index stays the
   file `harness-learn.mjs`, `check-doc-claims.mjs`, and the portfolio-hub `loopStats` recompute
   parse — or those parsers get a pointed one-line change to follow the link.
2. **Lazy detail (path-scoped).** Move the §6 lesson prose into per-topic files — either
   `.agents/lessons/<id>.md` (a flat, mechanically-mapped set) or the repo's existing
   path-scoped channels: `projects/<app>/AGENTS.md` for app-specific lessons, `.agents/rules/`
   for harness rules. Agents see the full lesson only when they open the relevant app or file.

The enforced standard does **not** shrink. Every lesson stays; it just stops being free-floating
in every session's window. This is the same "pointer, not a duplicate" rule the repo already
states for itself in `_config/conventions.md` and `_config/voice.md`.

## Why this is safe to do (and where it could bite)

The hard constraint is that the harness *parses* `.agents/AGENTS.md`:

- `harness-learn.mjs` matches `[guardrail: <id>]` tags against `scripts/harness-status.mjs`.
  The tags must survive the split and stay in the file the parser reads.
- `check-doc-claims.mjs` verifies `**bold**` claims annotated with `<!-- doc-claim -->` in
  `README.md`, `AGENTS.md`, `.agents/AGENTS.md`, `CLAUDE.md`. Any moved bold claim must either
  stay, or the marker move with it and the file list be updated.
- `projects/portfolio-hub`'s `loopStats.generated.test.ts` recomputes `lessonCount` from
  `.agents/AGENTS.md`. Splitting §6 changes that count unless the recompute follows the split.

These are the acceptance criteria: after the split, `node scripts/harness-learn.mjs`,
`node scripts/check-doc-claims.mjs --gate`, `node scripts/harness-status.test.mjs`, and the
portfolio-hub Vitest suite must all pass unchanged in *spirit* (same lessons, same guardrails,
same counts — or a deliberate, documented count change).

## Rollout (if approved)

1. ~~Do §6 first, alone — it's the 55% and the only low-risk move (pure prose, no binding rules).~~ **Done.**
2. ~~Keep a compatibility shim: `.agents/AGENTS.md` §6 becomes an index of one-line lesson
   summaries + links; the full prose moves to `.agents/lessons/`.~~ **Done** — one line per lesson,
   title + optional `[guardrail: id]` tag + a link to `.agents/lessons/<slug>.md`.
3. ~~Re-run the four acceptance commands above; fix parser paths.~~ **Done** — no parser paths needed
   fixing: `harness-learn.mjs` and `loopStatsCompute.mjs` both already scanned §6 by line pattern
   (`[guardrail: id]` tag text, `^- \*\*` bullet count) rather than by prose length, so a one-line
   index entry that preserves the exact bold title and tag satisfies both unchanged.
4. Landed as its own PR (no rule changes, only relocation) — measured above. **Next step (§5/§8
   detail-splitting to hit the `<250 lines` whole-file target) is a separate, later decision**, not
   bundled into this one, per the sequencing this section always specified.

## Non-goals

- No rule is weakened, removed, or reworded to be shorter. Relocation only.
- No per-provider hack (no `#if claude`). The split stays tool-neutral; the `@`-imports and
  `.agents/rules/` adapters keep working because the canonical file keeps its path and its tags.
