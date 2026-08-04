import { describe, it, expect } from 'vitest';
import { PROJECTS_DATA } from '../../data/projectsData';

describe('Portfolio Data Integrity', () => {
  it('Given the shipped portfolio dataset, When it is loaded, Then it contains at least one project', () => {
    expect(PROJECTS_DATA.length).toBeGreaterThan(0);
  });

  it('Given the shipped portfolio dataset, When each project is inspected, Then it carries an id, a name, non-negative metrics, a WCAG score and a spec path', () => {
    PROJECTS_DATA.forEach((proj) => {
      expect(proj.id).toBeTruthy();
      expect(proj.name).toBeTruthy();
      expect(proj.metrics.unitTests).toBeGreaterThanOrEqual(0);
      expect(proj.metrics.a11yScore).toContain('WCAG');
      expect(proj.specPath).toBeTruthy();
    });
  });

  it('Given the shipped portfolio dataset, When each project is inspected, Then its snippet cites a real path inside that app\'s own project directory', () => {
    // A snippet that doesn't point back into projects/<id>/ would be a
    // fabricated example passed off as real shipped code.
    PROJECTS_DATA.forEach((proj) => {
      expect(proj.snippet.code.trim().length).toBeGreaterThan(0);
      expect(proj.snippet.sourcePath.startsWith(`projects/${proj.id}/`)).toBe(true);
    });
  });
});
