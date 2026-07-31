---
name: Feature Request (SDD)
about: Propose a new feature or application for the harness monorepo
title: '[FEAT]: '
labels: 'enhancement'
assignees: ''
---

## 🎯 Feature Description
A clear and concise description of what the feature should accomplish.

## 🔎 Has this already been adjudicated? (check `specs/` first)

**Search the spec before filing.** Relayed feedback is very often something the spec already
records — sometimes already decided *against*, with a reason worth reading.

```
grep -n "<keyword>" specs/<app-name>-spec.md
```

Three separate feature requests in one session on `elder-care-planner` turned out to be §11.7,
§11.8 and §11.9 — all previously proposed and adjudicated. One of them (an annual x-axis on the
comparison chart) had been explicitly **rejected** in §6.5b.3, because the crossing usually falls
mid-year and annual sampling would hide exactly the detail the requester wanted to see. Building it
as asked would have destroyed information while appearing to satisfy the request.

- [ ] Searched `specs/` and it is genuinely new
- [ ] Found in the spec as PROPOSED / NOT APPROVED — this issue is a request to **approve** it
- [ ] Found in the spec as REJECTED — say why the decision should be revisited

**If the spec's own wording is wrong, say so here.** A criterion can be stated inaccurately, and
implementing it verbatim then ships a confident falsehood. §11.9 was titled *"values shown are in
today's dollars"*, which was false for two of the three charts it covered. Correct the spec in
writing first, then build against the corrected version.

## 📄 Target Specification
- **Specification File**: `specs/<app-name>-spec.md`
- **Target Monorepo Project**: `projects/<app-name>`

## 📋 Acceptance Criteria (BDD Given-When-Then)
- **Given** [Initial Application Context]
- **When** [User Interaction or Event]
- **Then** [Expected Functional / Data Result]

## 🛡️ Data Contract & Schemas
Describe any new data models or Zod schema additions required.
