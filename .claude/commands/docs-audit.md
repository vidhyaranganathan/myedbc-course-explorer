Audit all documentation in this repo against the current codebase state. Find and fix anything stale.

## Scope

Check these doc files against the actual code:

1. **CLAUDE.md** — project overview, structure tree, tech stack versions, commands, data pipeline, architecture decisions, code conventions
2. **docs/architecture/overview.md** — system diagram, component descriptions, design principles
3. **docs/architecture/tech-stack.md** — versions and technology choices
4. **docs/onboarding/getting-started.md** — setup steps, commands, project description
5. **docs/onboarding/data-pipeline.md** — data flow, field lists, row counts
6. **docs/decisions/*.md** — each ADR's claims about the codebase
7. **docs/roadmap/roadmap.md** — check if any "planned" items have been implemented
8. **docs/roadmap/tech-debt.md** — check if any items have been resolved

## Checks to run

For each doc file, verify against the source of truth:

### Versions & Dependencies
- Read `package.json` and compare against all version claims in docs
- Flag any version mismatches

### Project Structure
- Run `find src/ scripts/ docs/ .claude/ .github/ -type f` and compare against structure trees in CLAUDE.md and architecture docs
- Flag missing or extra files

### Data Counts
- Count entries in `src/data/courses.json` and `src/data/course-details.json`
- Compare against all row/entry count claims in docs

### Commands
- Read `package.json` scripts and compare against documented commands
- Flag missing or renamed scripts

### Code Patterns
- Read `src/lib/types.ts` and check that documented type definitions match actual
- Read `src/lib/search.ts` and verify documented filter fields match actual Filters interface
- Check that `src/app/page.tsx` patterns (deduplication key, grade set, page size) match docs

### ADR Accuracy
- For each ADR, verify the claims still hold (e.g., "no database" — check there's no DB dependency; "client-side search" — check no server-side search endpoints)

### Roadmap Completion
- For each unchecked roadmap item, search the codebase for evidence it's been implemented
- For each tech debt item, check if the code has been refactored

## Output

Produce a report in this format:

```
## Docs Audit Report

### ✅ Up to date
- [list files that are accurate]

### ⚠️ Stale (needs update)
- **file.md**: what's wrong → what it should say

### 🗑️ Resolved items
- **roadmap.md**: "item X" has been implemented (evidence: file.ts)
- **tech-debt.md**: "item Y" has been resolved (evidence: file.ts)
```

After presenting the report, ask the user if they want you to fix the stale items. If yes, update each file.
