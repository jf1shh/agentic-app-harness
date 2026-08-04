import { describe, it, expect } from 'vitest';
import {
  ProjectItemSchema,
  ProjectMetricsSchema,
  ProjectSnippetSchema,
  SkillSchema,
  MLArchitectureSchema,
  CaseStudySchema,
  LoopStatsSchema,
} from './schemas';
import { PROJECTS_DATA } from './data/projectsData';
import { SKILLS_DATA } from './data/skillsData';
import { CASE_STUDIES } from './data/caseStudiesData';

// Contract-first mandate (.agents/AGENTS.md §1): the Zod schema is the runtime
// contract, so it has to be exercised as one. `portfolioData.test.ts` hand-rolls
// field checks against the same data; those assert that today's rows look right,
// while these assert that the *contract* rejects what it is supposed to reject.
//
// Backfilled coverage (§5): no Red step, so every case below was proved by
// mutating the schema — see the PR body.

const validMetrics = {
  unitTests: 12,
  e2eTests: 4,
  a11yScore: 'WCAG 2.0 AA',
  securityAudit: 'passing',
};

const validSnippet = {
  language: 'typescript',
  sourcePath: 'src/utils/weatherEngine.ts',
  code: 'export function evaluateWeatherSuitability(restaurant, weather) {\n  return score;\n}',
};

const validProject = {
  id: 'mood-diner',
  name: 'MoodDiner',
  tagline: 'Restaurants that match your mood',
  description: 'A smart restaurant recommender and booking engine.',
  category: 'Dining' as const,
  techStack: ['React', 'Vite', 'TypeScript'],
  metrics: validMetrics,
  pwaReady: true,
  capacitorAndroid: true,
  monetized: false,
  specPath: 'specs/mood-diner-spec.md',
  demoUrl: 'https://jf1shh.github.io/agentic-app-harness/mood-diner/',
  githubUrl: 'https://github.com/jf1shh/agentic-app-harness',
  snippet: validSnippet,
};

// Omit a key without leaving an unused binding behind: the usual
// `const { key: _unused, ...rest } = obj` idiom trips
// @typescript-eslint/no-unused-vars, which these apps lint with no ^_ ignore
// pattern and --max-warnings 0.
function without<T extends object>(obj: T, key: keyof T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  delete copy[key as string];
  return copy;
}

describe('ProjectMetricsSchema', () => {
  it('Given a complete metrics record, When it is parsed, Then it is accepted unchanged', () => {
    const parsed = ProjectMetricsSchema.parse(validMetrics);
    expect(parsed).toEqual(validMetrics);
  });

  it('Given a negative test count, When it is parsed, Then the contract rejects it', () => {
    expect(() => ProjectMetricsSchema.parse({ ...validMetrics, unitTests: -1 })).toThrow();
    expect(() => ProjectMetricsSchema.parse({ ...validMetrics, e2eTests: -3 })).toThrow();
  });

  it('Given a test count that arrived as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    // A count read back from JSON as "12" would render fine and sort wrongly.
    expect(() => ProjectMetricsSchema.parse({ ...validMetrics, unitTests: '12' })).toThrow();
  });

  it('Given a metrics record missing a field, When it is parsed, Then the contract rejects it', () => {
    expect(() => ProjectMetricsSchema.parse(without(validMetrics, 'a11yScore'))).toThrow();
  });
});

