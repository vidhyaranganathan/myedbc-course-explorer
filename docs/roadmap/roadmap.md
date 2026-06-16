# Product Roadmap

Product features only. For code/design issues see [tech-debt.md](tech-debt.md). For automation ideas see [agentic-workflows.md](agentic-workflows.md).

## Current State

BC Course Finder is a functional single-page app with search and filtering across BC high school courses (2023 Graduation Program, grades 10-12). Supabase is the single source of truth, reached only through the `src/app/api/courses/` API layer — the app fetches `GET /api/courses` for the grid and `GET /api/courses/[code]` for details, and writes go through the secret-gated `POST /api/courses`. The static JSON files have been removed. See ADR-006, ADR-007, ADR-008.

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
| R-006 | K-8 course support | Would require widening the DB load scope (K-8 no longer ships with the app) plus a UI toggle or separate view | Unassigned | Planned |
| R-007 | Course recommendations | Suggest related courses based on subject area or prerequisites | Unassigned | Planned |
| R-008 | PWA support | Offline access for users with intermittent connectivity | Unassigned | Planned |
| R-009 | Wire app to Supabase | Done (2026-06-11): app reads exclusively from the DB via the `src/app/api/courses/` API layer; static JSON imports and runtime dedup removed; writes go through the gated `POST /api/courses`. See ADR-006, ADR-007, ADR-008. | Unassigned | Done |
