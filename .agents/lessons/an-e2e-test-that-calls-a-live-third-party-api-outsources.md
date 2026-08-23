# An E2E Test That Calls a Live Third-Party API Outsources Your Build Status

> Relocated from `.agents/AGENTS.md` §6 as part of the rulebook slim-down — see [`docs/SLIM_RULEBOOK_PROPOSAL.md`](../../docs/SLIM_RULEBOOK_PROPOSAL.md). This file is the canonical text; the rulebook itself carries only the one-line index entry below.

- **An E2E Test That Calls a Live Third-Party API Outsources Your Build Status**: `travel-packing-app`'s
  E2E suite geocodes through `nominatim.openstreetmap.org` and `geocoding-api.open-meteo.com` for
  real. That makes a green build depend on someone else's uptime, rate limits and user-agent
  policy — Nominatim's usage policy explicitly blocks unfamiliar clients — and it means the suite
  cannot run at all in a network-restricted environment, which is where agents frequently work.
  The failure is also badly misleading: it surfaces as `expect(locator).toBeVisible()` finding
  nothing, so it reads as a broken feature rather than a blocked request, and the only clue is a
  `Geocoding Error: TypeError: Failed to fetch` line buried in the browser console output. Stub the
  network at the test boundary (`page.route()`) and keep one clearly-labelled opt-in spec for the
  live integration, so the deterministic suite proves the app's own logic and the live check is a
  separate signal that can fail without blocking a merge. Discovered while porting CI from
  `windows-latest` to `ubuntu-latest`: five apps ran clean on Linux and this one did not, which
  looked like a platform dependency for as long as it took to check whether the host was reachable.
  Not tagged as a guardrail: distinguishing a deliberate live-integration spec from an accidental
  one needs judgement, and the fetch is often several call frames from the test file.