describe('ProjectItemSchema', () => {
  it('Given a complete project item, When it is parsed, Then it is accepted unchanged', () => {
    const parsed = ProjectItemSchema.parse(validProject);
    expect(parsed).toEqual(validProject);
  });

  it.each(['Dining', 'Utility', 'Kitchen', 'Legal', 'Family Finance'])(
    'Given the declared category %s, When a project is parsed, Then it is accepted',
    (category) => {
      expect(ProjectItemSchema.parse({ ...validProject, category }).category).toBe(category);
    },
  );

  it('Given a category outside the declared union, When it is parsed, Then the contract rejects it', () => {
    // The showcase groups cards by category; an unlisted one renders into no group.
    expect(() => ProjectItemSchema.parse({ ...validProject, category: 'Gaming' })).toThrow();
  });

  it('Given a tech stack that is not an array of strings, When it is parsed, Then the contract rejects it', () => {
    expect(() => ProjectItemSchema.parse({ ...validProject, techStack: 'React' })).toThrow();
    expect(() => ProjectItemSchema.parse({ ...validProject, techStack: [1, 2] })).toThrow();
  });

  it('Given a project whose nested metrics are invalid, When it is parsed, Then the nested contract still applies', () => {
    expect(() => ProjectItemSchema.parse({
      ...validProject,
      metrics: { ...validMetrics, unitTests: -1 },
    })).toThrow();
  });

  it('Given a project missing its metrics entirely, When it is parsed, Then the contract rejects it', () => {
    expect(() => ProjectItemSchema.parse(without(validProject, 'metrics'))).toThrow();
  });

  it('Given a boolean flag supplied as a string, When it is parsed, Then it is rejected rather than coerced', () => {
    // "false" is truthy, so a coerced flag would light up the PWA badge wrongly.
    expect(() => ProjectItemSchema.parse({ ...validProject, pwaReady: 'false' })).toThrow();
  });

  it('Given a project missing its code snippet, When it is parsed, Then the contract rejects it', () => {
    // Every card promises a real snippet; a card silently missing one is the
    // §9 "scope claim" failure applied to data instead of prose.
    expect(() => ProjectItemSchema.parse(without(validProject, 'snippet'))).toThrow();
  });

  it('Given a snippet with an empty code body, When it is parsed, Then the contract rejects it', () => {
    expect(() => ProjectItemSchema.parse({ ...validProject, snippet: { ...validSnippet, code: '' } })).toThrow();
  });
});

describe('ProjectSnippetSchema', () => {
  it('Given a complete snippet, When it is parsed, Then it is accepted unchanged', () => {
    expect(ProjectSnippetSchema.parse(validSnippet)).toEqual(validSnippet);
  });

  it('Given a snippet missing its source path, When it is parsed, Then the contract rejects it', () => {
    // The source path is what makes the snippet a citation rather than a
    // decorative code block; dropping it silently would launder a made-up
    // example as if it were read from the shipped app.
    expect(() => ProjectSnippetSchema.parse(without(validSnippet, 'sourcePath'))).toThrow();
  });
});

describe('SkillSchema', () => {
  const validSkill = {
    id: 'contract-first-schemas',
    title: 'Contract-First Data Modelling',
    summary: 'Runtime Zod schemas as the single source of truth for every data model.',
    evidence: ['Every app validates untrusted input at its storage/import boundary via z.infer<typeof Schema>.'],
  };

  it('Given a complete skill, When it is parsed, Then it is accepted unchanged', () => {
    expect(SkillSchema.parse(validSkill)).toEqual(validSkill);
  });

  it('Given a skill with no evidence entries, When it is parsed, Then the contract rejects it', () => {
    // An unsubstantiated skill claim is exactly what §6 "Cite Confidence, Not
    // Just Sources" warns against — every claim here must point at something real.
    expect(() => SkillSchema.parse({ ...validSkill, evidence: [] })).toThrow();
  });

  it('Given a skill missing its id, When it is parsed, Then the contract rejects it', () => {
    expect(() => SkillSchema.parse(without(validSkill, 'id'))).toThrow();
  });
});

