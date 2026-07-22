# Spec-Driven Pull Request

## 📌 Summary
Provide a clear description of the feature, fix, or enhancement introduced in this PR.

## 📋 Spec-Driven Development (SDD) Compliance Checklist
- [ ] **Specification Verified**: Changes correspond to an existing specification in `specs/` (or a spec update was included in this PR).
- [ ] **Contract-First Schema Validation**: All data model changes are defined using runtime Zod schemas (`zod`) with inferred TypeScript types (`z.infer<typeof Schema>`).
- [ ] **BDD Test Standard**: New unit and E2E tests follow `Given [Context] -> When [User Action] -> Then [Expected Outcome]` scenario formatting.
- [ ] **Accessibility (a11y)**: Zero WCAG 2.0 AA violations detected via `@axe-core/playwright`.
- [ ] **Harness Verification**: Passed `.\scripts\test-app.ps1 -AppName <AppName>` (Security, Linting, Type-Check, Vitest, Playwright).
- [ ] **Documentation**: Updated project `README.md` and `HANDOFF.md` to reflect latest feature state.
