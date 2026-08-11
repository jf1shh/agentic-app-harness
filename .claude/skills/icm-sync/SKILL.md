---
name: icm-sync
description: "Scan a workspace, diff it against IDENTITY.md and CONTEXT.md routing files, and update both to reflect new folders, removed paths, and status changes. Keeps ICM Layer 0 and Layer 1 accurate as the workspace evolves."
user_invocable: true
argument-hint: "Optional: 'lint' to report only without editing, 'update' to apply changes (default: update)"
---

# ICM Sync

Scan the current workspace and re-sync the ICM routing files (`IDENTITY.md` and `CONTEXT.md`) so any LLM session can navigate the workspace correctly.

## Step 1: Locate ICM Root

Find the workspace root by searching upward from the current directory for `IDENTITY.md`. If no IDENTITY.md exists, report: "No ICM workspace found. Run `/icm-scaffold` first." and stop.

Read these files to understand what is currently documented:
- `IDENTITY.md` — folder map tree, rules, any stage or project tables
- `CONTEXT.md` — routing table, session start protocol, pipeline stages (virtual or physical)
- `CLAUDE.md` (if it exists) — model adapter synced from IDENTITY.md

## Step 2: Scan the Actual Workspace

List the workspace contents on disk:
- Note every folder and key file at the root level
- For each folder mentioned in IDENTITY.md, list its current subfolders
- For stage folders (if full mode), list each stage's contents
- For `_config/` and `references/` folders, list files present

## Step 3: Diff — Find Gaps

Compare what's on disk vs. what's documented in IDENTITY.md and CONTEXT.md. Identify:

**New items (on disk, NOT in IDENTITY.md):**
- New top-level folders
- New subfolders inside documented folders
- New `_config/` or `references/` files
- New stage folders (full mode)

**Stale items (in IDENTITY.md, NOT on disk):**
- Folder paths in the map that no longer exist
- Stage folders referenced in routing that were removed
- _config/ files listed that were deleted

**Routing drift (CONTEXT.md references paths that don't exist):**
- Routing table entries pointing to missing folders
- Virtual stage inputs referencing deleted files
- Session start protocol referencing files that moved

**Status drift (may need updating):**
- Projects or sections marked as one status but clearly changed (e.g., empty folder now has real content)

## Step 4: Resolve New Items

For each new folder or file found that isn't in IDENTITY.md:

If it has a `CONTEXT.md` or `README.md`: read it to determine purpose.
If it doesn't: infer from folder name and contents.

Assign a one-line description and annotate with the appropriate ICM layer:
- `# Layer 2 — stage contract` for stage folders
- `# Layer 3 — reference material` for _config/ and references/
- `# Layer 4 — working artifacts` for output/ folders
- No annotation for non-ICM folders

If a folder's purpose is genuinely unclear, note it as "needs classification" with a `[?]` placeholder — do NOT skip it.

## Step 5: Update IDENTITY.md (Layer 0)

If argument is `lint`: skip this step and report only.
If argument is `update` or no argument: apply all changes.

**Folder map updates:**
- Add new folders in the correct position within the tree
- Mark removed folders with `# [REMOVED - verify]` rather than deleting outright
- Update inline comments on changed folders

**Stage/project table updates (if present):**
- Add new rows for new stages or sections
- Flag stale paths with `⚠️`

**Do not change:**
- The opening line (project name + description)
- The Rules section (unless rules reference deleted paths)

**Token constraint:** Keep IDENTITY.md under 1,500 tokens. If adding items would exceed this, note in the report: "IDENTITY.md is near token budget — consider splitting into sub-workspace IDENTITY files."

## Step 6: Update CONTEXT.md (Layer 1)

**Routing table:**
- Add rows for any new folders that have their own CONTEXT.md
- Remove or flag rows pointing to deleted folders
- Update file paths in virtual stage definitions if files moved

**Pipeline stages (if applicable):**
- For virtual stages: verify that every input file path still exists. Flag broken paths.
- For physical stages: verify each stage folder exists. Flag missing ones.
- For compilation pipelines: verify the section-to-source mapping table entries still match actual source locations.

**Session start protocol:** Keep unchanged unless it references deleted files.

## Step 7: Sync Model Adapters

If any model adapter files exist (CLAUDE.md, .cursorrules, .github/copilot-instructions.md, .windsurfrules):
- Compare their content against IDENTITY.md
- If they differ from IDENTITY.md (beyond the auto-generated header comment): flag as "out of sync"
- If argument is `update`: regenerate them from IDENTITY.md with the appropriate header comment

## Step 8: Check Sub-Workspace Routing

For every subfolder that has its own `CONTEXT.md` (excluding the root), check whether the file is stale:

A CONTEXT.md is **stale** if:
- Its folder structure section lists folders that no longer exist on disk
- Its folder structure section is missing folders that now exist
- Its routing table references files that were moved or deleted

If argument is `update`: make targeted edits (add missing, flag removed). Do NOT rewrite the entire file.
If argument is `lint`: report which files are stale and what changed.

### Folders to skip
- Build output folders (`build/`, `dist/`, `.next/`, `node_modules/`)
- Git/config folders (`.git/`, `.vscode/`)
- Folders using `_index.md` for routing instead of CONTEXT.md

## Step 9: Check Index Files

For every `_config/` or `references/` folder that has an `_index.md`:
- Verify every file listed in the index still exists
- Check for files on disk not listed in the index
- If argument is `update`: add missing entries, flag removed ones
- If argument is `lint`: report drift

For folders that exceed ~10 files but have no `_index.md`:
- Flag as "needs index file" in the report

## Step 10: Report

Always output a summary, whether lint or update mode:

```
## ICM Sync Report — YYYY-MM-DD

### IDENTITY.md updates
- Added: [folder/file] — [description]
- Flagged stale: [folder/file] — [reason]

### CONTEXT.md updates
- Added route: [task] → [destination]
- Flagged broken: [route] — [reason]
- Pipeline input verified / broken: [details]

### Model adapters
- [file] — in sync / out of sync / regenerated

### Sub-workspace CONTEXT.md
- [folder/CONTEXT.md] — refreshed / up to date / stale (lint mode)

### Index files
- [folder/_index.md] — updated / up to date / needs creation

### Needs classification
- [folder] — found on disk, purpose unclear

### No changes needed
[if nothing changed]
```

If in `update` mode, confirm: "ICM routing files have been updated."
If in `lint` mode, confirm: "No files were changed. Run `/icm-sync update` to apply."
