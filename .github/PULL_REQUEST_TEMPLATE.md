# Spec-Driven Pull Request

## 📌 Summary
Provide a clear description of the feature, fix, or enhancement introduced in this PR.

## ✅ Verification — paste output, do not self-certify

**Do not describe verification you ran. Paste what the command printed.**

This section used to be a checkbox reading "Passed the harness suite." PR #41 ticked it, and
included a section headed "Verification (CI-clean)" reporting 0 blocking findings — while CI was
red on that commit with a failing type-check and a dead E2E stage. Only `npx vitest run` had
actually been run. A confident false claim is worse than no claim: it invites a rubber-stamp
merge, and it costs the reviewer the time it takes to discover the body cannot be trusted.

Paste the final summary block of:

```
node scripts/test-app.mjs <AppName>
```

<details>
<summary>Harness output</summary>

```
(paste the last ~12 lines here — the PASS/FAIL summary block, verbatim, including any FAIL)
```

</details>

If the suite does not pass, say so here and explain why the PR is open anyway. **A red suite
honestly reported is fine. A green suite claimed but not run is not.** Where you could not run it
at all, write "not run" and the reason — CI is then the only record, and reviewers will read it
that way.

## 📋 Spec-Driven Development (SDD) Compliance Checklist
- [ ] **Specification Verified**: Changes correspond to an existing specification in `specs/` (or a spec update was included in this PR).
- [ ] **Contract-First Schema Validation**: All data model changes are defined using runtime Zod schemas (`zod`) with inferred TypeScript types (`z.infer<typeof Schema>`).
- [ ] **BDD Test Standard**: New unit and E2E tests follow `Given [Context] -> When [User Action] -> Then [Expected Outcome]` scenario formatting.
- [ ] **Accessibility (a11y)**: Zero WCAG 2.0 AA violations detected via `@axe-core/playwright`.
- [ ] **Documentation**: Updated project `README.md` and `HANDOFF.md` to reflect latest feature state.

## 🎯 Blast radius — required when a type gained a member

Skip this section only if no union, `z.enum`, or exported type gained a member.

Adding one member to `CareTypeSchema` in PR #41 broke a `Record<CareType, string>` (failing
type-check and taking the whole E2E stage down with the build), crashed the methodology panel at
runtime, and silently exposed an unpriced option in a dropdown. The type had **7 consumers; the PR
opened 2**, and three of the five it skipped were where the failures lived.

For each type you widened, run:

```
grep -rln "<TypeName>" projects/<app>/src/
```

List every file it returns, and for each say how it handles the new member or why it needs no
change. A `Record<Type, …>`, a `switch`, or an `Object.keys()` over that type is a mandatory edit.

| File | Handles the new member how? |
|---|---|
| | |

## 🧪 Proof the new tests can fail

For each behaviour this PR claims to protect, break the code and confirm the test goes red. State
the mutation and the result. A test that passes against broken code is worse than no test — PR #41
shipped one that was tautologically true and described it as a regression tripwire.

- Mutation: … → Result: …

## Anything deliberately left undone

Scope claims must be achievable. "Engine only, no UI changes" was not true of PR #41 once the enum
landed, because the care-type dropdown enumerates that type. If a change forces a user-visible
surface, say so rather than asserting it does not.
