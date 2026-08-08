import React from 'react';
import { Bug, ChevronDown } from 'lucide-react';
import { CASE_STUDIES } from '../data/caseStudiesData';

export const CaseStudySection: React.FC = () => {
  return (
    <section aria-labelledby="case-studies-heading" style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
        <Bug size={20} color="var(--accent-primary)" />
        <h2 id="case-studies-heading" className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Case Studies: Real Bugs, Real Fixes, Real Guardrails
        </h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '760px' }}>
        Incidents from this monorepo's own history — what broke, why, how it was fixed, and the exact
        mechanism that now blocks a recurrence. Expand a card for the enforcement path.
      </p>

      <div className="skills-grid">
        {CASE_STUDIES.map((study) => (
          <details key={study.id} className="glass-panel skill-card" id={`case-study-${study.id}`}>
            <summary className="skill-card-summary">
              <span>
                <span className="skill-card-title">{study.title}</span>
                <span className="skill-card-summary-text">{study.problem}</span>
              </span>
              <ChevronDown size={18} className="skill-card-chevron" aria-hidden="true" />
            </summary>
            <dl className="case-study-body">
              <dt>Root cause</dt>
              <dd>{study.rootCause}</dd>
              <dt>Fix</dt>
              <dd>{study.fix}</dd>
              <dt>Enforced by</dt>
              <dd className="code-block-path" style={{ marginBottom: 0 }}>
                {study.guardrailId
                  ? `"${study.guardrailId}" guardrail in scripts/harness-status.mjs`
                  : study.enforcedBy}
                {' — '}{study.sourceRef}
              </dd>
            </dl>
          </details>
        ))}
      </div>
    </section>
  );
};
