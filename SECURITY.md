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

Vulnerabilities are monitored by weekly automated Dependabot scans (npm + GitHub Actions) that open alerts and update PRs. The harness test suite also runs `npm audit --audit-level=high` on every app as an advisory signal (it surfaces high-severity advisories as a warning rather than hard-failing the build, since transitive advisories are often unrelated to the change under test). Confirmed vulnerabilities are patched via dependency bumps or `overrides`.