describe('the shipped skills dataset', () => {
  it('Given the real SKILLS_DATA, When every row is parsed through the contract, Then all of them conform', () => {
    expect(SKILLS_DATA.length).toBeGreaterThan(0);
    for (const skill of SKILLS_DATA) {
      expect(() => SkillSchema.parse(skill)).not.toThrow();
    }
  });

  it('Given the real SKILLS_DATA, When ids are collected, Then each skill has a unique id', () => {
    const ids = SKILLS_DATA.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('MLArchitectureSchema', () => {
  const validMl = {
    approach: 'Hybrid BM25 + cosine similarity retrieval, 100% client-side',
    pipeline: [
      { label: 'Clause-preserving chunker', sourcePath: 'projects/legal-financial-rag/src/lib/rag/chunker.ts' },
    ],
  };

  it('Given a complete ML architecture with no eval method, When it is parsed, Then it is accepted unchanged', () => {
    expect(MLArchitectureSchema.parse(validMl)).toEqual(validMl);
  });

  it('Given an ML architecture with an empty pipeline, When it is parsed, Then the contract rejects it', () => {
    // A pipeline claim with zero steps is an unsubstantiated claim, same
    // failure shape as a skill with no evidence.
    expect(() => MLArchitectureSchema.parse({ ...validMl, pipeline: [] })).toThrow();
  });

  it('Given a pipeline step missing its source path, When it is parsed, Then the contract rejects it', () => {
    expect(() => MLArchitectureSchema.parse({
      ...validMl,
      pipeline: [{ label: 'Some step' }],
    })).toThrow();
  });

  it('Given a project without mlArchitecture, When it is parsed through ProjectItemSchema, Then it is still accepted', () => {
    expect(() => ProjectItemSchema.parse(validProject)).not.toThrow();
  });

  it('Given a project with mlArchitecture attached, When it is parsed through ProjectItemSchema, Then the nested contract applies', () => {
    expect(() => ProjectItemSchema.parse({ ...validProject, mlArchitecture: { ...validMl, pipeline: [] } })).toThrow();
    expect(ProjectItemSchema.parse({ ...validProject, mlArchitecture: validMl }).mlArchitecture).toEqual(validMl);
  });
});

describe('CaseStudySchema', () => {
  const validCaseStudy = {
    id: 'enum-blast-radius',
    title: 'A widened enum silently broke three files nobody opened',
    problem: 'Adding a member to a shared type left several consumers unhandled.',
    rootCause: 'A type union was widened without visiting every consumer.',
    fix: 'Every consumer of the type was opened and updated to handle the new member.',
    enforcedBy: 'scripts/check-enum-blast-radius.mjs',
    sourceRef: '.agents/AGENTS.md §9.2',
  };

  it('Given a complete case study with no guardrailId, When it is parsed, Then it is accepted unchanged', () => {
    expect(CaseStudySchema.parse(validCaseStudy)).toEqual(validCaseStudy);
  });

  it('Given a case study with neither a guardrailId nor an enforcedBy mechanism, When it is parsed, Then the contract rejects it', () => {
    // A "lesson learned" with nothing that actually enforces it is prose, not
    // a guardrail, and this dataset claims the latter.
    expect(() => CaseStudySchema.parse(without(validCaseStudy, 'enforcedBy'))).toThrow();
  });

  it('Given a case study whose guardrailId stands in for an enforcedBy mechanism, When it is parsed, Then it is accepted without an enforcedBy field', () => {
    const guardrailBacked = { ...without(validCaseStudy, 'enforcedBy'), guardrailId: 'no-op-assertion' };
    expect(() => CaseStudySchema.parse(guardrailBacked)).not.toThrow();
  });

  it('Given the real CASE_STUDIES dataset, When every row is parsed through the contract, Then all of them conform', () => {
    expect(CASE_STUDIES.length).toBeGreaterThan(0);
    for (const study of CASE_STUDIES) {
      expect(() => CaseStudySchema.parse(study)).not.toThrow();
    }
  });
});

describe('LoopStatsSchema', () => {
  it('Given a complete loop stats record, When it is parsed, Then it is accepted unchanged', () => {
    const stats = { guardrailCount: 7, lessonCount: 20, appCount: 6 };
    expect(LoopStatsSchema.parse(stats)).toEqual(stats);
  });

  it('Given a negative count, When it is parsed, Then the contract rejects it', () => {
    expect(() => LoopStatsSchema.parse({ guardrailCount: -1, lessonCount: 20, appCount: 6 })).toThrow();
  });
});

describe('the shipped portfolio dataset', () => {
  it('Given the real PROJECTS_DATA, When every row is parsed through the contract, Then all of them conform', () => {
    expect(PROJECTS_DATA.length).toBeGreaterThan(0);
    for (const project of PROJECTS_DATA) {
      expect(() => ProjectItemSchema.parse(project)).not.toThrow();
    }
  });

  it('Given the real PROJECTS_DATA, When ids are collected, Then each card has a unique id', () => {
    // Duplicate ids would collide as React keys and silently drop a card.
    const ids = PROJECTS_DATA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
