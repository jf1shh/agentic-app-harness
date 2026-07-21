import { describe, it, expect } from 'vitest';
import { PROJECTS_DATA } from '../../data/projectsData';

describe('Portfolio Data Integrity', () => {
  it('contains valid project items', () => {
    expect(PROJECTS_DATA.length).toBeGreaterThan(0);
  });

  it('ensures all projects have required metrics and specs', () => {
    PROJECTS_DATA.forEach((proj) => {
      expect(proj.id).toBeTruthy();
      expect(proj.name).toBeTruthy();
      expect(proj.metrics.unitTests).toBeGreaterThanOrEqual(0);
      expect(proj.metrics.a11yScore).toContain('WCAG');
      expect(proj.specPath).toBeTruthy();
    });
  });
});
