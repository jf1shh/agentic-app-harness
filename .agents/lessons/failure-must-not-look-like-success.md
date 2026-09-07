# Failure must not look like success

The September 6 review found green reports over untested failure paths: `security-smoke`
called unavailable audits clean, Smart Recipe displayed success after quota errors and
rendered build-time seed data instead of browser records, and Elder Care Planner autosaved
defaults over unreadable encrypted data. Helper tests alone missed the boundary wiring.

Test the result at its consumer: unavailable audits are incomplete in text, JSON, and exit
status; failed writes produce a visible error; browser reloads preserve add/remove behavior;
unreadable records remain available for recovery; concurrent saves and async audit actions
preserve ordering. The explicit tests in `scripts/security-smoke.test.mjs` and the app suites
cover these failures. These are cross-function/runtime properties, not line-level regex
rules, so they do not belong in the guardrail registry.

A schema refinement must return false for invalid input rather than throw. Zod may evaluate
a refinement even when an earlier URL check fails, including an empty optional union arm.
The new recipe browser fixture exposed this; its unit fixture now includes that empty arm.
