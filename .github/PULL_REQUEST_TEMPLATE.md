# Spec-Driven Pull Request

Full rationale for every section below lives in `.agents/AGENTS.md` §9 — this template is the
fill-in-the-blanks version, not the explanation. If a rule here seems arbitrary, that's where to look
before skipping it.

## 📌 Summary
What changed and why (1–3 sentences). Link the spec section if one exists.

## ✅ Verification — paste output, don't self-certify (§9.1)
Run and paste the **final summary block**, verbatim, including any FAIL:
```
node scripts/test-app.mjs <AppName>
```
<details>
<summary>Harness output</summary>

```
(paste here)
```

</details>

Couldn't run it, or it's red? Say so and why the PR is open anyway — an honest "not run: …" or a
reported failure is fine. A green claim that wasn't actually run is the one thing this section
exists to prevent.

## 📋 Compliance checklist
- [ ] Matches an existing spec in `specs/` (or this PR updates the spec alongside the code)
- [ ] Data-model changes are `zod` schemas with `z.infer<typeof X>` types — none if N/A
- [ ] New/changed unit + E2E tests are `Given → When → Then`
- [ ] 0 axe WCAG AA violations (per the harness output above)
- [ ] `README.md` / `HANDOFF.md` updated if this changes the app's state or feature set

## 🎯 Blast radius — only if a `z.enum`/union/exported type gained a member (§9.2)
Skip this whole section otherwise. Per widened type, run both:
```
grep -rln "<TypeName>" projects/<app>/src/     # finds annotations
grep -rln "<fieldName>" projects/<app>/src/    # finds the code that actually reads the data
```
List every file either returns. A `Record<Type, …>`, `switch`, or `Object.keys()` over the type is a
mandatory edit; naming a file here as needing no change is a legitimate, reviewable answer — this
table is what `check-enum-blast-radius.mjs` reads to know a consumer was considered.

| File | Found by (type / field) | Handles the new member how? |
|---|---|---|
| | | |

## 🧪 Mutation proof — for every behavior this PR claims to protect (§9.4 / §5.4)
Break the code once, confirm the test(s) go red, restore. State each one:
- Mutation: … → Result: …

## Left undone
Anything a reader would reasonably expect this PR to cover but doesn't, and why.
