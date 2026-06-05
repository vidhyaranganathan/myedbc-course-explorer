# ADR-006: Migrate Data Layer to Supabase

**Status**: Accepted
**Date**: 2026-04-10
**Updated**: 2026-06-04
**Supersedes**: ADR-001

## Context

The app originally used static JSON files shipped with the build (see ADR-001). That approach was appropriate for a proof-of-concept but has clear limitations as the project moves toward a production release:

- Data updates require a code commit and a full redeploy
- No ability to add user-generated content (saved searches, course lists, notes)
- No ability to serve personalised or filtered data server-side
- The full dataset (~500 KB compressed) is downloaded on every initial page load
- Future features (graduation planner, recommendations, LLM chat — see roadmap) all require a persistent, queryable backend

Supabase was the original backend before the static-JSON simplification. The schema knowledge and data pipeline already exist.

## Decision

Migrate the runtime data layer from static JSON to Supabase (Postgres). The migration is done in two phases:

1. **Seed phase** — `scripts/migrate.sql` creates the schema (run once in the Supabase SQL Editor). `scripts/load_supabase.ts` then reads the committed JSON files and upserts both tables. Run via `npm run db:load`.
2. **App phase** — Replace the client-side JSON imports in `page.tsx` with Supabase queries using `@supabase/supabase-js`.

The static JSON files remain in the repo as the authoritative seed source.

## Supabase Table Schema

Two tables across two source domains:

| Table | Primary Key | Rows | Source |
|-------|-------------|------|--------|
| `courses` | `(code, grade)` | 5,480 | Excel `open_courses.xlsx` |
| `course_details` | `code` | 5,480 | `course-details.json` (scraper) |

### `courses`

One row per unique `(code, grade)` offering. The source Excel has 12,741 raw rows because the same course is repeated once per grad program it belongs to (1995, 2004, 2018, 2023, Adult, Course-Based). These are collapsed into a single row per `(code, grade)` by aggregating all grad program associations into the `grad_info` JSONB column.

```
grad_info: [
  {"program": "2023 Graduation Program", "requirement": "Elective"},
  {"program": "Adult Graduation Program", "requirement": "Elective"}
]
```

Courses with no grad program association have `grad_info = '[]'`.

Columns: `code`, `grade`, `title`, `credits`, `category`, `language`, `subject`, `sub_category`, `myedb_code`, `trax_code`, `developer`, `grad_info`

### `course_details`

One row per course code (not per grade). Sourced from the scraper. Joins to `courses` on `code`. There is no FK constraint between the tables because `courses` PK is `(code, grade)` while `course_details` is keyed by `code` alone — one detail entry covers all grade variants of a course.

`grad_requirements` and `grad_electives` from the scraper are stored as JSONB arrays:

```
grad_requirements: [
  {"program": "Program End Date", "requirement": "2018 Graduation Program", "examinable": "2017-06-01"}
]
grad_electives: ["2023 Graduation Program", "Adult Graduation Program"]
```

Columns: `code`, `generic_course_type`, `program_guide_title`, `published_description`, `grad_requirements`, `grad_electives`

### Why JSONB instead of separate tables for grad data

An earlier iteration of this schema used 5 tables, normalising grad programs into `course_grad_programs`, `course_grad_requirements`, and `course_grad_electives`. That was rejected because:

- It solved for a graduation planner query pattern that hasn't been designed yet
- It introduced FK complexity (course_details FK'd to a (code, grade) PK didn't work cleanly)
- It split logically related data across joins that the current app doesn't need
- JSONB in Postgres is fully queryable: containment (`@>`), `jsonb_array_elements()`, and GIN indexes give equivalent query power without the schema complexity

When the graduation planner is designed (R-004), real query patterns will inform whether denormalisation is needed. Until then JSONB keeps the schema flat and all data intact.

**Extra Excel columns** (`myedb_code`, `trax_code`, `developer`) are present in the schema but are `null` when loading from `courses.json` fallback. Pass the Excel file directly to get full data: `npm run db:load -- /path/to/open_courses.xlsx`.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=       # Project URL from Supabase dashboard
SUPABASE_SECRET_KEY=            # service_role key (server/scripts only — never exposed to browser)
```

For the Next.js app (client-side queries), the anon key will also be needed once the app phase begins:

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon key, safe to expose
```

## Consequences

**Positive:**
- Data updates no longer require a redeploy — re-run `npm run db:load` after refreshing the JSON files
- Unlocks user-generated content, server-side filtering, and personalisation
- Enables all medium/long-term roadmap features (R-004, R-007, R-010)
- Reduces initial page load size (query only visible rows instead of full dataset)
- Supabase Hobby tier is free and compatible with Vercel Hobby
- No data is dropped — all 5,480 unique (code, grade) courses are preserved including those not in the 2023 program

**Negative:**
- Adds infrastructure dependency — the app now requires a live Supabase project
- Requires secret management (`.env.local` locally, Vercel env vars in CI/CD)
- Slightly more complex local setup for new contributors
- Supabase free tier has row limits (500 MB storage, 50K MAU) — sufficient for now

**When to revisit:**
- If Supabase free-tier limits are hit (consider Supabase Pro or self-hosted Postgres)
- If query latency becomes a UX issue (consider edge caching or ISR)
- If the graduation planner (R-004) requires relational queries across grad programs — at that point evaluate whether to denormalise `grad_info` into a separate table
