---
name: icm-scaffold
description: "Set up an ICM (Interpretable Context Methodology) workspace on any project — generates IDENTITY.md (Layer 0), CONTEXT.md (Layer 1), and _config/ (Layer 3) tailored to the project's domain and folder structure, optionally with physical stage folders (Layer 2/4) in full mode."
user_invocable: true
---
<!-- Sourced verbatim from https://github.com/ktnCodes/icm-template SKILLS/icm-scaffold/SKILL.md,
     which ships without frontmatter upstream; the block above was added here to match this
     repo's other two ICM skills and make it invocable as /icm-scaffold. -->

# ICM Scaffold

Set up an ICM (Interpretable Context Methodology) workspace on any project — generating IDENTITY.md (Layer 0), CONTEXT.md (Layer 1), and _config/ (Layer 3) files tailored to the project's domain, folder structure, and workflow.

Based on the ICM research paper by Jake Van Clief and David McDermott, extended with Karpathy's knowledge base pattern (raw → compile → wiki → Q&A). Encodes a proven workflow tested on engineering documentation, content pipelines, and personal knowledge bases.

**Key framing:** The LLM is a **compiler**, not a chatbot. Stage contracts define inputs and structured outputs. The LLM reads sources, compiles structured deliverables, and writes them to specific locations. Conversations happen during review gates, not during execution.

## Interview

Before generating any files, ask the user these questions. Accept brief answers — infer reasonable defaults where possible.

### Required

1. **What project is this for?** (project name + one sentence description)
2. **Where does the project live?** (root directory path)
3. **What does the folder structure look like?** (list the directory or ask to scan it)
4. **What are the main workflow tasks?** (e.g., "compile docs from source notes", "research → draft → review", "investigate bugs → implement → test")
5. **Does this project involve knowledge compilation?** (i.e., raw sources → structured articles/docs/wiki) If yes, the pipeline uses the compilation archetype. If no, use generic stage contracts.
6. **Who is the audience for the outputs?** (engineers, general public, LLM agents, mixed)

### Optional (infer defaults if not answered)

7. **What voice/tone should outputs use?** Default: match the existing content style.
8. **Are there existing conventions files?** (coding standards, glossary, style guides) — if yes, reference them instead of duplicating.
9. **What model adapters do you need?** (Claude Code / Cursor / Copilot / Windsurf / none) Default: none — IDENTITY.md works with any model.
10. **Quick mode or full mode?**
   - **Quick (3-layer):** IDENTITY.md + CONTEXT.md + _config/ — routing and reference only. Best for adding ICM to an existing project without restructuring.
   - **Full (5-layer):** All of quick mode + physical stage folders with CONTEXT.md contracts + output/ directories. Best for new pipelines built from scratch.
   - Default: Quick — earn complexity before adding it.

## Generation Rules

### IDENTITY.md (Layer 0) — "Where am I?"

Generate at the project root. Must include:

1. **Opening line** — project name + one-sentence description as a blockquote
2. **Workspace Map** — folder tree with inline comments explaining each folder's role. Annotate with ICM layer numbers where applicable.
3. **Raw Source Locations** (if applicable) — folders outside the project root that feed into it. Use a table with Source, Path, and Contents columns.
4. **Related repos or external dependencies** (if applicable)
5. **Rules** — 3-7 project-specific rules. Must include:
   - Where outputs are written (compile target)
   - What not to edit (generated output directories)
   - Evidence/citation standards (if technical project)

**Constraints:**
- Target under 1,500 tokens. This is a map, not a manual.
- Use backtick code blocks for the folder tree.
- Every folder in the tree gets a comment explaining what it contains.
- If the project has existing context files (README, CLAUDE.md), reference them rather than duplicating content.

### CONTEXT.md (Layer 1) — "Where do I go?"

Generate at the project root. Must include:

1. **Routing table** — markdown table mapping tasks to destinations and what to load first. Every common workflow task must have a row.
2. **Session Start Protocol** — numbered steps an LLM follows when starting a session in this workspace.
3. **Pipeline definition** — either:
   - **Virtual stages** (quick mode): defined as sections in CONTEXT.md itself with Purpose, Inputs, Process, Outputs for each stage. Use when the project already has its own folder structure.
   - **Physical stages** (full mode): references to stage folders (`stages/01_name/CONTEXT.md`). Use when building a new pipeline from scratch.
   - **Knowledge compilation pipeline** (when Q5 = yes): use the Karpathy archetype — Ingest → Compile → Review → Publish. Each stage treats the LLM as a compiler: specific source inputs → structured article/doc output.
4. **Section-to-source mapping** (if compilation pipeline) — a table mapping each output section/topic to the raw source folders that feed it. This is the LLM's "what do I read to compile this" lookup.
5. **Shared config references** — list _config/ files with one-line descriptions.

**Constraints:**
- Virtual stages are preferred for existing projects — don't restructure what works.
- Physical stages for new pipelines only.
- Routing table must cover: the primary workflow, adding new content, reviewing content, understanding the workspace.

