# Plan — adopt external agent-tooling patterns into the harness

> **Status: proposal. Nothing in this document has been implemented.** It exists to get
> approval before any change, per `.agents/AGENTS.md` §1/§2 — every item below adds or
> changes agent-instruction surface or a harness gate, which is a spec change, not an
> edit to make on the fly. Same posture as [`SLIM_RULEBOOK_PROPOSAL.md`](SLIM_RULEBOOK_PROPOSAL.md)
> and [`PERFORMANCE_BACKLOG.md`](PERFORMANCE_BACKLOG.md).
>
> Baseline commit for every measurement below: `bebc968`.

## Method — and what "examined" honestly means here

Five repositories were reviewed as candidate sources of reusable patterns:

| Repo | Depth of read |
|---|---|
| `mattpocock/skills` | README in full, plus `diagnosing-bugs/SKILL.md` and `code-review/SKILL.md` in full |
| `santifer/career-ops` | README only |
| `akitaonrails/ai-memory` | README + `hooks/` directory listing |
| `mukul975/Anthropic-Cybersecurity-Skills` | README only (817 skills; none read individually) |
| `public-apis/public-apis` | README + `scripts/` directory listing |

Stated plainly because §9.1 applies to plans as much as to PR bodies: the two skill bodies
were read; **the other repos' contents were not**. Every recommendation below that depends on
unread content is marked as needing verification before implementation. Two skill bodies I
tried and failed to retrieve (`writing-for-agents`, `handoff`) are therefore **not** the basis
of any work item here.

## The gap, measured

The harness is deterministic and LLM-free by design — sense, propose, verify, learn are all
scripts, and that is the repo's central claim. The measurements below are the *actuator* side,
which is the half these repos speak to:

| Thing | Count | How it was counted |
|---|---|---|
| Harness scripts (`scripts/*.mjs`) | 48 | `ls scripts/*.mjs \| wc -l` |
| Non-test check scripts | 11 | `ls scripts/check-*.mjs \| grep -v test \| wc -l` |
| Blocking guardrails | 7 | `node scripts/count-guardrails.mjs` |
| §6 lesson bullets | 53 | `node scripts/check-loop-stats.mjs` — its canonical recompute; an independent `awk`/`grep -c` over §6 agreed |
| `.agents/AGENTS.md` | 1217 lines | `wc -l` |
| `SKILL.md` files, all locations | 4 | 3 under `.claude/skills/`, 1 under `.agents/skills/` |
| `.claude/commands/` | does not exist | `ls` |

Three of the four skills are the ICM navigation set (`icm-scaffold`, `icm-sync`,
`icm-context-scaffold`); the fourth is a pointer file. **No skill in this repo encodes a
harness discipline.** Meanwhile §7 mandates an "Execute Learning Loop (`/learn`)" step that
has no implementation anywhere in the tree, and §5/§9's Red→Green→Prove discipline exists only
as prose an agent has to remember mid-task.

That asymmetry — 48 scripts of sensing against 0 skills of doing — is what these repos are
useful for. It is also why most of what they offer should be **rejected**: this repo does not
need another proposal pipeline, it needs the four or five disciplines it already documents to
become invocable.

## Verdict per repo

| Repo | Verdict | Taken | Rejected |
|---|---|---|---|
| `mattpocock/skills` | **Adopt, adapted** | `diagnosing-bugs` method; `code-review`'s Spec axis; the user-invoked/model-invoked convention | `grill-me`, `to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement` |
| `akitaonrails/ai-memory` | **Idea only** | Lifecycle hooks as the delivery mechanism for tools nobody runs by hand; forced session closure | The Rust/SQLite/embeddings system entirely |
| `public-apis/public-apis` | **One narrow idea** | `scripts/validate/links.py`'s shape: link + duplicate validation with unit tests | The API list itself |
| `mukul975/Anthropic-Cybersecurity-Skills` | **Reject, with one deferred lead** | (nothing in this plan) | 817 skills across 29 domains |
| `santifer/career-ops` | **Reject** | (nothing in this plan) | Go/Bubble Tea dashboard, batch orchestration, PDF pipeline |

