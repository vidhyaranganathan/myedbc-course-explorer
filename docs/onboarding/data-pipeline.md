# Data Pipeline

This doc explains how course data flows in and out of the running app.

## Overview

The Supabase Postgres database is the **single source of truth** (ADR-006, ADR-007). There is no Excel and no committed JSON data file. The browser never queries Supabase directly — all access goes through the Next.js API layer under `src/app/api/courses/`.

```
Runtime read path (browser → API → DB):

  page.tsx ──▶ GET /api/courses ──▶ Supabase: courses (~3,951 rows)

Write path (the ONLY way data enters the DB):

  payload.json ──▶ npm run db:load ──▶ POST /api/courses ──▶ Supabase (gated upsert)
  (assembled,        (load_supabase.ts)   (X-Api-Key must
   not committed)                          equal API_WRITE_SECRET)
```

The `course_details` table is retained in the DB but is **not used by the app** — no app code reads or writes it (ADR-009).

## Runtime Data Flow

- **List** — On load, the client calls `GET /api/courses`, which returns all courses as JSON. The grid and all filtering run in memory in the browser (ADR-002 lives on, just fed by the API instead of a static file). Expanding a course card shows only `courses`-table fields — there is no second request.
- **Writes** — The only write path is `POST /api/courses`, a secret-gated bulk upsert of courses. The request must send `X-Api-Key` equal to env `API_WRITE_SECRET`. Scripts no longer write to Supabase directly.

The `service_role` key (`SUPABASE_SECRET_KEY`) lives only in the server-side route handlers (`src/lib/supabase-server.ts`). RLS is enabled on the DB, so there is no anon/publishable key in use.

## Scope

The app shows only the **2023 Graduation Program, grades 10-12** (~3,951 courses) — ADR-008. Grade 9 and non-2023 programs do not appear. The DB stores one row per course; there is no runtime deduplication.

## Producing Data

Refreshing the data means assembling a JSON payload file (snake_case rows matching the DB columns) and POSTing it through the write API.

## Loading Data (re-sync)

`scripts/load_supabase.ts` is a thin client: it reads a JSON payload file and POSTs it to `/api/courses`. It does **not** write to Supabase directly.

```bash
# 1. Assemble a payload file from any upstream process
# 2. POST it through the write API:
npm run db:load -- ./payload.json
```

The payload file uses snake_case rows matching the DB columns:

```jsonc
{
  "courses": [ { "code": "...", "grade": "...", "title": "...", "credits": "...",
                 "category": "...", "language": "...", "subject": "...",
                 "sub_category": "...", "myedb_code": "...", "trax_code": "...",
                 "developer": "...", "grad_requirement": "..." } ]
}
```

`db:load` reads `API_WRITE_SECRET` from `.env.local` and sends it as the `X-Api-Key` header. The app must be running (default `API_BASE_URL` is `http://localhost:3000`). The upsert is idempotent and safe to re-run.

## Supabase Schema

Tables are created once by running `scripts/migrate.sql` in the Supabase SQL Editor.

| Table | Primary Key | Notes |
|-------|-------------|-------|
| `courses` | `(code, grade)` | 2023 Graduation Program, grades 10-12 (~3,951 rows) |
| `course_details` | `code` | Retained in the DB but **not used by the app** (ADR-009) |

## Environment Variables

Documented in `.env.example` (copy to `.env.local`). All three are read **server-side only**:

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | service_role key — used only by the server-side route handlers |
| `API_WRITE_SECRET` | shared secret that gates `POST /api/courses` (sent as `X-Api-Key`) |

There is no anon/publishable key — the browser never queries Supabase directly.
