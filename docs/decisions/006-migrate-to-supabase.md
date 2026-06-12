# ADR-006: Migrate Data Layer to Supabase

**Status**: Accepted
**Date**: 2026-04-10
**Updated**: 2026-06-11
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
| `courses` | `(code, grade)` | ~3,951 | BC Ministry Excel (live URL), filtered to 2023 Graduation Program |
| `course_details` | `code` | 5,480 | `course-details.json` (scraper) |

### `courses`

One row per unique `(code, grade)` offering, **filtered to the 2023 Graduation Program only**. The source data has 12,741 raw rows because the same course repeats once per grad program (1995, 2004, 2018, 2023, Adult, Course-Based). Filtering to 2023 gives ~3,880 unique, non-duplicated rows — no deduplication logic needed.

`grad_requirement` is the flat text value from the source for the 2023 program (e.g. `"Elective"`, `"Required"`).

**Grade 9 courses are excluded** — Grade 9 is not part of the 2023 Graduation Program structure. The original source data in `courses.json` retains them if ever needed.

Columns: `code`, `grade`, `title`, `credits`, `category`, `language`, `subject`, `sub_category`, `myedb_code`, `trax_code`, `developer`, `grad_requirement`

**Columns excluded intentionally:**
- `authorizer`, `open_date`, `ministry_subject_code` — not needed for current app features.
- `close_date`, `completion_end_date` — do not exist in the source Excel file.

**Data source:** `load_supabase.ts` downloads the live Excel file from the BC Ministry at runtime. `courses.json` is kept in the repo as a fallback (`npm run db:load -- --json`) but will have `null` for `myedb_code`, `trax_code`, and `developer`.

### `course_details`

One row per course code (not per grade). Sourced from the scraper. Joins to `courses` on `code`. There is no FK constraint between the tables because `courses` PK is `(code, grade)` while `course_details` is keyed by `code` alone — one detail entry covers all grade variants of a course.

`grad_requirements` and `grad_electives` from the scraper are stored as JSONB arrays and reflect data across all grad programs (not just 2023) — preserved for completeness and future graduation planner use (R-004).

```
grad_requirements: [
  {"program": "Program End Date", "requirement": "2018 Graduation Program", "examinable": "2017-06-01"}
]
grad_electives: ["2023 Graduation Program", "Adult Graduation Program"]
```

Columns: `code`, `generic_course_type`, `program_guide_title`, `published_description`, `grad_requirements`, `grad_electives`

### Schema evolution: from 5 tables → JSONB → flat 2023 filter

**5-table normalised schema (rejected):** Split grad programs into `course_grad_programs`, `course_grad_requirements`, and `course_grad_electives`. Rejected because it solved for a graduation planner query pattern that hasn't been designed yet, introduced FK complexity, and added joins the current app doesn't need.

**JSONB `grad_info` column (superseded):** A `grad_info jsonb` array aggregated all grad program associations per row, preserving all 5,480 courses. Superseded after code review: the JSONB complexity was not needed given the app only needs 2023 program data.

**Current approach — 2023 filter + flat `grad_requirement` (accepted):** Filtering to the 2023 Graduation Program makes the schema simpler and directly relevant to current students. The `grad_requirement` column is plain text — no JSONB complexity on `courses`. The ~1,600 courses not in the 2023 program (older programs, Grade 9, no-program courses) are intentionally excluded from the DB; `courses.json` retains them if ever needed.

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
- Flat schema with plain text columns — no JSONB complexity on `courses`
- Scoped to current students (2023 program) — directly relevant data only

**Negative:**
- Adds infrastructure dependency — the app now requires a live Supabase project
- Requires secret management (`.env.local` locally, Vercel env vars in CI/CD)
- Slightly more complex local setup for new contributors
- Supabase free tier has row limits (500 MB storage, 50K MAU) — sufficient for now
- ~1,600 courses (Grade 9, older programs, no-program) not in the DB — by design, source JSON retained

**When to revisit:**
- If Supabase free-tier limits are hit (consider Supabase Pro or self-hosted Postgres)
- If query latency becomes a UX issue (consider edge caching or ISR)
- If the graduation planner (R-004) requires data from other grad programs — revisit schema scope
- If `myedb_code`/`trax_code`/`developer` are needed — load from Excel directly
