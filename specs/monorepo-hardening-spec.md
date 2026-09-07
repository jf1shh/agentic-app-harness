# Monorepo review remediation

Authorized by the maintainer's request to repeat the AutoClaimsRAG review-and-fix pass.
Preserve each app's independent architecture and existing data. Fix demonstrated failures;
record proof and residual limits instead of treating a green scanner as comprehensive assurance.

Acceptance criteria:
- Release metadata is validated against known apps/version syntax before use; user input
  never becomes shell source, and manual releases target the checked-out commit.
- An unavailable, malformed, or timed-out vulnerability audit is reported as incomplete,
  never clean. Informational advisories remain informational under existing policy.
- Blocked browser storage does not prevent MoodDiner's demo from opening or being used.
- External recipe results are validated, query parameters encoded, and save errors reported.
- Concurrent first-use device-key creation preserves one stored key across tabs; valid
  encrypted planner data must not become unreadable due to key replacement.
- Tests reproduce failures before fixes, cover real browser boundaries where applicable,
  and run through the authoritative per-app gates. Preserve guardrail integrity.

LexiVault retains the session-only demo architecture. Correct unsupported assurance claims,
serialize audit appends, and hide the workspace during the session lock. Persistent encrypted
storage remains a separate, explicitly unimplemented roadmap item.
