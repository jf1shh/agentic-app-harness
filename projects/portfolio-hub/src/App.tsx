import React, { useState } from 'react';
import { PROJECTS_DATA, ProjectItem } from './data/projectsData';
import { ProjectCard } from './components/ProjectCard';
import { SpecModal } from './components/SpecModal';
import { ShieldCheck, Layers, Github } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedSpecProject, setSelectedSpecProject] = useState<ProjectItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Dining', 'Utility', 'Kitchen'];

  const filteredProjects = PROJECTS_DATA.filter((p) => {
    if (activeCategory === 'All') return true;
    return p.category === activeCategory;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <Layers size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Agentic App Harness
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Spec-Driven Monorepo • Production & Play Store Portfolio</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="https://github.com/jf1shh/agentic-app-harness"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Github size={18} /> GitHub Repository
          </a>
        </div>
      </header>

      {/* Hero Banner / Metrics Bar */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '800px', marginBottom: '1.75rem' }}>
          <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>
            <ShieldCheck size={14} /> Spec-Driven Development (SDD) Verified
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Production-Grade Web & Native Android App Suite
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6 }}>
            Every app in this harness is generated against single-source-of-truth Markdown specifications, featuring automated Vitest unit testing, Playwright accessibility audits (`@axe-core`), Capacitor Android containerization, and freemium subscription architecture.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Monorepo Apps</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{PROJECTS_DATA.length} Apps</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cumulative Test Suite</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>26 Tests Passed</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Accessibility Rate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>100% WCAG AA</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Google Play Readiness</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1' }}>Capacitor APK</div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              border: '1px solid',
              borderColor: activeCategory === cat ? '#6366f1' : 'rgba(255,255,255,0.1)',
              background: activeCategory === cat ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.04)',
              color: activeCategory === cat ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
            id={`filter-cat-${cat.toLowerCase()}`}
          >
            {cat} Apps
          </button>
        ))}
      </div>

      {/* Project Cards Grid */}
      <div className="project-grid" style={{ marginBottom: '3rem' }}>
        {filteredProjects.map((proj) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            onOpenSpec={setSelectedSpecProject}
          />
        ))}
      </div>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        Agentic App Harness • Built with React, Vite, TypeScript, Vitest, Playwright & Capacitor • Prepared for Google Play Store Submission
      </footer>

      {/* Modals */}
      <SpecModal
        project={selectedSpecProject}
        onClose={() => setSelectedSpecProject(null)}
      />
    </div>
  );
};
