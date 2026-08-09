import React, { useState } from 'react';
import { PROJECTS_DATA, ProjectItem } from './data/projectsData';
import { LOOP_STATS } from './data/loopStats.generated';
import { ProjectCard } from './components/ProjectCard';
import { SpecModal } from './components/SpecModal';
import { SkillsGrid } from './components/SkillsGrid';
import { CaseStudySection } from './components/CaseStudySection';
import { useCountUp } from './hooks/useCountUp';
import { ShieldCheck, Layers, Github, Mail, Linkedin } from 'lucide-react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/jared-f-17680b7a';

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
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '2px', padding: '1rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
      <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color, letterSpacing: '0.02em' }}>{animated}{suffix}</div>
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
          <div style={{ background: 'linear-gradient(135deg, #ff2b46 0%, #7a0c1e 100%)', padding: '10px', borderRadius: '2px', display: 'flex', boxShadow: '0 0 16px rgba(255,43,70,0.5)' }}>
            <Layers size={28} color="#ffffff" />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(90deg, var(--text-main), var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Agentic App Harness
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Spec-Driven Monorepo • Production & Play Store Portfolio</p>
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

      {/* About the Builder */}
      <section id="about-section" aria-labelledby="about-heading" className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
        <div
          aria-hidden="true"
          style={{
            width: '64px',
            height: '64px',
            flexShrink: 0,
            borderRadius: '2px',
            background: 'linear-gradient(135deg, #ff2b46 0%, #7a0c1e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 0 16px rgba(255,43,70,0.5)',
          }}
          className="font-display"
        >
          JF
        </div>
        <div style={{ flex: '1 1 480px' }}>
          <h2 id="about-heading" className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Jared Fisher — AI/Full-Stack Engineer
          </h2>
          <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem', maxWidth: '760px' }}>
            This repo is a working demonstration, not a slideshow: six production apps built and maintained by
            AI coding agents under one enforced spec-driven, test-first, accessibility-gated standard, plus a
            deterministic harness that senses drift in that standard and turns it into agent work orders on its
            own. Open to AI-assisted software engineering roles — I'm glad to walk through any of it.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <Linkedin size={18} /> Connect on LinkedIn
            </a>
            <a
              href="mailto:xjaredfisher@gmail.com"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Mail size={18} /> Email Me
            </a>
          </div>
        </div>
      </section>

      {/* Hero Banner / Metrics Bar */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '800px', marginBottom: '1.75rem' }}>
          <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>
            <ShieldCheck size={14} /> Spec-Driven Development (SDD) Verified
          </span>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Production-Grade Web & Native Android App Suite
          </h2>
          <p style={{ color: 'var(--text-body)', fontSize: '1rem', lineHeight: 1.6 }}>
            Every app in this harness is generated against single-source-of-truth Markdown specifications, featuring automated Vitest unit testing, Playwright accessibility audits (`@axe-core`), Capacitor Android containerization, and freemium subscription architecture.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem' }}>
          <AnimatedStat label="Active Monorepo Apps" value={PROJECTS_DATA.length} suffix=" Apps" color="#ff2b46" />
          <AnimatedStat
            label="Cumulative Test Suite"
            value={TOTAL_UNIT_TESTS + TOTAL_E2E_TESTS}
            suffix={` Tests (${TOTAL_UNIT_TESTS} Unit / ${TOTAL_E2E_TESTS} E2E)`}
            color="#4dfff0"
          />
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '2px', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accessibility Rate</div>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-verified)' }}>100% WCAG AA</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '2px', padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Google Play Readiness</div>
            <div className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Capacitor APK</div>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="font-display"
            style={{
              padding: '6px 16px',
              borderRadius: '2px',
              border: '1px solid',
              borderColor: activeCategory === cat ? '#ff2b46' : 'rgba(255,255,255,0.1)',
              background: activeCategory === cat ? 'linear-gradient(135deg, #ff2b46, #7a0c1e)' : 'rgba(255,255,255,0.04)',
              color: activeCategory === cat ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.75rem',
              boxShadow: activeCategory === cat ? '0 0 12px rgba(255,43,70,0.45)' : 'none',
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
        <h2 id="loop-dashboard-heading" className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          The Agentic Loop, By the Numbers
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '760px' }}>
          These figures are read directly out of <code>.agents/AGENTS.md</code> and <code>scripts/harness-status.mjs</code>
          {' '}by a generator script, never hand-typed — a Vitest test recomputes them independently and fails the build
          if the committed numbers drift from the source files.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem' }}>
          <AnimatedStat label="Guardrails Enforced in CI" value={LOOP_STATS.guardrailCount} suffix=" Guardrails" color="var(--text-main)" />
          <AnimatedStat label="Documented Learned Lessons" value={LOOP_STATS.lessonCount} suffix=" Lessons" color="var(--text-main)" />
          <AnimatedStat label="Apps Under the Same Gate" value={LOOP_STATS.appCount} suffix=" Apps" color="#4dfff0" />
        </div>
      </section>

      <CaseStudySection />

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-body)', marginBottom: '0.5rem' }}>
          Jared Fisher — AI/Full-Stack Engineer
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <a href="https://github.com/jf1shh" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Github size={16} /> github.com/jf1shh
          </a>
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            <Linkedin size={16} /> LinkedIn
          </a>
          <a href="mailto:xjaredfisher@gmail.com" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
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
