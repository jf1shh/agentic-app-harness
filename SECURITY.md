# Security Policy

## Supported Versions

Security updates are actively maintained for the latest release on the `master` branch.

| Version | Supported          |
| ------- | ------------------ |
| master  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within any application in this repository, please report it by opening a private GitHub Security Advisory or reaching out to the repository maintainer (**@jf1shh**).

Please include:
- A description of the vulnerability and affected application (`mood-diner`, `portfolio-hub`, etc.).
- Steps to reproduce or proof-of-concept code.
- Impact assessment.

Vulnerabilities are monitored by weekly automated Dependabot scans, covering every app's own npm tree individually (not just the root workspace lockfile) plus GitHub Actions, that open alerts and update PRs. Related packages that must move together (`@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`; `react` + `react-dom` + their `@types` packages) are grouped into a single PR — a lone half-bump of either pair is exactly the failure mode documented in `.agents/AGENTS.md` §6 ("A Dependency Bump Is Only Safe If Its Peers Move With It"). A CodeQL static analysis workflow (`.github/workflows/codeql.yml`) scans every push, pull request, and weekly on a schedule. The harness test suite also runs `npm audit --audit-level=high` on every app as an advisory signal (it surfaces high-severity advisories as a warning rather than hard-failing the build, since transitive advisories are often unrelated to the change under test). Confirmed vulnerabilities are patched via dependency bumps or `overrides`.

## Scope and limits of the portfolio demos

All six apps share the deployed GitHub Pages origin. Subpaths do not isolate localStorage
or IndexedDB; same-origin scripts and browser extensions are outside these apps' security
boundary. Elder Care Planner's device key protects a ciphertext copy without the key store,
not another script with the same origin. Its documented pagehide and unavailable-key fallback
can persist plaintext; use synthetic data when evaluating the portfolio.

LexiVault keeps documents in session memory. Its view lock, selectable roles, PII heuristics,
and hash-chain checks are demonstrations, not authenticated authorization, persistent
encrypted storage, tamper-proof audit records, or certified legal advice.

Security smoke distinguishes an incomplete audit from a clean result. Dependency advisories
remain advisory under repository policy; passing application tests does not imply a clean
vulnerability scan. Release inputs are validated and passed as data, never shell source.

See [the September 6 remediation record](docs/monorepo-hardening.md) for checks and residual work.
