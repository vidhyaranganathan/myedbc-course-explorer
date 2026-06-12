# Product Roadmap

Product features only. For code/design issues see [tech-debt.md](tech-debt.md). For automation ideas see [agentic-workflows.md](agentic-workflows.md).

## Current State

BC Course Finder is a functional single-page app with search and filtering across BC high school courses. The Supabase data layer is live — 3,951 courses (2023 Graduation Program, grades 10-12) and 5,569 course detail entries loaded from the BC Ministry's live Excel and BC Course Registry. The app still reads from static JSON (interim); the next step is wiring the UI to Supabase queries.

## Near-Term

| ID | Feature | Description | Assigned | Status |
|----|---------|-------------|----------|--------|
| R-001 | URL-based search state | Encode filters in URL query params so searches are shareable and bookmarkable | Unassigned | Planned |
| R-002 | Course comparison | Select multiple courses to compare side-by-side | Unassigned | Planned |
| R-003 | Improved search | Fuzzy matching, search highlighting, relevance ranking | Unassigned | Planned |
| R-011 | Fill missing course descriptions | ~951 of 5,569 courses have no `publishedDescription` (mostly French-language and newer courses). Scrape from BC curriculum website or use browser-based search to retrieve descriptions for the remaining courses | Unassigned | Planned |

## Medium-Term

| ID | Feature | Description | Assigned | Status |
|----|---------|-------------|----------|--------|
| R-004 | Graduation planning | Help students see which courses satisfy grad requirements | Unassigned | Planned |
| R-005 | Mobile optimization | Responsive design improvements for smaller screens | Unassigned | Planned |
| R-010 | LLM chat interface | Natural language chat to explore course data — "what math courses are available in grade 11?", "which courses count toward graduation?", course recommendations based on interests | Unassigned | Planned |

## Long-Term

| ID | Feature | Description | Assigned | Status |
|----|---------|-------------|----------|--------|
| R-006 | K-8 course support | Data is already in the JSON, UI would need a toggle or separate view | Unassigned | Planned |
| R-007 | Course recommendations | Suggest related courses based on subject area or prerequisites | Unassigned | Planned |
| R-008 | PWA support | Offline access for users with intermittent connectivity | Unassigned | Planned |
| R-009 | Wire app to Supabase | DB schema, load script, and scraper all updated to use live Ministry Excel. App-side query integration (replace static JSON imports in page.tsx with Supabase queries) pending. See ADR-006. | Unassigned | In Progress |
