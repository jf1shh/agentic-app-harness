import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseStudySchema } from '../schemas';
import { CASE_STUDIES } from './caseStudiesData';

// A case study that cites a mechanism which does not actually exist is worse
// than no case study at all — it is a fabricated "lesson learned". These
// tests read the real enforcement mechanisms off disk rather than trusting
// the strings in caseStudiesData.ts, the same discipline portfolioData.test.ts
// applies to code-snippet source paths.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const HARNESS_STATUS_PATH = join(REPO_ROOT, 'scripts', 'harness-status.mjs');

function realGuardrailIds(): Set<string> {
  const source = readFileSync(HARNESS_STATUS_PATH, 'utf8');
  const ids = [...source.matchAll(/id:\s*'([a-zA-Z0-9_-]+)'/g)].map((m) => m[1]);
  return new Set(ids);
}

describe('Case studies dataset integrity', () => {
  it('Given the real CASE_STUDIES dataset, When every row is parsed through the contract, Then all of them conform', () => {
    expect(CASE_STUDIES.length).toBeGreaterThan(0);
    for (const study of CASE_STUDIES) {
      expect(() => CaseStudySchema.parse(study)).not.toThrow();
    }
  });

  it('Given the real CASE_STUDIES dataset, When ids are collected, Then each case study has a unique id', () => {
    const ids = CASE_STUDIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Given a case study that names a guardrailId, When it is checked against scripts/harness-status.mjs, Then that id actually exists in the real GUARDRAILS array', () => {
    const realIds = realGuardrailIds();
    const studiesWithGuardrails = CASE_STUDIES.filter((s) => s.guardrailId);
    expect(studiesWithGuardrails.length).toBeGreaterThan(0);
    for (const study of studiesWithGuardrails) {
      expect(realIds.has(study.guardrailId as string)).toBe(true);
    }
  });

  it('Given a case study with no guardrailId, When its enforcedBy path is resolved from the repo root, Then the named file actually exists on disk', () => {
    const studiesWithoutGuardrails = CASE_STUDIES.filter(
      (s): s is typeof s & { enforcedBy: string } => !s.guardrailId && Boolean(s.enforcedBy),
    );
    expect(studiesWithoutGuardrails.length).toBeGreaterThan(0);
    for (const study of studiesWithoutGuardrails) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is built from this repo's own committed dataset, not external input
      expect(existsSync(join(REPO_ROOT, study.enforcedBy))).toBe(true);
    }
  });

  it('Given a guardrail id that was never added to the harness, When it is checked, Then the real-id check correctly rejects it', () => {
    // Proves the check above can actually fail: a fabricated id must not
    // silently pass the same assertion a real one does.
    const realIds = realGuardrailIds();
    expect(realIds.has('totally-made-up-guardrail-id')).toBe(false);
  });
});
