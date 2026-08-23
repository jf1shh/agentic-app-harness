---
name: spec-review
description: "Compare a diff against the app's spec and report where the implementation diverges: missing or partial requirements, scope creep, requirements implemented but wrong, or a spec clause that is itself wrong. Advisory only — every finding quotes the spec line it's judged against."
argument-hint: "[--base <ref>] [--head <ref>] [--app <name>] [--pr <number>]"
---

# Spec Review

Read a diff and the spec it claims to implement side by side, and report where they disagree.
This is the one axis nothing else in the harness covers:

- `check-spec-ordering.mjs` senses whether a spec file *or* a test file was **touched** alongside
  a logic change — it cannot tell whether the code matches the spec, and says so in its own header.
- `validate-specs.ps1 -Strict` checks a spec **exists**, has a README, uses Zod, is BDD-formatted —
  a structural check, not a reading of the diff.
- `harness-status.mjs` senses spec **drift** as unchecked spec feature checkboxes — an
  author-maintained signal, not a comparison against the code.

So §1 — "spec is the single source of truth," the most load-bearing rule in the repo — is the one
rule with no check that actually reads the code next to the spec. `.agents/AGENTS.md` §6 has at
least three lessons that are exactly this failure slipping through: the facility-score weighted
mean (the spec criterion itself was wrong), the §11.9 "today's dollars" title (false for two of
the charts it governed), and the §11.10 hourly band (the spec's data clause required four things;
the shipped PR carried two — see the dry-run case below).

**Single axis, advisory only.** Some code-review setups run a Standards axis and a Spec axis as
two parallel sub-agents so neither pollutes the other's judgement. With only one axis here there
is nothing to isolate — this skill does the Spec axis and nothing else. It calls no script and
fails no build; it is prose for a human or agent to read, the same shape as `tasks/README.md`'s
"delegate exploration, not implementation" instruction. If Standards-axis review is wanted, that
is `/code-review`, run separately.

## Step 1: Resolve the app(s) in scope

Determine the changed files:
```
git diff --name-only $(git merge-base <base> <head>) <head>
```
(default `<base>` = `origin/master`, `<head>` = `HEAD`; if `--pr <number>` is given, use
`gh pr diff <number> --name-only` instead and read the PR body with `gh pr view <number> --json
body -q .body` for later context.)

Apply the same rule `scripts/test-app.mjs`'s `affectedApps()` uses for `--changed` (do not
re-derive a different one — if that function's rule ever changes, this step should follow it): a
path equal to, or under, `projects/<app>/` affects exactly that app; any other changed path (root
files, `specs/`, `scripts/`, an unknown directory) is repo-wide and puts every app in scope.

If `--app <name>` is given, review only that app regardless of what the diff touches (useful for
reviewing a spec change against the app's *existing* code, not just a fresh diff).

## Step 2: Read the spec — stop if there isn't one

For each app in scope, read `specs/<app>-spec.md`. If it does not exist, say so and stop for that
app: **"No spec available for `<app>` — nothing to compare against."** Do not invent a standard
from the code itself or from conventions in other apps' specs; a fabricated baseline is worse than
no review, because it sends the reader chasing a requirement nobody actually wrote down.

Read the spec in full, not just the section whose heading matches the changed files' directory —
a requirement's acceptance criteria are sometimes stated in a different section (data clauses,
BDD scenarios, a "Non-goals" list) than the paragraph naming the feature.

## Step 3: Read the diff

For each changed file in the app(s) in scope, read the actual diff content (`git diff
<merge-base> <head> -- <file>`), not just the file list. Component/page files (`.tsx`) and logic
modules alike — a spec requirement can be violated in either.

## Step 4: Sort every finding into one of four classes

Every finding must **quote the spec line or clause it is judged against** — a finding with no
quote is a defect in the review, not a legitimate "trust me" result.

1. **Missing or partial** — the spec states a requirement (a BDD scenario, a data clause, an
   acceptance criterion) that the diff does not implement, or implements only part of. Quote the
   requirement; name exactly what's absent — including the partial case, where a value exists but
   isn't the *one the spec asked for*. The §11.10 dry-run case below is this class: the spec
   required the new hourly-rate band to carry its own `FigureConfidence` tag and note; the diff
   gives the band the *row's* existing tag and note (for a different, already-published figure)
   instead of its own — present, but not what was specified.

2. **Scope creep** — the diff does something the spec never asked for. Quote the nearest spec
   section to show it's silent on this behavior (or, if the spec has an explicit "Out of scope"
   list covering it, quote that). Don't flag test files, fixtures, or the ordinary blast radius of
   an approved change (a new prop threading through a component that already existed) — this class
   is for genuinely new, unspecified behavior, the same distinction `scope-creep-detector`'s skill
   already draws for a PR's stated intent versus its actual diff. This skill's version compares
   against the *spec*, not the PR body; run both when you have both.

