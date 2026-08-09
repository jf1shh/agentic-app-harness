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
