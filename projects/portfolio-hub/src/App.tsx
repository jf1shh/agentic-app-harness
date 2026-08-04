import React, { useState } from 'react';
import { PROJECTS_DATA, ProjectItem } from './data/projectsData';
import { LOOP_STATS } from './data/loopStats.generated';
import { ProjectCard } from './components/ProjectCard';
import { SpecModal } from './components/SpecModal';
import { SkillsGrid } from './components/SkillsGrid';
import { CaseStudySection } from './components/CaseStudySection';
import { useCountUp } from './hooks/useCountUp';
import { ShieldCheck, Layers, Github, Mail } from 'lucide-react';

const TOTAL_UNIT_TESTS = PROJECTS_DATA.reduce((sum, p) => sum + p.metrics.unitTests, 0);
const TOTAL_E2E_TESTS = PROJECTS_DATA.reduce((sum, p) => sum + p.metrics.e2eTests, 0);

interface AnimatedStatProps {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}

const AnimatedStat: React.FC<AnimatedStatProps> = ({ label, value, suffix = '', color }) => {
  const animated = useCountUp(value);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{animated}{suffix}</div>
    </div>
  );
};

export const App: React.FC = () => {
  const [selectedSpecProject, setSelectedSpecProject] = useState<ProjectItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Legal', 'Dining', 'Utility', 'Kitchen', 'Family Finance'];

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
          <AnimatedStat label="Active Monorepo Apps" value={PROJECTS_DATA.length} suffix=" Apps" color="#f59e0b" />
          <AnimatedStat
            label="Cumulative Test Suite"
            value={TOTAL_UNIT_TESTS + TOTAL_E2E_TESTS}
            suffix={` Tests (${TOTAL_UNIT_TESTS} Unit / ${TOTAL_E2E_TESTS} E2E)`}
            color="#10b981"
          />
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
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

      <SkillsGrid />

      {/* The Agentic Loop, By the Numbers */}
      <section aria-labelledby="loop-dashboard-heading" style={{ marginBottom: '3rem' }}>
        <h2 id="loop-dashboard-heading" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
          The Agentic Loop, By the Numbers
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '760px' }}>
          These figures are read directly out of <code>.agents/AGENTS.md</code> and <code>scripts/harness-status.mjs</code>
          {' '}by a generator script, never hand-typed — a Vitest test recomputes them independently and fails the build
          if the committed numbers drift from the source files.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem' }}>
          <AnimatedStat label="Guardrails Enforced in CI" value={LOOP_STATS.guardrailCount} suffix=" Guardrails" color="#f59e0b" />
          <AnimatedStat label="Documented Learned Lessons" value={LOOP_STATS.lessonCount} suffix=" Lessons" color="#6366f1" />
          <AnimatedStat label="Apps Under the Same Gate" value={LOOP_STATS.appCount} suffix=" Apps" color="#10b981" />
        </div>
      </section>

      <CaseStudySection />

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: '0.5rem' }}>
          Jared Fisher — AI/Full-Stack Engineer
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <a href="https://github.com/jf1shh" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Github size={16} /> github.com/jf1shh
          </a>
          <a href="mailto:xjaredfisher@gmail.com" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Mail size={16} /> xjaredfisher@gmail.com
          </a>
        </div>
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
