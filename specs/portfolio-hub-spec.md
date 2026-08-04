# Specification: Portfolio Showcase Hub

## 1. Overview
The **Portfolio Showcase Hub** (`projects/portfolio-hub`) is a master showcase web portal for the `agentic-app-harness` monorepo. It serves as an interactive portfolio landing page for potential employers, clients, and end-users, highlighting all applications built within the Spec-Driven Development (SDD) harness.

## 2. Target Features
- **Hero & Metrics Dashboard**: Total projects built, cumulative unit + E2E test count, security audit score, a11y compliance (WCAG 2.0/2.1 AA). Numeric stats animate from 0 up to their value on mount via `useCountUp`, skipping the animation entirely under `prefers-reduced-motion`. Every number is derived from `PROJECTS_DATA` at render time — never hand-typed — so it cannot drift stale against the dataset the cards themselves render from.
- **Interactive Project Cards** (one per app in `PROJECTS_DATA`, currently 5): category badge, tagline, description, verification metrics, tech-stack chips, and a category filter bar. Cards lift on hover/focus with a glow shadow (disabled under `prefers-reduced-motion`).
- **Real Code Snippet per Card**: an expandable `<details>` disclosure ("View Code Snippet") revealing a short, real excerpt pulled directly from that app's own shipped source, captioned with its exact `projects/<app>/...` source path. This is a citation, not a decorative mockup — `portfolioData.test.ts` asserts every shipped snippet's `sourcePath` actually starts inside that project's own directory.
- **Engineering Skills Showcase**: a grid of skill cards (`SKILLS_DATA`, `src/data/skillsData.ts`) — each names a cross-cutting engineering skill demonstrated across the monorepo (spec-driven development, contract-first Zod schemas, TDD/BDD testing, accessibility engineering, security/privacy architecture, PWA/native Android delivery, deterministic harness engineering, in-browser ML/RAG) and expands to show concrete supporting evidence. Every evidence string is either a fact grep-able in this repository or a count derived live from `PROJECTS_DATA`, per the "Cite Confidence, Not Just Sources" discipline — no unsubstantiated skill claims.
- **Live Spec & Architecture Viewer**: Renders markdown specifications directly in an interactive modal.
- **Embedded Live App Launcher**: Instant preview container with quick launch options.
- **Monetization & Play Store Readiness Badges**: Highlights PWA status, Capacitor Android container availability, and freemium subscription architecture.

## 3. Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with modern HSL CSS variables, dark glassmorphism, dynamic glow cards, and smooth micro-animations.
- **Icons**: `lucide-react`
- **Testing**: Vitest unit tests + Playwright E2E accessibility suite.
