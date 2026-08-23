# Prove a New Test Can Fail

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **Prove a New Test Can Fail** `[guardrail: no-op-assertion]`: §9.4 states the rule and the
  evidence — PR #41 shipped `const _: typeof PlanSchema = undefined as unknown as typeof
  PlanSchema;` as a "drift tripwire", where the annotation and the assertion are the same
  type, so no change to `Plan` could ever make it red. The mechanically detectable half of
  that lesson is now a guardrail, because both shapes it takes are visible in a single line.
  (1) *An `expect()` with no matcher chained onto it* evaluates its argument and asserts
  nothing — `expect(splitCosts(plan));` passes on every possible return value, including a
  thrown-away one, and reads in review exactly like an assertion. (2) *A value annotated
  `typeof X` and cast back to `typeof X`* is a tautology in type space. Both are worse than
  absent coverage: they are false statements about what is covered, and they displace the
  real test nobody now thinks to write. The regex excludes any line carrying a `).` matcher,
  requires the `expect(` call to **close on the line**, and requires a terminating `;`. That
  last condition was not in the first version, and the guardrail false-positived on its
  author's own new test within the hour — because a chain can be wrapped *two* ways, and
  `expect(Schema.parse(x))` with `.toEqual(y);` on the next line closes its call and is a
  complete statement by shape. Only the missing semicolon distinguishes it from the defect.
  The trade is deliberate and worth stating: a bare `expect(x)` written without a semicolon
  is now missed, which is acceptable because every app here lints with semicolons, whereas a
  blocking guardrail that reddens an ordinary wrapped assertion costs real work. The wider
  lesson is about the *evidence* rather than the regex — "zero hits across the repo when
  added" proved only that no one had yet written a shape the rule mishandled, and a
  line-level rule is one formatting habit away from its first false positive. Re-verified
  after the fix across all 35 unit test files and 24 E2E specs, with zero hits — a count
  worth re-running rather than restating, since an earlier draft of this bullet quoted both
  numbers wrong. The judgement half of the lesson
  cannot be automated and stays prose: no regex can tell whether a test that *does* assert
  is asserting the thing that matters, which is why §9.4 still asks you to break the code
  and watch the test go red.
