---
name: backlog
description: Add items to project tracking files (roadmap, tech-debt, agentic-workflows). Auto-routes based on content.
---

Add an item to the appropriate project tracking file. Auto-route based on content.

Input: $ARGUMENTS

## Instructions

1. **Auto-route to the correct file** based on what the user described. Do NOT ask which file — infer it:

   | Signal | File | ID prefix |
   |--------|------|-----------|
   | User-facing feature, product behaviour, UX, new capability | `docs/roadmap/roadmap.md` | R-NNN |
   | Code smell, refactor, bug-adjacent, performance, design flaw, missing tests, accessibility | `docs/roadmap/tech-debt.md` | TD-NNN |
   | Automation, agent, subagent, skill, hook, workflow, CI/CD, bot, scheduled task | `docs/roadmap/agentic-workflows.md` | AW-NNN |

   If genuinely ambiguous (rare), state your best guess and ask to confirm. Never ask "which file?" as a first response.

2. **Auto-assign priority/section** based on urgency signals in the description:
   - Roadmap: Near-Term (quick wins, dependencies for other work), Medium-Term (significant effort), Long-Term (exploratory)
   - Tech Debt: High (blocks other work or affects users), Medium (improves quality), Low (nice to have)
   - Agentic: Active (already running), Planned (ready to build), Idea (exploratory)

3. **Read the target file** to find the last used ID and increment it.

4. **Extract from the user's input**:
   - **Title** — short name (infer from description if not explicit)
   - **Description** — one-line explanation
   - **Assigned** — use name if mentioned, otherwise `Unassigned`

5. **Add the row** to the correct table in the correct section with status:
   - Roadmap: `Planned` | `In Progress` | `Done`
   - Tech Debt: `Open` | `In Progress` | `Resolved`
   - Agentic Workflows: `Idea` | `Planned` | `Active`

6. **Confirm** with a one-liner: what was added, the ID, which file, which section.

## Examples

- `/backlog Let users bookmark courses for later` → R-009 in roadmap Near-Term
- `/backlog page.tsx has no error boundary` → TD-012 in tech-debt High
- `/backlog Auto-translate course descriptions to French using Claude` → AW-014 in agentic Ideas
- `/backlog Fuzzy search so typos still find courses` → R-003 already exists, flag duplicate
