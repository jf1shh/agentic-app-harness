import React from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';
import { ProjectItem } from '../data/projectsData';

interface SpecModalProps {
  project: ProjectItem | null;
  onClose: () => void;
}

export const SpecModal: React.FC<SpecModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 5, 5, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '2rem',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'var(--text-muted)',
            width: '32px',
            height: '32px',
            borderRadius: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <FileText size={24} color="var(--accent-primary)" />
          <h2 className="font-display" style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            {project.name} — Architecture Specification
          </h2>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Spec Path: <code style={{ color: 'var(--accent-primary)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '2px' }}>{project.specPath}</code>
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '0', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <h3 className="font-display" style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Single Source of Truth & Acceptance Criteria</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
            {project.description}
          </p>
        </div>

        <h4 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Verified CI/CD Metric Thresholds</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Test Suite</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-verified)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={14} /> {project.metrics.unitTests} Vitest Specs Passed
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accessibility Compliance</div>
            <div style={{ fontWeight: 700, color: 'var(--accent-verified)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={14} /> {project.metrics.a11yScore}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none' }}
          >
            View Spec on GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
