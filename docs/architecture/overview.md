# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (CDN)                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Next.js Application                  │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │ Static JSON  │  │       Client-Side App       ││  │
│  │  │ (interim)    │  │                             ││  │
│  │  │ courses.json │──│  page.tsx (single page)     ││  │
│  │  │ course-      │  │    ├─ Deduplication logic   ││  │
│  │  │ details.json │──│    ├─ Filter UI             ││  │
│  │  │              │  │    ├─ Course list            ││  │
│  │  └─────────────┘  │    └─ Detail expansion       ││  │
│  │                    │                             ││  │
│  │                    │  search.ts (filter engine)   ││  │
│  │                    │  types.ts  (Course type)     ││  │
│  │                    └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲ app phase (pending): replace JSON imports
         │ with Supabase queries
         │
┌─────────────────────────────────────────────────────────┐
│                  Supabase (Postgres)                    │
│                                                         │
│  courses                 (code, grade) PK  5,480 rows   │
│  course_grad_programs    (code, grade, program)  11,241  │
│  course_details          code PK           5,480 rows   │
│  course_grad_requirements                  2,983 rows   │
│  course_grad_electives                     3,833 rows   │
└─────────────────────────────────────────────────────────┘

Data pipeline (offline / dev only):
  ┌──────────────────┐    ┌──────────────────────────┐
  │ BC Ministry Excel│───▶│ scripts/convert-excel.ts │──▶ courses.json
  └──────────────────┘    └──────────────────────────┘
  ┌──────────────────┐    ┌──────────────────────────────┐
  │ BC Course        │───▶│ scripts/scrape-course-       │──▶ course-details.json
  │ Registry website │    │ details.py                   │
  └──────────────────┘    └──────────────────────────────┘
  ┌──────────────────┐    ┌──────────────────────────┐
  │ courses.json +   │───▶│ scripts/load_supabase.ts │──▶ Supabase tables
  │ course-details   │    │ (npm run db:load)         │
  └──────────────────┘    └──────────────────────────┘
```

## Key Components

### `src/app/page.tsx` — The Application

The entire UI is a single client component (`"use client"`). It:

1. Imports both JSON data files at build time
2. Deduplicates courses by `code|grade` key on initial load
3. Filters to grades 9-12 only
4. Renders a filter bar + paginated course list
5. Expands course cards to show scraped details from `course-details.json`

### `src/lib/search.ts` — Filter Engine

Generic filtering functions that work with any type extending the `Searchable` interface:

- `filterCourses()` — applies text search (title, code, subject) + dropdown filters
- `getFilterOptions()` — extracts unique values with counts for filter dropdowns

### `src/lib/types.ts` — Type Definitions

Defines the `Course` interface matching the raw JSON structure. The `DeduplicatedCourse` type (defined in `page.tsx`) extends this by replacing `gradProgram`/`gradRequirement` with a `gradPrograms` array.

### `src/data/` — Static Data (interim)

Two committed JSON files used as the seed source for Supabase and as an interim data layer until the app-phase Supabase integration is complete.

### `scripts/migrate.sql` — Database Schema

DDL for all five Supabase tables. Run once in the Supabase SQL Editor to create the schema.

### `scripts/load_supabase.ts` — Data Loader

Reads `courses.json` + `course-details.json` and upserts all five Supabase tables. Run via `npm run db:load`. Accepts an optional Excel path argument for a full-field load: `npm run db:load -- /path/to/open_courses.xlsx`.

## Design Principles

1. **Simplicity over sophistication**: Client-side filtering across ~5K courses remains instant
2. **Supabase as the runtime data layer**: Replaces static JSON imports; enables data updates without redeployment (see ADR-006)
3. **Fast iteration**: One file for the UI, one file for search logic, one file for types
4. **Offline-first data pipeline**: Data transformation happens on the developer's machine, not at runtime
