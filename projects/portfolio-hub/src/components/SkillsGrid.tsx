import React from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { SKILLS_DATA } from '../data/skillsData';

export const SkillsGrid: React.FC = () => {
  return (
    <section aria-labelledby="skills-heading" style={{ marginBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
        <Sparkles size={20} color="var(--text-muted)" />
        <h2 id="skills-heading" className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Engineering Skills Demonstrated
        </h2>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '760px' }}>
        Every claim below is backed by something real in this repository, not a résumé bullet — expand a card for the proof.
      </p>

      <div className="skills-grid">
        {SKILLS_DATA.map((skill) => (
          <details key={skill.id} className="glass-panel skill-card" id={`skill-card-${skill.id}`}>
            <summary className="skill-card-summary">
              <span>
                <span className="skill-card-title">{skill.title}</span>
                <span className="skill-card-summary-text">{skill.summary}</span>
              </span>
              <ChevronDown size={18} className="skill-card-chevron" aria-hidden="true" />
            </summary>
            <ul className="skill-card-evidence">
              {skill.evidence.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
};
