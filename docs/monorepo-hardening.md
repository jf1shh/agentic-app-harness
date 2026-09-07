# Monorepo review and remediation — September 6, 2026

Reviewed the harness, CI/release paths, privacy and persistence boundaries, six application
implementations, existing tests, and portfolio claims. Changes are isolated on
`fix/monorepo-hardening`, based on `ce0d198`. The original checkout and its untracked
`CLAUDE.md.bak-2026-09-05` were preserved. A workspace checkpoint was made before edits.

## Assessment

The strongest portfolio feature is the harness's deterministic feedback loop: defects become
lessons, executable checks, and reviewable work orders without tying the system to one model.
The pure-function seams and self-tested gates make it understandable and portable. Elder Care
Planner supplies the strongest product-depth evidence through its calculations, derivation
trails, and substantial test coverage; Travel Packing demonstrates meaningful constraint-based
reasoning rather than simply wrapping a language-model API.

The main weakness was the gap between claims, isolated helper tests, and actual user flows.
The baseline harness scan printed **6 apps, 0 findings, 0 blocking** while real persistence,
audit, release, and presentation defects remained. The scanner measures its defined rules;
it does not certify integration correctness. Several showcase numbers were stale, and some
security, monetization, and live-data claims described intentions rather than shipped behavior.

The changes preserve the independent app architecture. They add small boundary checks,
transactional operations, and integration tests instead of a shared framework or another agent
orchestration layer. This makes the portfolio more credible without inflating its scope.

## Findings and changes

| Priority | Finding | Remediation |
| --- | --- | --- |
| High | Release inputs and metadata were substituted into shell source; manual releases did not explicitly target the checked-out commit. | Validate app/version against a known mapping, pass input through environment variables, and use `--target "$GITHUB_SHA"`. Regression checks cover hostile input and workflow wiring. No release was published. |
| High | Failed, malformed, or timed-out vulnerability audits could be labeled clean. | Audit failure is explicit in text/JSON and returns an incomplete exit status. Advisory policy is unchanged; inability to scan is no longer evidence of safety. |
| High | Smart Recipe's static pages displayed build-time seed data instead of restoring browser inventory, recipes, and meal plans. New rows had different UI and persisted IDs. | Restore browser data after hydration, reuse persisted identities, and verify add/reload/remove plus recipe search/save/catalog flows in Chromium. |
| High | Smart Recipe swallowed write failures and mutated shared seed arrays before persistence succeeded. | Writes return success/failure, UI errors reflect failure, and seed data is copied. Failed recipe saves cannot claim success or change the fallback catalog. |
| High | Elder Care Planner overwrote unreadable stored plans with defaults; overlapping async writes could overwrite newer data or recreate erased data. | Preserve unreadable recovery copies and pause autosave until explicit reset. Sequence writes per storage instance; synchronous flush and erase invalidate older async saves. |
| High | Competing first-use tabs could generate and store different planner encryption keys. | Publish/reuse the winning key in one IndexedDB read/write transaction. Existing winners are never replaced by a late candidate. |
| Medium | MoodDiner guarded storage methods but evaluated the potentially throwing `localStorage` property before entering those guards. | Safely acquire storage and use session memory when access is denied. Browser regression covers the actual throwing property getter. |
| Medium | Recipe search trusted arbitrary external response shapes and inserted raw search text into its URL. | Zod validation, HTTPS URL checks, nullable-field normalization, encoded query parameters, timeout, and explicit provider-failure handling. |
| Medium | Concurrent LexiVault audit actions hashed against stale React state, allowing chain forks. Its response fingerprint did not bind the answer or citation content. | Serialize audit construction/publication and hash the actual query, answer, and citations. Concurrent-append and content-fingerprint regressions cover both. These are consistency checks, not signatures. |
| Medium | LexiVault's lock left the workspace mounted behind an overlay, while its documentation claimed encrypted storage and memory zeroization. | Unmount the workspace during lock, clear the last result, label it a session-only demo, and remove unsupported assurance claims. No persistent vault was added. |
| Medium | LexiVault used external fonts and advertised confidence percentages and unverified sample provenance. | Remove external typography, label ranking as heuristic, recompute sample source hashes/sizes/chunk counts, and identify sample provenance as unverified. |
| Medium | A malformed percent-encoded URL crashed the static preview server; it listened on all interfaces. | Return HTTP 400, remain available for subsequent requests, and bind preview servers to loopback. |
| Portfolio | Cards claimed live restaurant/weather feeds, actual monetization, recipe macros/shopping lists, and 100% accessibility compliance. Test counts were stale. | Describe actual demo behavior, show dated test snapshots and automated accessibility checks, remove unsupported monetization badges, and refresh the screenshot. |
| Evaluation | The ranking gate labeled query hit rate as precision@K. | Rename the metric to hit-rate@K without changing its formula or thresholds, and document what the small golden set does and does not measure. |

