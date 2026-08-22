---
name: harness-doctor
description: "Run a fast diagnostic sweep of the harness: which gates pass, which fail, and the exact CLI command to fix each failure. Exits 0 only when every check is green."
argument-hint: "[--json] [--fix-hints]"
---

# Harness Doctor

A fast, local pre-push self-check inspired by `agent-reach doctor`. Runs every gate that can
complete in under a second and reports pass/fail per check with fix prescriptions. Not a
replacement for `node scripts/test-app.mjs <AppName>` — that's the full gate, this is the
"did I break anything obvious" signal.

## When to run

- Before every push, as part of the pre-push git hook (`.claude/hooks/`).
- After any change to `scripts/`, `.agents/`, specs, or root config files.
- When the harness gate in CI is red and you need a local reproduction.

## Step 1: Run the fast checks

Execute these commands in order. Each one must complete in under 1 second on a warm cache;
skip any that can't (the full gate covers them separately):

```
node scripts/harness-status.mjs --gate   # guardrail regressions + missing specs
node scripts/harness-learn.mjs           # guardrail ↔ lesson traceability
node scripts/check-doc-claims.mjs --gate # doc claims match reality
node scripts/check-loop-stats.mjs        # portfolio-hub loop stats freshness
node scripts/check-peer-consistency.mjs  # peer dep sets move together
node scripts/harness-status.mjs          # full sense sweep (informational-only here)
```

Run `node scripts/harness-status.test.mjs` only if `scripts/harness-status.mjs` itself was
changed — the self-test suite takes 2-3 seconds.

## Step 2: Report per check

For each check:

```
✓ harness gate           no blocking findings
✓ guardrail traceability  all guardrails trace to lessons
✗ doc claims             claims.md:3 → expected 47, read 46
  Fix: cd projects/portfolio-hub && npm run generate:loop-stats
✗ peer consistency       mood-diner: @typescript-eslint/parser 8.x with eslint-plugin 7.x
  Fix: downgrade parser to ^7.18.0 or upgrade the plugin set together
✓ loop stats             regenerated, up to date
✓ full sense sweep       3 drift findings (non-blocking)
```

If `--fix-hints` is given, include the exact CLI command to fix each failure.
If `--json` is given, output JSON instead of the pretty-printed checkmarks.

## Step 3: Exit code

- `0` — every check green.
- `1` — one or more checks failed.

The pre-push hook can block a push on exit 1. A red harness doctor does not prevent committing
(that's what the CI gate is for), but it prevents pushing something that will immediately fail CI.

## Step 4: Beyond the doctor (when a check is red)

The doctor is a *diagnosis*, not a *treatment*. When a check fails:
1. Read the fix prescription.
2. Apply it.
3. Re-run the doctor.
4. Only then run the full gate (`node scripts/test-app.mjs <AppName>`) before pushing.

If the doctor itself is broken (a script throws instead of reporting), that's a harness bug —
open an issue, don't work around it.

## Dependencies
- Zero external dependencies — every script it calls is already in `scripts/`.
- `node` 20+ (uses the same runtime as every other harness script).

## Integration with the agentic loop

The harness loop stages:
```
SENSE   → harness-status.mjs       (doctor runs this)
PROPOSE → emit-tasks.mjs           (doctor does not run this)
VERIFY  → harness-status.mjs --gate (doctor runs this)
LEARN   → harness-learn.mjs         (doctor runs this)
```

The doctor is a client-side bundling of the SENSE + VERIFY + LEARN fast checks. It is *not*
a new stage — just a convenience wrapper around existing stages.

## Verification
- Run on a known-clean repo: `node scripts/harness-doctor.mjs` exits 0.
- Temporarily break a guardrail (add a banned line to a fixture): exits 1 with the fix hint.
- `node scripts/harness-doctor.test.mjs` covers both paths.