import { z } from 'zod';

export const ProjectMetricsSchema = z.object({
  unitTests: z.number().min(0),
  e2eTests: z.number().min(0),
  a11yScore: z.string(),
  securityAudit: z.string(),
});

export const ProjectItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: z.enum(['Dining', 'Utility', 'Kitchen', 'Legal']),
  techStack: z.array(z.string()),
  metrics: ProjectMetricsSchema,
  pwaReady: z.boolean(),
  capacitorAndroid: z.boolean(),
  monetized: z.boolean(),
  specPath: z.string(),
  demoUrl: z.string(),
  githubUrl: z.string(),
});

export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
