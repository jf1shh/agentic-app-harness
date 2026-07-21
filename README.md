# AI Building Harness

Welcome to your specialized AI Building Harness. This repository is designed to facilitate **Spec-Driven Development (SDD)** with AI agents. 

It acts as a monorepo for your applications (e.g., travel packing app, recipe app, restaurant finder) and enforces a strict, predictable workflow to prevent "intent drift" during AI code generation.

## Directory Structure

- `projects/`: The monorepo workspace containing all generated apps.
- `specs/`: Markdown specifications for every app and component. These are the **single source of truth**.
  - `templates/`: Boilerplate markdown files for starting new specs.
- `scripts/`: Utility scripts (e.g., scaffolding new apps).
- `.agents/`: Harness Control Layer. Contains `AGENTS.md` which dictates the strict rules AI agents must follow when working in this repository.

## Spec-Driven Development Workflow

1. **Define**: Never start coding right away. Always create a specification in `specs/` using one of the templates in `specs/templates/`.
2. **Review**: Ensure the spec accurately reflects the desired architecture and user stories.
3. **Scaffold**: Run `.\scripts\scaffold-app.ps1 <AppName>` to initialize the boilerplate in `projects/`.
4. **Execute**: The AI reads the spec and implements the code. If the AI encounters an ambiguity, it must update the spec before continuing.
5. **Verify**: Ensure the implementation strictly matches the spec.

## Tech Stack
The optimal tech stack for modern, efficient AI-generated web apps in this harness defaults to:
- **Frontend/Fullstack**: Next.js (App Router) or React + Vite
- **Styling**: Vanilla CSS or Tailwind CSS
- **Backend (if separated)**: Node.js / Express or Python

*Note: You can override these defaults per project in their respective specifications.*
