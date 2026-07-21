# Project Specification: [App Name]

## 1. Product Overview
**Name:** [App Name]
**Description:** A brief, 1-2 sentence description of what this app does.
**Target Audience:** Who is this for?

## 2. Core Features
- [ ] Feature 1: Description
- [ ] Feature 2: Description
- [ ] Feature 3: Description

## 3. Architecture & Tech Stack
- **Frontend:** Next.js (App Router) / React + Vite / etc.
- **Styling:** Vanilla CSS / Tailwind CSS
- **Backend/API:** Next.js API Routes / Node.js Express / Python / None
- **Database:** PostgreSQL / Supabase / Firebase / LocalStorage / None
- **Deployment:** Vercel / Netlify / Custom

## 4. Data Models
Define the core entities and their properties.
```typescript
// Example:
interface User {
  id: string;
  name: string;
  email: string;
}
```

## 5. UI/UX Design System
- **Color Palette:** Primary, Secondary, Background, Text colors.
- **Typography:** Main fonts.
- **Micro-interactions:** Define standard hover effects or animations.

## 6. Testing & Compliance (Security, Privacy, Optimization)
- **Unit Tests:** Core logic must have 100% test coverage (Vitest).
- **Security & Privacy:** Ensure no PII is logged. Audit dependencies.
- **Optimization:** Lighthouse score target >90.

## 7. Acceptance Criteria
List the criteria that must be met for the MVP (Minimum Viable Product) to be considered complete.
1. Criterion 1
2. Criterion 2

## 8. Open Questions / Unresolved Architecture
- List any unresolved decisions here. AI agents should help resolve these before coding.
