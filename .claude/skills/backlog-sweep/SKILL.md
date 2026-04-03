---
name: backlog-sweep
description: >
  Auto-trigger periodically or when tasks are completed. Scans all three tracking files
  (roadmap, tech-debt, agentic-workflows) and checks the codebase for evidence that open
  items have been resolved. Marks completed items and reports what changed.
---

Scan all tracking files and close items that are done.

## Instructions

1. **Read all three tracking files:**
   - `docs/roadmap/roadmap.md`
   - `docs/roadmap/tech-debt.md`
   - `docs/roadmap/agentic-workflows.md`

2. **For each open/planned item, check the codebase for evidence it's resolved:**

   ### Roadmap (Status: Planned → Done)
   - Search for code, files, or config that implement the described feature
   - Example: R-001 "URL-based search state" → check if `useSearchParams` or query param handling exists in page.tsx

   ### Tech Debt (Status: Open → Resolved)
   - Check if the described code issue has been fixed
   - Example: TD-001 "Extract page.tsx" → check if `src/components/` directory exists with extracted components
   - Example: TD-005 "Migrate to next/font" → check if `next/font/google` is imported in layout.tsx

   ### Agentic Workflows (Status: Planned/Idea → Implemented)
   - Check if the described automation exists and is running
   - Example: AW-007 "Code reviewer in CI" → check if a CI workflow invokes the code reviewer
   - For hooks: check `.claude/settings.json` for matching hook entries
   - For skills: check `.claude/skills/` for matching skill directories
   - For workflows: check `.github/workflows/` for matching workflow files

3. **Verification rules — be conservative:**
   - Only mark as done/resolved/active if you find clear evidence in the codebase
   - Partial implementation is NOT complete — leave it open
   - If the item says "audit" or "review", it's only done if there's evidence the audit happened AND fixes were applied
   - Don't close items just because similar code exists — verify it matches the specific description

4. **Update the tracking files:**
   - Change the Status column value
   - Do NOT delete the row — closed items stay in the table for history

5. **Report what changed:**
   ```
   ## Backlog Sweep Results

   ### Closed
   - [ID] [Title] — Evidence: [what you found]

   ### Still Open
   - [ID] [Title] — Why: [what's still missing]

   ### Partially Done
   - [ID] [Title] — Done: [what's done]. Remaining: [what's left]
   ```

## When to auto-trigger

- After a PR is merged or a significant batch of work is committed
- When the user says "done", "finished", "completed", "shipped" about a piece of work
- When `/docs-audit` runs (piggyback on the audit)
- Periodically during long sessions with many changes
