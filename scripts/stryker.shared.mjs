// Shared Stryker Mutator base config, imported by every projects/<app>/stryker.config.mjs.
//
// Mutation testing is the machine-checked half of .agents/AGENTS.md §9.4
// ("prove a new test can fail"): instead of an agent hand-mutating the
// implementation once and pasting the result into a PR body — a claim
// nobody re-runs — Stryker mutates every statement Vitest can reach and
// reports what fraction of mutants the test suite actually kills.
//
// This is wired in as a non-blocking sensor, the same arc `unit-test-coverage`
// went through in .agents/AGENTS.md §8: `scripts/run-mutation.mjs` reports a
// score, it does not fail `test-app.mjs` or the harness `--gate`. Promoting it
// to a blocking threshold is a deliberate, later, human decision once a score
// floor is chosen and any existing backlog is closed — not something this
// config should pre-empt. `thresholds.break: null` keeps Stryker itself from
// exiting non-zero on a low score, for the same reason.
//
// Deliberately NOT wired into harness-status.mjs's `senseApp`: that scan is a
// synchronous, zero-dependency, sub-second sweep run on every local invocation
// and every `--gate` check, and mutation testing takes real wall-clock minutes
// per app. Keeping it in its own script/workflow (scripts/run-mutation.mjs,
// .github/workflows/mutation-testing.yml) preserves the sense layer's speed
// contract instead of quietly breaking it.
export function createStrykerConfig(overrides = {}) {
  return {
    $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
    packageManager: 'npm',
    testRunner: 'vitest',
    coverageAnalysis: 'perTest',
    reporters: ['clear-text', 'json'],
    // Logic modules only — the same scope .agents/AGENTS.md §5 draws for unit
    // tests (src/lib, src/utils, src/services, src/engine, src/data, src/hooks,
    // src/store, src/state, top-level src/*.ts). Components/pages (.tsx) are
    // deliberately excluded: they're Playwright + axe's job, not Vitest's, so
    // mutating them would only ever report "NoCoverage" noise.
    mutate: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
    thresholds: { high: 80, low: 60, break: null },
    tempDirName: '.stryker-tmp',
    ...overrides,
  };
}