### _config/ Layer (Layer 3) — "What rules apply?"

Generate a `_config/` directory at the project root with:

1. **conventions.md** — naming patterns, formatting rules, project-specific standards. If an existing conventions file exists elsewhere, create a short re-export file that references the canonical source.
2. **glossary.md** — domain-specific terms and definitions. Same re-export pattern if one exists.
3. **voice.md** — tone, audience, vocabulary, evidence standards. Same re-export pattern.
4. **article-template.md** (if the project involves content generation) — template structure for new pages/articles, with section headings, guidelines, and a Sources section.

**Index file scaling:** When any _config/ or references/ folder exceeds ~10 files, generate an `_index.md` with a summary table (filename + one-line description per row). The LLM reads the index to decide what to load instead of loading everything — this keeps Layer 3 token-efficient at scale.

**Re-export pattern:** When canonical content already exists elsewhere, the _config/ file should:
- State the canonical source path at the top in a blockquote
- Include a "Quick Reference" summary (key facts only)
- Link to the canonical source for full detail

This avoids duplication while keeping the _config/ layer self-contained enough to be useful without navigating away.

### Stage Contracts (Full Mode Only)

If full mode is selected, generate physical stage folders:

```
stages/
├── 01_[name]/
│   ├── CONTEXT.md    # Stage contract with Purpose, Inputs, Process, Outputs, Routing
│   ├── references/   # Stage-specific Layer 3 material
│   └── output/       # Stage output directory (Layer 4)
├── 02_[name]/
│   └── ...
```

Each stage CONTEXT.md must have:
- **Purpose** — one sentence
- **Inputs** — exact file paths to Layer 3 refs and Layer 4 artifacts from prior stages
- **Process** — numbered steps (max 5). Frame as compilation: "read X, produce Y" — not "help me explore X."
- **Outputs** — filename pattern in `output/`
- **Routing** — next stage path, on-failure behavior

### Knowledge Compilation Pipeline (Karpathy Archetype)

When the user's workflow involves compiling knowledge from source material into structured output (documentation, wiki articles, reports), use this four-stage archetype instead of generic stages:

```
stages/
├── 01_ingest/      # Identify and catalog raw sources; produce a source inventory
├── 02_compile/     # Read sources → produce structured articles/docs with citations
├── 03_review/      # Verify compiled output against sources; flag gaps
└── 04_publish/     # Format for target platform (MkDocs, blog, wiki, etc.)
```

**Stage 02 (Compile) is the key stage.** Its contract must specify:
- **Inputs:** Explicit source file paths (not "whatever looks relevant")
- **Process:** Compile, don't summarize. Synthesize across sources, add cross-references and backlinks. Every factual claim cites a source file.
- **Outputs:** Structured article with frontmatter, section headings per the article-template, and a Sources section with file paths.

**Section-to-source mapping** (generated in CONTEXT.md) is the compiler's lookup table:

```markdown
| Output Section | Raw Sources |
|----------------|------------|
| Architecture   | reference/ARCHITECTURE.md, bugs/threading-*.md |
| Threading      | reference/Threads_And_Databus.md, wiki/threading-model |
```

This mapping ensures the LLM knows exactly what to read for each compilation unit, rather than guessing.

### Model Adapters (Optional)

If the user requests model adapters, generate the appropriate file by copying IDENTITY.md content:

| Tool | File | Format |
|---|---|---|
| Claude Code | `CLAUDE.md` | Same as IDENTITY.md with auto-generated header comment |
| Cursor | `.cursorrules` | Same content |
| GitHub Copilot | `.github/copilot-instructions.md` | Same content |
| Windsurf | `.windsurfrules` | Same content |

Add a header comment: `<!-- Auto-generated from IDENTITY.md — edit IDENTITY.md, then re-run /icm-scaffold to sync -->`

## After Generation

1. **Announce what was created** — list every file with its path and one-line purpose.
2. **Suggest next steps:**
   - "Review IDENTITY.md — does the workspace map match your mental model?"
   - "Review the routing table in CONTEXT.md — does every common task have a row?"
   - "Review _config/ files — do conventions, glossary, and voice match your project?"
   - If full mode: "Try running the pipeline on a small test case before using it at scale."
3. **Note what was NOT automated** — e.g., "Stage 2 references need to be populated with your source material."

## Quality Rules

- **Never restructure existing folders.** ICM layers are additive. The project's current folder structure stays intact.
- **Never duplicate content.** If reference material exists, re-export it. If the project has a README, reference it from IDENTITY.md.
- **Keep it lean.** IDENTITY.md < 1,500 tokens. CONTEXT.md < 2,000 tokens. _config/ files < 500 tokens each (re-exports) or < 1,000 tokens (original).
- **Match the project's voice.** If the project uses casual language, don't generate formal ICM files. If it's technical, be technical.
- **Workspace-specific rules only.** Don't include generic advice ("write clean code"). Only include rules that are specific to this project.
