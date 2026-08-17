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
| R-012 | Self-serve account deletion | Delete-account button in profile UI → API route → Clerk `deleteUser`. Blocked on TD-019 (Clerk `user.deleted` webhook needed first, so `profiles`/`saved_filter_sets` rows don't orphan) | Unassigned | Planned |
| R-013 | User accounts and saved filter sets | Done (2026-08-17): auth migrated from Supabase Auth to Clerk (ADR-010, PR #18); saved filter sets — save, load, rename, set as default, delete (PR #14-16); UX polish — active-filter-set "Viewing: X" indicator with a Default tag, and a duplicate-set merge-on-save prompt (rename existing vs. save as new, never a silent overwrite). Filter *sharing* (`share_token`, public share links) is not yet built — see R-014 | Unassigned | Done |
| R-014 | Filter set sharing | Generate/revoke a share token for a saved filter set (`PATCH /api/user/filters/[id]/share`) and a public read-only view (`GET /api/filters/share/[token]`, `/filters/share/[token]` page shell already exists from PR #15). Depends on R-013 (shipped) | Unassigned | Planned |

## Long-Term

| ID | Feature | Description | Assigned | Status |
|----|---------|-------------|----------|--------|
| R-006 | K-8 course support | Would require widening the DB load scope (K-8 no longer ships with the app) plus a UI toggle or separate view | Unassigned | Planned |
| R-007 | Course recommendations | Suggest related courses based on subject area or prerequisites | Unassigned | Planned |
| R-008 | PWA support | Offline access for users with intermittent connectivity | Unassigned | Planned |
| R-009 | Wire app to Supabase | Done (2026-06-11): app reads exclusively from the DB via the `src/app/api/courses/` API layer; static JSON imports and runtime dedup removed; writes go through the gated `POST /api/courses`. See ADR-006, ADR-007, ADR-008. | Unassigned | Done |
