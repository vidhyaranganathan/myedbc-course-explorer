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
│  │  │ course-      │  │    ├─ Filter UI             ││  │
│  │  │ details.json │──│    ├─ Course list            ││  │
│  │  │              │  │    └─ Detail expansion       ││  │
│  │  └─────────────┘  │                             ││  │
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
│  courses         (code, grade) PK    3,951 rows         │
│  course_details  code PK             5,569 rows         │
└─────────────────────────────────────────────────────────┘

Data pipeline (runs on developer machine):

  ┌──────────────────────────┐
  │ BC Ministry Excel (live) │───▶ scripts/load_supabase.ts ──▶ courses (Supabase)
  │ (downloaded at runtime)  │
  └──────────────────────────┘

  ┌──────────────────────────┐
  │ BC Ministry Excel (live) │───▶ scripts/scrape-course-details.py
  │ (code list source)       │         │
  └──────────────────────────┘         ▼
                                  course-details.json (committed)
  ┌──────────────────────────┐         │
  │ BC Course Registry site  │─────────┘
  │ (detail data per code)   │
  └──────────────────────────┘
                                  scripts/load_supabase.ts ──▶ course_details (Supabase)
```

## Key Components

### `src/app/page.tsx` — The Application

The entire UI is a single client component (`"use client"`). It:

1. Imports both JSON data files at build time (interim — to be replaced with Supabase queries)
2. Filters to grades 9-12 only
3. Renders a filter bar + paginated course list
4. Expands course cards to show scraped details from `course-details.json`

### `src/lib/search.ts` — Filter Engine

Generic filtering functions that work with any type extending the `Searchable` interface:

- `filterCourses()` — applies text search (title, code, subject) + dropdown filters
- `getFilterOptions()` — extracts unique values with counts for filter dropdowns

### `src/lib/types.ts` — Type Definitions

Defines the `Course` interface matching the raw JSON structure.

### `src/data/` — Static Data (interim fallback)

Two committed JSON files used as the seed source for Supabase and as an interim data layer until the app-phase Supabase integration is complete:
- `courses.json` — fallback only (live Excel used as primary source)
- `course-details.json` — scraped data, committed after each scraper run

### `scripts/migrate.sql` — Database Schema

DDL for the two Supabase tables. Run once in the Supabase SQL Editor to create the schema.

### `scripts/load_supabase.ts` — Data Loader

Downloads the live BC Ministry Excel, filters to 2023 Graduation Program, and upserts `courses`. Also upserts `course_details` from the committed `course-details.json`. Run via `npm run db:load`.

### `scripts/scrape-course-details.py` — Detail Scraper

Downloads the live Excel for the course code list, then scrapes the BC Course Registry for per-course details. Resumes automatically. Run via `python3 scripts/scrape-course-details.py`.

## Testing Strategy

Three layers, run in order from cheapest to most expensive:

| Layer | Tool | File | What it proves |
|---|---|---|---|
| Unit | Vitest | `src/lib/search.test.ts` | Filter logic is correct with controlled data |
| Component | Vitest + RTL | `src/app/page.test.tsx` | UI renders and responds to events with mocked JSON |
| E2E | Playwright | `e2e/course-finder.spec.ts` | Real browser + real JSON data — the full user experience |

Run all layers: `npm run test:all`
Run E2E only: `npm run test:e2e`

E2E tests use Chromium headless. On failure, screenshots and traces are saved to `test-results/`.

## Design Principles

1. **Simplicity over sophistication**: Client-side filtering across ~4K courses remains instant
2. **Supabase as the runtime data layer**: Replaces static JSON imports; enables data updates without redeployment (see ADR-006)
3. **Live Excel as source of truth**: Both the loader and scraper pull from the Ministry URL directly — no stale local files
4. **Fast iteration**: One file for the UI, one file for search logic, one file for types