Reasoning for the two outright rejections is in [Deliberately rejected](#deliberately-rejected).

---

## WI-1 — `diagnosing-bugs` skill

**Source:** `mattpocock/skills`, `skills/engineering/diagnosing-bugs/SKILL.md` (read in full).

### Why

§6 is a graveyard of hard bugs, each recorded as an *outcome* with no encoding of the *method*
that found it. Three of them were found by exactly the discipline this skill describes:

- the `<select>` / `table-layout: fixed` overflow bug — found by binary-searching the DOM with
  `element.remove()` in `page.evaluate` and watching `scrollWidth` drop, after reading the CSS
  failed;
- the dnd-kit auto-scroll bug — found with a throwaway debug spec logging `targetBox` before and
  after the drag and `document.elementFromPoint` at the drop coordinate;
- the base64 tamper test — where the mutation step caught a defect **in the test itself**, not
  in the code under test.

Each lesson says, in its own words, that the diagnosis cost a full cycle because the loop was
built late. The skill's Phase 1 is precisely that rule: *build a tight, red-capable feedback
loop before hypothesising; if you are reading code to build a theory before that command
exists, stop.*

### What

`.claude/skills/diagnosing-bugs/SKILL.md`, model-invoked, adapted to this repo rather than
copied. Six phases, retained: feedback loop → reproduce + minimise → 3–5 ranked falsifiable
hypotheses → instrument → fix + regression test → cleanup.

### Design — the repo-specific adaptations

1. **Phase 1's loop menu is rewritten in this repo's vocabulary.** Generic entries ("curl a dev
   server") are replaced by what actually exists here, in preference order: a single Vitest case
   (`npx vitest run path/to.test.ts`), a single Playwright spec
   (`npx playwright test e2e/x.spec.ts --project=chromium`), the DOM-bisection recipe from the
   overflow lesson, `page.addInitScript` for seeding storage before first navigation (the
   debounced-autosave lesson explicitly requires this), and `node scripts/test-app.mjs <App>
   --skip-e2e` as the widest fast loop.
2. **Phase 5 folds in §5's Prove step**, which is stronger than the source's version: the source
   says write the regression test first *if a correct seam exists*; §5 additionally requires
   breaking the implementation once, watching the test go red, restoring it, and stating the
   mutation in the PR body. Both survive; §5 governs where they overlap.
3. **The source's "Redact" section is kept as-is.** It is a good fit for a repo whose §11 gate
   scans added lines for credentials.
4. **Three §6 traps are named as explicit checks in Phase 2**, because each one makes a loop
   report the wrong thing: a Playwright `fill()` before hydration is swallowed silently; a flat
   SVG series has no bounding box and reads as hidden; a `waitFor`-style helper that returns on
   *any* save races the entity that makes the baseline meaningful.
5. **The source's `scripts/hitl-loop.template.sh` is dropped.** It is a human-in-the-loop bash
   driver for cases where a person must click; this repo's suites are fully automatable and
   adding it would import an unused file.

### Acceptance criteria

- [ ] The skill never claims a loop was run without an invocation and its output (§9.1).
- [ ] Phase 1 names at least four loop constructions that work in *this* repo, each with a
      literal runnable command.
- [ ] Phase 5 states §5's mutation requirement verbatim, not a paraphrase.
- [ ] Dry-run on a *reproduced* §6 bug: re-create the dnd-kit viewport-height failure on a
      scratch branch, run the skill, confirm it reaches the same diagnosis. If it does not, the
      skill is wrong and gets revised before merge — a skill that cannot re-find a bug the repo
      has already solved is not evidence of anything.

### Gate interactions

`.claude/skills/**` is **not** in `CONTAINED_PATHS` (see WI-6), so the containment gate stays
silent. No script, workflow, or instruction file changes. `check-diff-size` warns above 400
lines; a single SKILL.md should land well under that.

### Risk

Low. It is additive, Claude-Code-only, and blocks nothing. The realistic failure is that it is
too long to be read mid-task — mitigated by keeping phases scannable and the loop menu
tabular.

**Effort:** S–M (one file, ~200–280 lines, plus the dry-run).

---

## WI-2 — `spec-review` skill (the Spec axis only)

**Source:** `mattpocock/skills`, `skills/engineering/code-review/SKILL.md` (read in full).

### Why

The source runs two parallel sub-agent reviews — **Standards** (does it follow documented
conventions?) and **Spec** (does it implement what the originating spec asked for?) — and
deliberately never merges or re-ranks the two, because one axis passing masks the other
failing.

Claude Code already ships a `/code-review`. What it does not have, and what nothing in this
repo has, is the **Spec axis**. That is the gap:

- `check-spec-ordering.mjs` senses whether a spec file *or* a test file was **touched**
  alongside a logic change. Its own header says so: it "doesn't prove the spec was read (that's
  unprovable)". It cannot tell whether the code matches the spec.
- `validate-specs.ps1 -Strict` checks a spec **exists**, has a README, uses Zod, is BDD-formatted.
- `harness-status.mjs` senses *drift* as unchecked spec feature checkboxes — an author-maintained
  signal, not a reading of the diff.

So §1 — "spec is the single source of truth", the most load-bearing rule in the repo — is the
one rule with no check that looks at the code. §6 contains at least three lessons that are
exactly this failure: the facility-score weighted mean (spec criterion itself wrong,
implementing it faithfully would have shipped an untrue test), the §11.9 "today's dollars"
title (false for two of the charts it governed), and the §11.10 hourly band that shipped two of
the four things the spec's data clause required.

### What

`.claude/skills/spec-review/SKILL.md`, user-invoked, single-axis. Given a base ref, it resolves
the app(s) from the diff, reads `specs/<app>-spec.md`, and reports three finding classes from
the source's brief: requirements missing or partial; behaviour present that the spec did not
ask for (scope creep); requirements implemented but implemented wrongly. Each finding quotes
the spec line.

### Design

1. **Single axis, no sub-agents.** The source spawns two parallel sub-agents so the axes cannot
   pollute each other's context. With only one axis there is nothing to isolate, and this repo's
   own `tasks/README.md` says to delegate *exploration*, not implementation. One agent, one axis.
2. **App resolution reuses existing logic.** `scripts/test-app.mjs` already maps a diff to
   affected apps (`--changed`, self-tested by `test-app.test.mjs`). The skill calls that mapping
   rather than re-deriving it, per §6's "one definition, consumed twice".
3. **A fourth finding class this repo needs and the source lacks:** *the spec clause itself is
   wrong*. §6 requires correcting the criterion in the spec, in writing, before building against
   it — twice over (weighted mean, and the two-bases chart labels). A Spec review that can only
   say "the code diverges from the spec" would push an agent toward the wrong fix in exactly the
   cases that cost the most.
4. **Output is advisory prose, not a gate.** It calls no script and fails no build.

### Acceptance criteria

- [ ] Every finding quotes the spec line it is judged against; a finding with no quote is a
      defect in the skill.
- [ ] The skill reports "no spec available" and stops rather than inventing a standard, matching
      the source's behaviour.
- [ ] Dry-run against the merge commit of a §6-documented spec failure (the §11.10 hourly-band
      PR is the cleanest: the spec required four things, the PR shipped two). If the review does
      not surface the two missing elements, it is revised before merge.
- [ ] It states in its own text that it is advisory, so nothing reads it as a passed gate (§9.1).

### Gate interactions

None. Additive file under `.claude/skills/`.

### Risk

Medium — this is the item most able to be confidently wrong. A Spec review that hallucinates a
requirement is worse than none, because it sends an agent to change working code. The dry-run
acceptance criterion is the mitigation and should not be waived.

**Effort:** M (one file, ~150–220 lines, plus a dry-run against a real historical PR).

---

## WI-3 — `scripts/check-doc-links.mjs` (offline), non-blocking sensor

**Source:** `public-apis/public-apis`, `scripts/validate/links.py` (directory listing + README
description; the script itself was **not** read — only its documented behaviour: format
validation, link validation, duplicate detection, each with unit tests).

### Why — this one is measured, not hypothesised

A scan of every tracked markdown file at `bebc968`:

| Measure | Count |
|---|---|
| Tracked `*.md` files | 69 |
| Markdown link instances | 65 |
| Relative (non-`http`, non-anchor) | 44 |
| External `http(s)` | 21 |
| **Currently broken relative links** | **2** |

Both broken links are on **line 85 of `.agents/AGENTS.md`** — the §6 bullet that instructs every
agent to re-read the rules. It links to `../../AGENTS.md` and `../../.agents/AGENTS.md`. From a
file at depth 1, `../../` escapes the repo root; both 404 on GitHub. The correct targets are
`../AGENTS.md` and the file itself.

The likely origin is a copy-paste from `.agents/skills/sdd-harness-guide/SKILL.md`, which sits
two levels deeper and where `../../AGENTS.md` is **correct**. That is the exact class of defect a
depth-aware resolver catches and a human reading either file in isolation does not.

So: the surface is small (65 links), and the defect rate on it is not zero, and the defects are
in the highest-traffic file in the repo.

### What

`scripts/check-doc-links.mjs` + `scripts/check-doc-links.test.mjs`. Zero-dependency Node ESM,
matching the 11 existing `check-*.mjs` scripts.

### Design

1. **Offline only in this work item.** Resolve every relative link against the filesystem,
   relative to the linking file's own directory. Report unresolvable targets and duplicate link
   definitions. **No network.** §6's live-third-party-API lesson is unambiguous: a check that
   depends on someone else's uptime outsources the build status. An opt-in `--live` flag for the
   21 external URLs is explicitly **out of scope here** and belongs in a later, separate proposal
   if wanted at all.
2. **Anchors: resolve the file half, ignore the fragment.** `foo.md#section` checks `foo.md`
   exists. Validating heading anchors is a second feature with its own false-positive surface;
   not now.
3. **Directory links resolve as directories.** `.agents/rules/` is a real, intentional link form
   in `README.md`.
4. **Non-blocking sensor first, per §8.** It starts with a backlog of 2, which is not zero, and
   §8 is explicit: *gate a check when it describes a regression, not while it still describes
   history*. Wired as `continue-on-error: true` in `sdd-sentinel.yml` alongside the three
   existing sensors.
5. **Promotion path, stated up front:** fix the two links in a separate PR; then, once
   `harness-history.mjs` shows a zero-hit streak, promote to blocking — the same arc
   `senseUnitTests` took.
6. **File-shaped, not diff-shaped.** Like `check-loop-stats.mjs` and `check-peer-consistency.mjs`,
   it reads the tree as it stands. A broken link is broken whether or not this PR touched it.
7. **Not a `GUARDRAILS` entry.** `test(line)` cannot express "does this path resolve on disk" —
   the same reason `check-enum-blast-radius.mjs` and `check-doc-claims.mjs` are workflow steps.
   §8's blocking-guardrails-vs-sensors section governs.

### Acceptance criteria

- [ ] `node scripts/check-doc-links.test.mjs` passes, with fixtures covering: a resolving
      relative link, a broken one, a link with an anchor, a directory link, an external URL
      (skipped), and a duplicate.
- [ ] Run against the live tree it reports **exactly the two known-broken links** and nothing
      else. More than two means false positives to fix before merge; fewer means the resolver is
      not working.
- [ ] Exits 0 always in this work item. It is a sensor.
- [ ] A `sdd-sentinel.yml` step with `continue-on-error: true`, plus its self-test step, matching
      the existing sensor pattern.

### Gate interactions

Touches `scripts/*.mjs` and `.github/workflows/*.yml` — **both are in `CONTAINED_PATHS`**, so the
implementing PR must name both files in its body or use `[containment-override: path]`.
`check-guardrail-integrity.mjs` treats a pure net addition of a new check as sanctioned and stays
silent.

### Risk

Low–medium. The risk is false positives on link forms not anticipated (bare reference-style
links, links inside fenced code blocks). The "exactly two findings" acceptance criterion is the
control. Fenced code blocks must be skipped — several docs quote link syntax as an example.

**Effort:** M (two files, ~180 + ~120 lines, plus one workflow step).

---

## WI-4 — `SessionStart` hook wiring `generate-context-digest.mjs`

**Source:** `akitaonrails/ai-memory` — the *idea* of agent lifecycle hooks as the delivery
mechanism for continuity tooling. None of its implementation.

### Why

`scripts/generate-context-digest.mjs` already exists, is self-tested, and is documented in
CLAUDE.md and §8 with an explicit two-step usage: run it at session start to establish a
baseline, run `--diff` before pushing to see what moved. It is advisory-only — no CI step, no
gate — which is correct, and which also means it almost certainly never runs, because nothing
invokes it and no gate misses it.

This repo already solved the same problem once, for a different tool: `.claude/hooks/verify-scripts.mjs`
is a `PostToolUse` hook that runs a harness script's self-test the moment an agent edits it,
with a header explaining the posture — non-blocking, opt-in, Claude-Code-only, deliberately
outside CI. WI-4 is that pattern applied a second time, to a tool the repo already has.

### What

`.claude/hooks/session-start-digest.mjs`, registered as a `SessionStart` hook in
`.claude/settings.json` (which already carries a `hooks` block).

### Design

1. **Runs `generate-context-digest.mjs`, prints a one-line baseline, exits 0 unconditionally.**
2. **If a `.context-digest.json` already exists from a prior session, run `--diff` first** and
   surface changed apps before overwriting. That is the case the digest exists for — a
   concurrent merge moving a spec between the read and the push.
3. **Silent on success beyond one line.** A session-start hook that prints a wall of text taxes
   every session, which is the §6 rulebook-bloat concern in a different costume.
4. **Header comment matching `verify-scripts.mjs`'s** — what it does, why it is not a gate, why
   it is Claude-Code-only.
5. **`.context-digest.json` is already gitignored** — confirm before merge, do not assume.

### Acceptance criteria

- [ ] A fresh session prints one baseline line; a second session prints the `--diff` summary.
- [ ] Exits 0 on every path, including when `generate-context-digest.mjs` throws.
- [ ] Adds nothing to CI and blocks nothing.
- [ ] `.gitignore` genuinely covers `.context-digest.json` (verified, not assumed).

### Gate interactions

`.claude/hooks/**` and `.claude/settings.json` are **not** in `CONTAINED_PATHS` — see WI-6, which
argues that is a gap this work item widens.

### Risk

Low, with one caveat worth stating: a `SessionStart` hook runs on *every* session, so a slow or
noisy implementation is a tax paid every time. Keep it to one digest invocation.

**Effort:** S (one file ~70 lines, one settings block).

---

## WI-5 — `wrap-up` skill implementing §7

**Source:** `akitaonrails/ai-memory`'s `finalize-session` — the idea of a *forced closure step*.
None of its implementation.

### Why

§7 mandates four things at the end of every session: update READMEs and `.md` docs, create or
update `HANDOFF.md`, execute the learning loop (`/learn`), and prefer guardrails over prose. Of
those:

- `/learn` **does not exist** as a skill or command anywhere in the repo.
- `HANDOFF.md` is currently a single audit narrative pinned to branch
  `claude/full-app-audit-q9266h`, three merges stale as of `bebc968` — the mandate has already
  drifted in exactly the way §6's "A Promised Follow-Up Is a Debt" lesson predicts.
- The `loopStats` regeneration step is the one part now machine-checked, and only because
  PR #217 skipped it and reddened an unrelated app's CI leg, prompting `check-loop-stats.mjs`.

So one of four steps is enforced, one is documented but unimplemented, and one has visibly
rotted. That is a checklist problem, and a skill is the right shape for a checklist.

### What

`.claude/skills/wrap-up/SKILL.md`, user-invoked. Walks the §7 obligations in order, each with
the literal command:

1. `node scripts/harness-status.mjs --strict` — what does the sense loop see now?
2. Did a §6 lesson change? → `cd projects/portfolio-hub && npm run generate:loop-stats`, then
   `node scripts/check-loop-stats.mjs`.
3. Did a guardrail change? → `node scripts/harness-learn.mjs` and
   `node scripts/harness-status.test.mjs`.
4. `node scripts/harness-history.mjs --record` and commit `harness-history.json`.
5. `node scripts/generate-context-digest.mjs --diff` — did the tree move under this session?
6. README / spec / `HANDOFF.md` refresh, with the §6 rule attached: **any count named in a doc
   or PR body must be produced by running the count in this session**, never recalled.
7. The §8 lesson-adding protocol, if a lesson was learned: mechanical → guardrail + self-test +
   tagged bullet; non-mechanical → prose bullet, no tag.

### Design

1. **It is a checklist over existing commands.** It adds no new script and no new gate. Every
   step already exists; the skill is the ordering.
2. **`HANDOFF.md` gets a stated shape** — branch, why, what changed, what was verified and how,
   what is open, exact next steps — so it stops being a one-off narrative.
3. **It does not name itself `/learn`.** §7 refers to `/learn`; whether to claim that exact name
   is an open question below, because renaming a mandate in the rulebook is a §1 spec change.
4. **It must not assert a step passed without its output** (§9.1) — the skill instructs pasting,
   not summarising.

### Acceptance criteria

- [ ] Every step names a literal command that exists at `bebc968`.
- [ ] Dry-run: run it at the end of the WI-3 implementation session and confirm each step is
      executable in order with no missing prerequisite.
- [ ] It does not duplicate rulebook prose; it links to the section (`_config/conventions.md`
      already forbids a second copy that drifts).

### Gate interactions

None (additive under `.claude/skills/`, modulo WI-6).

### Risk

Low mechanically. The real risk is the §6 debt lesson applied to this plan itself: a wrap-up
skill nothing invokes is the same unkept promise. Mitigation is WI-4's precedent — if this
proves valuable, a `Stop` hook could surface it, but that is deliberately **not** proposed here.

**Effort:** S–M (one file, ~120–180 lines).

---

## WI-6 — extend `CONTAINED_PATHS` to the agent-instruction surface

**Source:** none — this is a gap found while checking WI-1 through WI-5 against the gates.

### Why

`check-containment.mjs` exists so an agent cannot quietly change the machinery that governs
agents. Its watch list at `bebc968` is exactly seven patterns:

```
scripts/*.mjs · .agents/AGENTS.md · AGENTS.md · CLAUDE.md
.github/workflows/*.yml · .githooks/* · specs/templates/*
```

`check-instruction-tamper.mjs` watches a narrower three: `.agents/AGENTS.md`, `AGENTS.md`,
`CLAUDE.md`.

Neither covers `.claude/skills/**`, `.agents/skills/**`, `.claude/hooks/**`, or
`.claude/settings.json`. Today that blind spot is small — 4 skill files and 1 hook. **This plan
would roughly double it**, and every file it adds is instruction-shaped: text that changes how an
agent behaves, in a repo whose entire premise is that such text is enforced rather than trusted.

`.claude/settings.json` is the sharpest case: it carries a `permissions.deny` list (`.env`,
`*.pem`, `keystore.properties`, `credentials.json`) that the containment gate cannot see being
edited.

### What

Add to `CONTAINED_PATHS`:

```
.claude/skills/*/SKILL.md · .agents/skills/*/SKILL.md
.claude/hooks/*          · .claude/settings.json
```

Plus the matching cases in `check-containment.test.mjs`.

### Design

1. **Containment only, not tamper.** `check-instruction-tamper.mjs`'s heuristics
   (removed MUST/NEVER, `--no-verify`, `continue-on-error: true`) are tuned to the rulebook's
   prose and CI YAML; running them over skill files needs its own false-positive study and is not
   proposed here.
2. **The matcher does not support a middle-segment `*` — verified, not assumed.** Run against
   the real `matchesContainment` at `bebc968`:

   | File | Pattern | Result |
   |---|---|---|
   | `.claude/skills/diagnosing-bugs/SKILL.md` | `.claude/skills/*/SKILL.md` | **`false`** |
   | `.claude/hooks/session-start-digest.mjs` | `.claude/hooks/*` | `true` |
   | `.claude/settings.json` | `.claude/settings.json` | `true` |

   The function splits the pattern on its **last** `/` and requires `fileDir === dir` exactly, so
   `.claude/skills/*` never equals `.claude/skills/diagnosing-bugs`. Two of the three proposed
   patterns work as-is; the skills one does not.

   Worth noting separately: the function's own header comment says patterns use "a minimal glob:
   `*` matches any single path segment" — which overstates what the body does. It supports
   `dir/*.ext` and exact paths only. That comment should be corrected in the same PR.

   **Resolution to pick at implementation time**, both acceptable:
   (a) extend `matchesContainment` to handle one middle-segment `*`, with self-test cases
       including a negative; or
   (b) skip the glob and rely on the fact that skills live one directory deep — but note this
       needs a real pattern form the matcher supports, so (a) is the honest option unless the
       skills directory is flattened. Recommend (a).
3. **Sequencing:** land WI-6 **first**, so WI-1/2/4/5 arrive already covered. Landing it last
   would mean the gate's first act is to flag files this same plan added.

### Acceptance criteria

- [ ] `node scripts/check-containment.test.mjs` passes with new cases for each added pattern,
      including at least one negative (a path that must **not** match).
- [ ] Editing a `SKILL.md` without naming it in the PR body fails the containment gate; naming it
      passes.
- [ ] `matchesContainment` handles `.claude/skills/*/SKILL.md` (it does **not** at `bebc968` —
      see point 2), with a self-test case proving it, and the misleading header comment about
      "any single path segment" is corrected in the same PR.
- [ ] `check-guardrail-integrity.mjs` stays silent (this widens a gate, it does not weaken one) —
      confirmed by running it, not assumed.

### Gate interactions

Touches `scripts/*.mjs` (twice) — must be named in the PR body for the containment gate, which is
the gate being edited. That is intentional and is the point.

### Risk

Low–medium. Widening a blocking gate reddens PRs that would previously have passed. Mitigation:
the escape hatch already exists and is documented (name the file, or
`[containment-override: path]`), and the surface is 5 files today.

**Effort:** S (one pattern list, one test file).

---

## Sequencing

```
WI-6  extend containment          ← first: covers everything the rest adds
  ├── WI-1  diagnosing-bugs skill      (independent)
  ├── WI-2  spec-review skill          (independent)
  ├── WI-4  SessionStart hook          (independent)
  └── WI-5  wrap-up skill              (best written after WI-3 exists, so its
                                        checklist can reference a real run)
WI-3  check-doc-links sensor      ← independent of all of the above
```

Only two ordering constraints are real: WI-6 before the rest, and WI-5 after WI-3. Everything
else can land in any order or in parallel.

Suggested PR grouping, sized against `check-diff-size.mjs` (warn 400, block 800):

| PR | Contents | Est. changed lines |
|---|---|---|
| 1 | WI-6 | ~80 |
| 2 | WI-1 + WI-2 | ~450 (warns; no `[large-diff-acknowledged]` needed) |
| 3 | WI-3 | ~320 |
| 4 | WI-4 + WI-5 | ~260 |

Each is independently revertible. Per §6's independent-branch lesson, each branches from
`master` and whichever lands second resolves its own conflict **in that session** — this plan
does not promise a later fix-up pass.

## Deliberately rejected

**`mattpocock/skills`' proposal pipeline** (`grill-me`, `to-spec`, `to-tickets`, `triage`,
`wayfinder`, `implement`). This repo already has `emit-tasks.mjs`, the `tasks/README.md`
work-order contract, and `specs/templates/` — deterministic, self-tested, and the explicit
subject of the repo's central claim that "the harness writes the agent's task for it, with no
LLM in the loop". Replacing that with an interview-driven pipeline trades a gate for a
suggestion. The `improve-codebase-architecture` skill is the closest call and is still rejected:
its output is an HTML survey, and this repo's survey is `harness-status.mjs --strict`.

