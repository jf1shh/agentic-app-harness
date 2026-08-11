---
name: icm-context-scaffold
description: "Walk a workspace tree, find folders missing a CONTEXT.md, and generate one for each based on contents. Skips folders using alternative routing (_index.md, CLAUDE.md) or too minimal to need one. Keeps ICM Layer 1 coverage complete."
user_invocable: true
argument-hint: "Optional: 'lint' to report gaps only without creating files, 'update' to create missing CONTEXT.md files (default: update)"
---

# ICM Context Scaffold

Scan the current ICM workspace and create `CONTEXT.md` files for any folder that needs one but doesn't have one yet.

## Step 1: Locate ICM Root

Find the workspace root by searching upward from the current directory for `IDENTITY.md`. If no IDENTITY.md exists, report: "No ICM workspace found. Run `/icm-scaffold` first." and stop.

## Step 2: Learn the Format

Read 2–3 existing `CONTEXT.md` files in the workspace to learn the current format and tone. At minimum read:
- The root `CONTEXT.md` (Layer 1 routing)
- One subfolder `CONTEXT.md` if it exists (Layer 2 stage contract or sub-workspace)

Extract the common structure:
- H1 title
- Purpose section (1–3 sentences)
- Folder structure (code block tree)
- Routing table (task → destination → load first)
- Optional: workflow steps, naming conventions, build commands

If no existing CONTEXT.md files exist beyond the root, use this default structure.

## Step 3: Scan for Gaps

Walk the workspace tree and identify folders that should have a CONTEXT.md but don't.

**Scan these locations:**
- Workspace root and immediate children
- Every subfolder mentioned in IDENTITY.md's folder map
- Stage folders (if full mode ICM with physical stages)
- Any folder more than 2 levels deep that contains 3+ files or has its own subfolders

## Step 4: Decide What to Skip

A folder does NOT need a CONTEXT.md if any of these are true:

| Condition | Example |
|-----------|---------|
| Already has `CONTEXT.md` | Existing ICM workspaces |
| Has `CLAUDE.md` that serves as routing | Projects with their own CLAUDE.md |
| Uses `_index.md` for routing | Wiki sections, Obsidian vaults |
| Is a build output or generated folder | `build/`, `dist/`, `node_modules/`, `.next/` |
| Is a git/config/IDE folder | `.git/`, `.vscode/`, `.claude/`, `__pycache__/` |
| Is an ICM infrastructure folder | `_config/`, `references/`, `output/` |
| Contains only a single file | Not yet a real project |
| Is empty | No files to describe |
| Is a data/media folder | Images, exports, attachments |

## Step 5: Generate CONTEXT.md Content

For each folder that needs a CONTEXT.md:

1. **Read existing docs** — check for README.md, SPIKE_*.md, PIPELINE.md, package.json, or any file that explains the folder's purpose
2. **List contents** — enumerate subfolders and key files on disk
3. **Infer purpose** — from file names, parent CONTEXT.md references, and IDENTITY.md descriptions
4. **Determine type** — is this a project, a sub-workspace, a study area, a stage folder, or a container?

### Template

```markdown
# [Folder Name]

## Purpose

[1–3 sentences. What is it, what's its current status, who uses it.]

---

## Folder Structure

```
[folder-name]/
├── [file/folder]    # [brief description]
└── ...
```

---

## Routing

| Task | Go To | Load First |
|------|-------|------------|
| [common task 1] | [relevant file/folder] | [context file if any] |
| [common task 2] | [relevant file/folder] | [context file if any] |
```

### Content Rules

- **Do not invent information.** Only describe what exists on disk or is documented in nearby files.
- **Match the workspace tone.** Read existing CONTEXT.md files and match their style — concise and direct.
- **Include build commands** if the folder is a project with a package.json, CMakeLists.txt, Makefile, or similar.
- **Container folders** (folders that just hold other project folders) get a simpler format: purpose + contents table only. No routing needed.
- **Stage folders** get the stage contract format: Purpose, Inputs, Process, Outputs, Routing.
- **Routing tables** should have 3–5 rows covering the most common tasks for that folder type.
- **Keep each CONTEXT.md under 500 tokens** — it's a routing file, not documentation.

## Step 6: Create or Report

**If argument is `lint`:**
- List every folder that needs a CONTEXT.md
- Show what alternative routing exists (if any)
- Do NOT create any files
- End with: "Run `/icm-context-scaffold update` to create these files."

**If argument is `update` (default):**
- Create each missing CONTEXT.md
- Do NOT overwrite any existing CONTEXT.md — ever
- Do NOT modify any other files
- After creating, run a quick check: does the parent CONTEXT.md or IDENTITY.md reference this folder? If not, note it: "Also run `/icm-sync` to update IDENTITY.md routing."

## Step 7: Report

Output a summary:

```
## ICM Context Scaffold Report — YYYY-MM-DD

### Created
- [folder/CONTEXT.md] — [one-line description]

### Skipped (already has routing)
- [folder] — has [CONTEXT.md | CLAUDE.md | _index.md]

### Skipped (not needed)
- [folder] — [reason: empty | data-only | single file | build output | ICM infrastructure]

### Needs /icm-sync
- [list of created files whose parent routing doesn't reference them yet]

### No gaps found
[if everything is covered]
```

If in `update` mode, confirm: "CONTEXT.md files have been created."
If in `lint` mode, confirm: "No files were changed."
