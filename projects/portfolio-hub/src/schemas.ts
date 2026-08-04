import { z } from 'zod';

export const ProjectMetricsSchema = z.object({
  unitTests: z.number().min(0),
  e2eTests: z.number().min(0),
  a11yScore: z.string(),
  securityAudit: z.string(),
});

export const ProjectSnippetSchema = z.object({
  language: z.string().min(1),
  sourcePath: z.string().min(1),
  code: z.string().min(1),
});

export const ProjectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: z.enum(['Dining', 'Utility', 'Kitchen', 'Legal', 'Family Finance']),
  techStack: z.array(z.string()),
  metrics: ProjectMetricsSchema,
  pwaReady: z.boolean(),
  capacitorAndroid: z.boolean(),
  monetized: z.boolean(),
  specPath: z.string(),
  demoUrl: z.string(),
  githubUrl: z.string(),
  snippet: ProjectSnippetSchema,
});

export const SkillSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  evidence: z.array(z.string()).min(1),
});

export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;
export type ProjectSnippet = z.infer<typeof ProjectSnippetSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type Skill = z.infer<typeof SkillSchema>;