**`akitaonrails/ai-memory` as a system.** A Rust workspace with SQLite FTS5, embeddings, a
`models/` directory, and per-agent lifecycle hooks. Adopting it contradicts the harness's own
stated contract — "zero-dependency Node ESM… you do not need PowerShell for any gate" — and adds
a compiled binary to a repo whose containment gate exists to keep infrastructure changes visible.
Its good idea (hooks as a delivery mechanism) is WI-4 and costs ~70 lines.

**`mukul975/Anthropic-Cybersecurity-Skills` in full.** 817 skills across 29 domains, mapped to
ATT&CK / NIST CSF / D3FEND. §11 already argues, correctly, that generic web-app security
checklists mostly do not apply here: no backend this repo owns, three apps making zero runtime
network calls, and a security baseline written specifically against what these apps are.
Installing 817 third-party instruction files into a repo whose containment gate exists to make
instruction changes visible is a supply-chain decision, not a convenience.

*One lead is deferred rather than rejected:* the AI Security domain (14 skills — LLM red-teaming,
prompt-injection detection) is the one domain with a real match, for one purpose —
`check-instruction-tamper.mjs` senses rule-weakening and gate-bypass with a hand-rolled pattern
set, in a repo where the instruction files *are* the control plane. Any pattern borrowed must
arrive with a known-bad and known-good case in the self-test, per §8. Needs the skills actually
read first; none were.

