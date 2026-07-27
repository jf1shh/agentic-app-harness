import { describe, it, expect } from 'vitest';
import { ProjectItemSchema, ProjectMetricsSchema } from './schemas';
import { PROJECTS_DATA } from './data/projectsData';

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
