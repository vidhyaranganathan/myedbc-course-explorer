# Architecture Overview

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Vercel (CDN)                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                  Next.js Application                      │ │
│  │                                                          │ │
│  │  ┌───────────────────────┐    ┌───────────────────────┐  │ │
│  │  │   Client-Side App     │    │   API Route Handlers  │  │ │
│  │  │   (browser)           │    │   src/app/api/courses │  │ │
│  │  │                       │    │                       │  │ │
│  │  │  page.tsx             │───▶│  GET  /api/courses    │  │ │
│  │  │   ├─ Filter UI        │    │  GET  /api/courses/   │  │ │
│  │  │   ├─ Course list      │◀───│        [code]         │  │ │
│  │  │   └─ Detail expansion │    │  POST /api/courses    │  │ │
│  │  │                       │    │        (gated)        │  │ │
│  │  │  search.ts (in-memory │    │                       │  │ │
│  │  │   filter engine)      │    │  supabase-server.ts   │  │ │
│  │  │  types.ts             │    │  courses-mapper.ts    │  │ │
│  │  └───────────────────────┘    └──────────┬────────────┘  │ │
│  └─────────────────────────────────────────│───────────────┘ │
└────────────────────────────────────────────│─────────────────┘
                                              │ service_role key
                                              │ (server-only)
┌─────────────────────────────────────────────▼─────────────────┐
│                     Supabase (Postgres)                        │
│                     SINGLE SOURCE OF TRUTH                      │
│                                                                │
│  courses         (code, grade) PK   ~3,951 rows                │
│  course_details  code PK                                       │
│  RLS enabled — no anon access                                  │
└────────────────────────────────────────────────────────────────┘

The browser NEVER queries Supabase directly. All reads and writes go
through the API route handlers (ADR-007).

Write path (the only way data enters the DB):

  payload.json ──▶ npm run db:load ──▶ POST /api/courses ──▶ Supabase
  (transient,        (load_supabase.ts)   (X-Api-Key ==
   not committed)                          API_WRITE_SECRET)
```

## Key Components

### `src/app/page.tsx` — The Application

The entire UI is a single client component (`"use client"`). It:

1. Fetches the course list from `GET /api/courses`
2. Renders a filter bar + paginated course list (2023 Graduation Program, grades 10-12)
3. Lazy-loads per-course details from `GET /api/courses/[code]` when a card expands

### `src/app/api/courses/` — The Data Gateway

The only path between the app and Supabase (ADR-007):

- `GET /api/courses` — returns all courses (no details); feeds the grid + in-memory filtering
- `GET /api/courses/[code]` — returns one course plus its details
- `POST /api/courses` — secret-gated bulk upsert; the `X-Api-Key` header must equal env `API_WRITE_SECRET`. This is the only write path.

### `src/lib/supabase-server.ts` — Server-Only DB Client

Creates the Supabase client using the `service_role` key (`SUPABASE_SECRET_KEY`). Imported only by the route handlers — never by client code. RLS is enabled on the DB and there is no anon key in use.

### `src/lib/courses-mapper.ts` — DB ↔ API Mapping

Maps the DB's snake_case columns to the API-facing camelCase shapes (and back for upserts).

### `src/lib/search.ts` — Filter Engine

Generic filtering functions that work with any type extending the `Searchable` interface:

- `filterCourses()` — applies text search (title, code, subject) + dropdown filters
- `getFilterOptions()` — extracts unique values with counts for filter dropdowns

### `src/lib/types.ts` — Type Definitions

Defines the API-facing `Course` / `CourseDetail` interfaces (camelCase) and the snake_case upsert row shapes.

### `scripts/migrate.sql` — Database Schema

DDL for the Supabase tables. Run once in the Supabase SQL Editor to create the schema.

### `scripts/load_supabase.ts` — Data Loader

A thin client: reads a JSON payload file and POSTs it to `/api/courses`. It does not write to Supabase directly. Run via `npm run db:load -- ./payload.json`.

### `scripts/scrape-course-details.py` — Detail Scraper

Scrapes the BC Course Registry for per-course details. Its output is a transient payload loaded into the DB via the write API — not a committed data file. Resumes automatically.

## Design Principles

1. **DB as the single source of truth**: Supabase holds the data; updates ship without redeploying the app (ADR-006, ADR-007)
2. **API-only gateway**: The browser never touches Supabase directly; all access goes through `src/app/api/courses/`, and the `service_role` key stays server-side (ADR-007)
3. **In-memory filtering**: Once the course list is fetched, filtering across ~3,951 courses is instant (ADR-002)
4. **Focused scope**: 2023 Graduation Program, grades 10-12 only — one row per course, no runtime deduplication (ADR-008)
