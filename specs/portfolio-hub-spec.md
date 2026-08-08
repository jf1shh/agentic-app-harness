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
- **Applied ML / Retrieval Architecture Detail**: for any project whose app runs a real ML or retrieval pipeline (currently `legal-financial-rag`, `smart-recipe-app`), the card carries an optional `mlArchitecture` block — an approach summary, an ordered list of pipeline steps each citing a real `projects/<app>/...` source path, and (where one exists) the eval/quality methodology that gates it in CI. Rendered as its own expandable disclosure next to the code snippet, not folded into the tagline — a reader must be able to tell "uses embeddings" from "here is the exact pipeline and how its precision is measured, kept honest by the same real-path-citation discipline as the code snippet (`portfolioData.test.ts` asserts every `sourcePath` starts inside that project's own directory)."
- **Case Studies**: a section presenting real production incidents from this monorepo's own history — problem, root cause, fix, and the exact mechanism that now catches a recurrence — sourced from `.agents/AGENTS.md` §6/§9. Every case study names either a guardrail id (which must exist in `scripts/harness-status.mjs`'s `GUARDRAILS` array) or another concrete enforcement mechanism (a script path that must exist on disk); a unit test verifies the citation is real, the same discipline as the snippet source-path check above — a fabricated "lesson learned" is worse than none.
- **Loop Dashboard**: a small stats panel — number of guardrails, number of documented `.agents/AGENTS.md` §6 lessons, apps under management — computed by a generator script reading `.agents/AGENTS.md` and `scripts/harness-status.mjs` directly, never hand-typed, with a Vitest test that recomputes the same counts from the same source files and fails the build on drift between the committed generated data and the source of truth.
- **Author & Contact**: the header and footer credit the site's author by name/title and link a GitHub profile and a contact email — this is a portfolio site for a specific person, not an anonymous project showcase.

## 3. Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with CSS custom properties, a cyberpunk red/black visual identity (§4), and glow-on-hover cards.
- **Icons**: `lucide-react`
- **Testing**: Vitest unit tests + Playwright E2E accessibility suite.

## 4. Visual Identity — Cyberpunk Red/Black

### 4.1 Rationale
Explicit direction from the site's author: a bold, high-energy "cyberpunk red and black" identity,
replacing the indigo/amber/emerald glassmorphism the site shipped with. This is the right call for
`portfolio-hub` specifically — per §1 it exists to be memorable to "potential employers, clients, and
end-users," not to support a stressed-user decision under pressure (`elder-care-planner`) or project
neutral trust in sensitive data (`legal-financial-rag`). An expressive, opinionated visual identity is
appropriate here in a way §5's design systems for those two apps deliberately are not — the per-app
divergence this repo already commits to (see `elder-care-planner` spec §5) cuts both ways.

### 4.2 Color palette — revised: mostly black, red as a highlight
The first pass of this identity used neon red as the *primary* accent — taglines, every badge, every
label, every border, the whole grid/scanline texture — which reads as "a red site" rather than "a black
site with red highlights." Direct follow-up from the site's author corrected this: **black/neutral
carries the page; red is spent only on a short, deliberate list of moments that earn it.** This is the
same discipline as the "spend your boldness in one place" design principle — a highlight stops being one
the moment it's everywhere.

Red is used **only** for: primary-action buttons (`.btn-primary`), the active/selected state (the
selected category filter pill, `.tab`-style active indicators), the hover/focus glow on interactive
cards, the header logo mark, the hero `<h1>`'s gradient, and exactly **one** flagship stat ("Active
Monorepo Apps"). Every other previously-red surface — taglines, category/feature badges, disclosure
chevrons, case-study labels, code-block paths, stat numbers other than the one flagship, panel borders,
button *resting* states, the background grid/scanlines, the SpecModal's icon/heading/chip — moves to a
neutral gray/white scale. Cyan is untouched: it remains the sole "verified/passed" signal (test counts,
a11y compliance, guardrail counts) and was never part of the "too much red" problem.