**`santifer/career-ops`.** Wrong domain (job-search pipeline), and its stack — Go/Bubble Tea TUI,
Playwright PDF rendering, TSV batch orchestration — is weight with no counterpart here. Its one
transferable idea is a dashboard over pipeline state, and this repo's natural home for that is
`portfolio-hub`, which already consumes generated loop stats. Not proposed; noted.

**`public-apis`' actual API list.** Browsing it for endpoints to wire in runs against §11 (adding
or widening a network call is a spec change to that app's spec) and against §6's
live-third-party-API lesson. Only the validator's *shape* is taken, in WI-3.

## Gate interactions for the implementing PRs — summary

| Gate | Fires on | Which WI | Handling |
|---|---|---|---|
| `check-containment` | `scripts/*.mjs`, `.github/workflows/*.yml` | WI-3, WI-6 | Name each file in the PR body |
| `check-diff-size` | >400 warn, >800 block | PR 2 (~450) | Warns only; no marker needed |
| `check-guardrail-integrity` | gate logic edits | WI-3, WI-6 | Net additions are sanctioned; verify by running |
| `check-readme-freshness` | source change without README | all | Update `README.md`'s harness section, or `[readme-unchanged: reason]` |
| `check-spec-ordering` | `projects/*/src` logic changes | none | Not applicable — no app source changes |
| `check-doc-claims --gate` | `<!-- doc-claim -->` markers | none | Defaults are README/AGENTS/.agents-AGENTS/CLAUDE only |
| `check-instruction-tamper` | `.agents/AGENTS.md`, `AGENTS.md`, `CLAUDE.md` | none | This plan changes no instruction file |
| `harness-learn` | guardrail⇄lesson traceability | none | No `GUARDRAILS` entries added |