3. **Implemented but wrong** — the spec states a requirement and the diff implements *something*
   for it, but the implementation contradicts the spec's own words: a different formula, a
   different threshold, a different data shape than what's written. Quote the spec's version and
   describe the diff's version side by side.

4. **The spec clause itself is wrong** — the requirement, read literally, would produce a defect
   if implemented faithfully (a formula that doesn't match its own stated inputs, an acceptance
   criterion that contradicts an earlier section, units that don't reconcile). This is the class
   the source material this skill is adapted from does not have, and this repo needs it twice
   over in `.agents/AGENTS.md` §6: the facility-score weighted mean and the §11.9 title were both
   spec bugs, and a Spec review that can only say "the code diverges from the spec" pushes toward
   fixing the code when the spec is what's wrong. Flag it as exactly that — don't silently prefer
   either the code or the spec; say which reading you think is correct and why, and note that
   `.agents/AGENTS.md` §1/§2 requires stopping to flag a spec contradiction, not silently diverging
   from it in either direction.

## Step 5: Report

One block per app in scope. Findings grouped by class, each one:

```
### <finding class>
> "<the exact spec line or clause quoted>" — specs/<app>-spec.md §<n>

<file>:<line-range> — what the diff actually does, and how it diverges.
```

Close with: **"This is a Spec-axis review only — advisory, not a gate. It calls no script and
blocks nothing; a human decides what to do with these findings."** Never let this report be read
as a passed check, per `.agents/AGENTS.md` §9.1's "never self-certify verification" — this skill
finding zero divergences is not the same claim as `harness-status.mjs --gate` passing.

## Dependencies
- `git` (diff + merge-base)
- `gh` (only for `--pr <number>` — reading the PR's diff and body directly)

## Relationship to the harness
- `check-spec-ordering.mjs` (non-blocking sensor): did a spec or test file get **touched**
  alongside this logic change? This skill answers the question that sensor explicitly says it
  can't: does the code **match** what the spec says?
- `validate-specs.ps1 -Strict`: does the spec exist and follow the required structure?
- `harness-status.mjs`'s spec-drift sense: are there unchecked feature checkboxes in the spec?
- None of the three read the diff against the spec's content. This skill is the one that does,
  and it is advisory precisely because that comparison needs judgement no regex has — the same
  reasoning `.agents/AGENTS.md` §6 gives for every lesson in this repo tagged "not a guardrail."

## Verification — dry-run against a real historical divergence

Run this skill against `git show 368dcf5` (`feat(elder-care-planner): §11.10 NYT-style
interactive slider (#47)`, i.e. `--base 368dcf5^ --head 368dcf5 --app elder-care-planner`). The
spec's §11.10 data clause (`specs/elder-care-planner-spec.md`) requires the new hourly-rate band
to carry "low cents, high cents, a `FigureConfidence` tag matching the §6 Cite Confidence rule,
and a `note` naming the survey of origin" — four things, and — read against the §6 Cite Confidence
rule it names — the confidence tag and note are the band's *own*, not borrowed from the figure it
was derived from.

The PR's actual diff to `src/lib/data/costOfCare.ts` adds `lowHourlyCents: 3000` /
`highHourlyCents: 4000` directly onto the *existing* `in_home_homemaker`/`in_home_health_aide`
rows — rows that already carry `confidence: 'verified'` and a `note` describing the **published
point rate** ("Published as the merged 'non-medical caregiver' rate: $35/hr..."). The band gets no
tag or note of its own; it silently inherits the row's, so a spread the survey never published
reads as a "published, verified" figure. A correct run of this skill reports a **Missing or
partial** finding for the band's confidence tag and note specifically (not "the fields are
literally absent" — `confidence`/`note` are present on the row, just not distinct from it), quoting
the spec clause above and naming the two rows where the same `'verified'`/point-rate note now
covers a spread it wasn't written to cover. If it reports something looser than that — "the band
seems fine" or "confidence and note exist so this is satisfied" — the skill is wrong and needs
revising before anyone relies on it. Confirmed against the actual fix, PR #67 (`33468cb`): it adds
dedicated `hourlyBandConfidence: 'derived'` and `hourlyBandNote` fields, explicitly leaving the
row-level `'verified'` tag "on `medianHourlyCents`, where it belongs" — the same distinction this
skill's finding needs to draw. See also `.agents/AGENTS.md` §6's "A Containment Assertion Is Not a
Coverage Assertion" lesson, which documents the same incident from the fix's side.
