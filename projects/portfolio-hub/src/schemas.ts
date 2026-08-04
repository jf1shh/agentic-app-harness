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

export const MLPipelineStepSchema = z.object({
  label: z.string().min(1),
  sourcePath: z.string().min(1),
});

export const MLArchitectureSchema = z.object({
  approach: z.string().min(1),
  pipeline: z.array(MLPipelineStepSchema).min(1),
  evalMethod: z.string().optional(),
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
  mlArchitecture: MLArchitectureSchema.optional(),
});

export const SkillSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  evidence: z.array(z.string()).min(1),
});

export const CaseStudySchema = z
  .object({
    id: z.string(),
    title: z.string().min(1),
    problem: z.string().min(1),
    rootCause: z.string().min(1),
    fix: z.string().min(1),
    guardrailId: z.string().min(1).optional(),
    enforcedBy: z.string().min(1).optional(),
    sourceRef: z.string().min(1),
  })
  .refine((data) => Boolean(data.guardrailId) || Boolean(data.enforcedBy), {
    message: 'A case study must name either a real guardrailId or an enforcedBy mechanism — a "lesson learned" with nothing that enforces it is prose, not a guardrail.',
  });

export const LoopStatsSchema = z.object({
  guardrailCount: z.number().int().min(0),
  lessonCount: z.number().int().min(0),
  appCount: z.number().int().min(0),
});

export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;
export type ProjectSnippet = z.infer<typeof ProjectSnippetSchema>;
export type MLPipelineStep = z.infer<typeof MLPipelineStepSchema>;
export type MLArchitecture = z.infer<typeof MLArchitectureSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type CaseStudy = z.infer<typeof CaseStudySchema>;
export type LoopStats = z.infer<typeof LoopStatsSchema>;