## Executed verification

Commands used the repository's Node 20 runtime pin (**20.20.2**); final checks used npm **10.9.9**.
Initial app runs used the host's newer npm and emitted compatibility warnings; final reruns for
changed Elder Care Planner, LexiVault, and Portfolio Hub used the compatible npm installation.
Dependencies were copied into the isolated worktree rather than modifying the original checkout.

| App | Vitest tests passed | Playwright tests passed |
| --- | ---: | ---: |
| Elder Care Planner | 554 | 143 |
| LexiVault | 174 | 17 |
| MoodDiner | 106 | 10 |
| Portfolio Hub | 65 | 13 |
| Smart Recipe | 56 | 7 |
| Travel Packing | 407 | 64 |
| **Total** | **1,362** | **254** |

Each app was run through `node scripts/test-app.mjs <app>`, including dependency audit,
lint, type checking, Vitest, and Playwright/axe checks. Each printed
`ALL HARNESS CHECKS PASSED FOR <app>!`. Production-bundle smoke checks were included by the
existing Playwright configurations; these runs do not constitute an Android-device test.

The harness's own run, `node --test scripts/*.test.mjs`, printed:

```text
# tests 29
# pass 29
# fail 0
```

These are 29 self-test files, many containing multiple assertions. The doctor reported all
8 checks passing. The final scan retains **1 informational finding, 0 blocking**: LexiVault's
enterprise roadmap items are explicitly unfinished. Learn verifies **10 guardrails** against
**59 lessons**; the generated portfolio fixture represents the **5 showcased apps**, excluding
the hub itself. The secret-pattern tree scan and whitespace check passed.

The retrieval evaluation printed:

```text
Golden queries: 20 | In-topK: 20/20 | hit-rate@K: 100.0% | MRR: 1.000
RAG retrieval-hit-rate gate PASSED.
```

This is deterministic document-ranking evidence over a small sample corpus, not an
answer-quality, legal-correctness, or large-corpus generalization result.

New negative tests were run before implementation. Additional deliberate mutations were
caught for audit serialization, blocked-storage acquisition, stale-save ordering, and
incomplete-audit reporting; original code was restored afterward. The recipe fixture also
caught a real implementation mistake: an empty optional video URL reached a throwing URL
refinement. That regression was reproduced and fixed, rather than weakening the fixture.
The new blocked-storage browser test initially used a nonexistent CSS selector; it now
asserts the existing seven-card collection, exercising the same behavior accurately.

The refreshed desktop screenshot was visually inspected. A 390px browser check reported
**0 JavaScript errors and 0px horizontal overflow**. Reduced-motion mode was used for the
screenshot so count-up animations cannot freeze misleading intermediate numbers.

## Remaining limitations and next priorities

- **Use synthetic data for the portfolio.** Elder Care Planner retains its explicitly chosen
  synchronous plaintext recovery write on pagehide and its unavailable-key fallback. This
  review makes those limits visible; it does not redesign key recovery or promise universal
  encryption at rest. The apps share a Pages origin, so their browser storage is not isolated
  from other same-origin scripts. Multi-tab collaborative editing and erasure coordination
  still need dedicated product behavior.
- **LexiVault is an educational retrieval demo.** Selectable roles are not authentication;
  its passphrase gates a view rather than encrypting documents. Hash chains can be fully
  recomputed, JavaScript memory cannot be guaranteed erased, and PII/input heuristics can miss
  cases. A persistent encrypted vault would require a separate recovery and threat model.
- **Broader resource and external-data testing remains worthwhile.** Travel Packing's
  compressed share/file inputs and external geocoding responses need stronger resource
  ceilings and exhaustive boundary validation before handling adversarial inputs at scale.
  Its real-world catalogs, financial assumptions, and sample-document provenance require
  dated source reviews; passing code tests does not verify external facts.
- **Portfolio counts are dated snapshots.** Keep them tied to executed suites, not permanent
  claims. Accessibility testing covered the existing automated scenarios and the added flows;
  manual keyboard/screen-reader evaluation remains separate from axe results.
- **No remote deployment was initiated.** GitHub repository protections, production hosting
  headers, branch/release permissions, Play signing, and actual Android device behavior were
  not independently verified in this local remediation. Nothing was pushed or merged.

Sources for the release boundary and audit interpretation:
[GitHub script-injection guidance](https://docs.github.com/en/actions/concepts/security/script-injections),
[npm audit exit-code behavior](https://docs.npmjs.com/cli/v11/commands/npm-audit/).