Note the last two rows: **this plan adds no guardrail and edits no rulebook section.** WI-3 adds
a sensor, not a guardrail, for the reason §8 gives — `test(line)` cannot express filesystem
resolution.

## Open questions for a human

1. **Does WI-5 claim the name `/learn`?** §7 names it. Implementing it under a different name
   leaves the rulebook pointing at nothing; claiming it means the rulebook's §7 text should be
   updated to match — a §1 spec change needing approval, not an edit to make on the fly.
2. **Do WI-1 and WI-2 belong in `.claude/skills/` or `.agents/skills/`?** The repo currently uses
   both, with no documented rule for which. `.agents/` is the cross-tool standard the root
   `AGENTS.md` advertises; `.claude/` is Claude-only, like the existing hook. My recommendation:
   `.claude/skills/`, matching `verify-scripts.mjs`'s stated Claude-Code-only posture, and add
   the convention to `_config/conventions.md` so the next agent is not guessing.
3. **Is WI-3 worth it at 65 links?** It found 2 real defects in the rulebook, which is the
   argument for; the surface is genuinely small, which is the argument against. Reasonable to
   fix the two links by hand and skip the script.
4. **Adopt the user-invoked / model-invoked convention now?** The source's rule — a user-invoked
   skill may delegate to a model-invoked one, never to another user-invoked one — is cheap while
   there are 4 skills and expensive at 20. `icm-sync` already sets `user_invocable: true`, so
   half the convention exists undocumented.

## Provenance and licensing — unresolved

**No licence was checked on any of the five repositories.** WI-1 and WI-2 adapt structure and
method from `mattpocock/skills`; WI-3 takes only a validator's shape from `public-apis`
(MIT per its README, unverified). Before any of WI-1/WI-2/WI-3 merges:

- [ ] Read the licence of `mattpocock/skills` and confirm adaptation-with-attribution is permitted.
- [ ] Confirm `public-apis`' MIT licence covers the (shape-only) borrowing.
- [ ] Add a source attribution line to each adapted skill's header naming the upstream repo and
      the commit read, so the provenance is in the file rather than in this plan.