All pairs below are verified against the actual `@axe-core/playwright` sweep (not eyeballed), per the
a11y lesson in `.agents/AGENTS.md` §6 — every color used as *text* on the void/card background clears
4.5:1, computed before implementation and confirmed by the harness run at the end.
- **Void background** `#0a0a0c` (neutral near-black — the red undertone from the first pass is gone,
  since even the background contributed to the "too red" read), **surface** `#131316`, **glass card**
  `rgba(19, 19, 22, 0.72)`.
- **Neon red** `#ff2b46` — reserved for the moments listed above. Contrast ≥ 5.4:1 against the void
  background where it does carry text (the flagship stat).
- **Deep red** `#7a0c1e` — decorative only (the button/logo gradient's dark stop, the hover-glow color).
  Mid red (`#b3273f`) from the first pass is retired along with the badge it colored (§4.4) — nothing in
  the revised palette needs a red that can't carry text.
- **Terminal cyan** `#4dfff0` — unchanged: the one deliberate cold counter-accent, reserved for
  "passed/verified" signals, used sparingly (numbers, small icons, bullet dots) and never as a
  background.
- **Neutral grays** (replacing the previous warm-red-tinted text scale and the retired soft-pink
  tertiary accent): near-white `#f5f5f7` (primary text), light gray `#d4d4d8` (body — taglines and
  descriptions now live here instead of on red), mid gray `#9a9aa5` (muted), dark gray `#6c6c76` (dim).
  Borders default to `rgba(255,255,255,0.08)`; only the hover/active highlight moments switch to a red
  border.

### 4.3 Typography
- **Headings**: monospace (`ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Consolas,
  monospace`), uppercase, wide letter-spacing — a terminal/HUD register in place of the clean
  sans-serif hero type the site shipped with.
- **Body copy**: stays a system sans stack for readability — monospace is a display device here, not a
  paragraph font.
- **No webfont import**: every app in this repo commits to system font stacks (see the mood-diner and
  elder-care-planner specs); this holds the line rather than departing from it, and keeps
  `production-bundle.spec.ts`'s no-failed-requests guarantee resting on the same origin the app already
  ships from.

### 4.4 Motifs
- **Angular panel corners**: `.glass-panel` trades its rounded `border-radius` for a `clip-path` cut
  corner (top-left and bottom-right), the single biggest silhouette change from "generic dark
  dashboard" to "terminal/HUD panel."
- **Scanlines + grid**, both static (not animated): the page background layers a fine repeating-line
  scanline texture and a faint grid pattern — both neutral gray now, not red-tinted, per §4.2 — under a
  faint red glow at the very top of the page, the one atmospheric red touch that survives as ambient
  rather than structural. Being static rather than animated, this motif needs no
  `prefers-reduced-motion` gate — the existing motion the page already disables under that preference
  (hover lift, count-up) is untouched.
- **Neon glow borders on hover/focus only** (red box-shadow bloom): the *resting* state of every
  interactive element (buttons, filter pills, cards) is neutral; red appears only once a pointer or
  focus ring lands on it, which is what makes it read as a highlight rather than a base color.
- **Two-tier badge system**: the "verified" badge (PWA capability) is cyan text on a cyan-tinted
  background (≥16:1) — unchanged. Every other badge (the hero "SDD Verified" badge, category tags,
  "Android APK," "Monetized") is now a single neutral treatment — light text on a faint white-tinted
  background — since none of them are the kind of moment §4.2 reserves red for, and coloring all of them
  red was the single biggest contributor to the "too much red" read the badges appeared on every card.

### 4.5 What doesn't change
Layout, information architecture, and every existing responsive-grid pattern stay as-is — this is a
reskin, not a restructure. `SpecModal`'s CI/CD metric grid moves onto the same
`repeat(auto-fit, minmax(min(N,100%),1fr))` pattern the rest of the page already uses, since a fixed
two-column `repeat(2, 1fr)` was the one place that pattern hadn't been applied — a genuine mobile-width
fix surfaced while touching this file, not a scope expansion.
