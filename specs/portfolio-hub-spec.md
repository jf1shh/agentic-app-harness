# Specification: Portfolio Showcase Hub

## 1. Overview
The **Portfolio Showcase Hub** (`projects/portfolio-hub`) is a master showcase web portal for the `agentic-app-harness` monorepo. It serves as an interactive portfolio landing page for potential employers, clients, and end-users, highlighting all applications built within the Spec-Driven Development (SDD) harness.

## 2. Target Features
- **Hero & Metrics Dashboard**: Total projects built (3), cumulative test pass rate (100%), security audit score (A+), a11y compliance (WCAG 2.0 AA).
- **Interactive Project Cards**:
  - `MoodDiner` (Smart Restaurant Recommender & Table Booking)
  - `TravelPackingApp` (Smart Wardrobe & Knapsack Optimizer)
  - `SmartRecipeApp` (Smart Kitchen Recipe Manager)
- **Live Spec & Architecture Viewer**: Renders markdown specifications directly in an interactive modal.
- **Embedded Live App Launcher**: Instant preview container with quick launch options.
- **Monetization & Play Store Readiness Badges**: Highlights PWA status, Capacitor Android container availability, and freemium subscription architecture.

## 3. Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS with modern HSL CSS variables, dark glassmorphism, dynamic glow cards, and smooth micro-animations.
- **Icons**: `lucide-react`
- **Testing**: Vitest unit tests + Playwright E2E accessibility suite.
