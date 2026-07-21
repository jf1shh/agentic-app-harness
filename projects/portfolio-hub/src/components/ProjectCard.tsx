import React from 'react';
import { ExternalLink, FileText, DollarSign } from 'lucide-react';
import { ProjectItem } from '../data/projectsData';

interface ProjectCardProps {
  project: ProjectItem;
  onOpenSpec: (proj: ProjectItem) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpenSpec }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Category & Badges Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span className="badge badge-indigo">{project.category}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {project.pwaReady && <span className="badge badge-emerald" title="Installable PWA Web App">PWA</span>}
          {project.capacitorAndroid && <span className="badge badge-amber" title="Native Android Play Store Container">Android APK</span>}
          {project.monetized && <span className="badge badge-indigo" title="Freemium Subscription Enabled"><DollarSign size={12} /> Monetized</span>}
        </div>
      </div>

      <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem', color: '#ffffff' }}>
        {project.name}
      </h3>

      <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.75rem' }}>
        {project.tagline}
      </p>

      <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.5 }}>
        {project.description}
      </p>

      {/* Metrics Row */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Metrics</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' }}>
          <span>Vitest: <strong style={{ color: '#10b981' }}>{project.metrics.unitTests} Unit Tests</strong></span>
          <span>A11y: <strong style={{ color: '#10b981' }}>WCAG 2.0 AA</strong></span>
        </div>
      </div>

      {/* Tech Stack Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
        {project.techStack.map((tech, idx) => (
          <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>
            {tech}
          </span>
        ))}
      </div>

      {/* Card Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
        <button
          onClick={() => onOpenSpec(project)}
          className="btn-secondary"
          style={{ flex: 1, justifyContent: 'center' }}
          id={`view-spec-btn-${project.id}`}
        >
          <FileText size={16} /> View Spec
        </button>

        <a
          href={project.demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
          id={`launch-app-btn-${project.id}`}
        >
          <ExternalLink size={16} /> Launch App
        </a>
      </div>
    </div>
  );
};
