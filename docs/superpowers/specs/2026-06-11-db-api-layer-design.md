# Design: DB API Layer (App Phase of ADR-006)

**Date:** 2026-06-11
**Status:** Approved — ready for implementation planning
**Branch:** `feat/db-api-layer` (rename from non-conforming `apiLayer`)
**Related:** [ADR-006 Migrate to Supabase](../../decisions/006-migrate-to-supabase.md)

## Summary

Complete the "App Phase" of the Supabase migration. Today the app still loads
static JSON (`src/data/courses.json`, `src/data/course-details.json`) client-side.
This change makes **the Supabase DB the single source of truth**, reached **only
through a Next.js API layer**. No Excel, no JSON files — anywhere, ever — after
this change.

## Goals

- App reads all course data from the DB via HTTP API (`GET` endpoints).
- All writes go through the API (`POST`), secret-protected; nothing writes to
  Supabase directly anymore.
- Delete the committed static JSON data files.
- Preserve the current UX: instant in-memory filtering, paginated grid,
  expandable course detail.

## Non-Goals (YAGNI)

- No per-row `PATCH` endpoint (re-sync is bulk upsert only).
- No pagination or server-side filtering (dataset is ~4K rows; client filtering
  stays instant).
- No auth on read endpoints (course data is public).
- No rework of the upstream scraper / Excel converter beyond noting they are now
  unused by the app (see Out of Scope).

## Decisions Driving the Design (from brainstorming)

1. **DB is the only source of truth** — no Excel, no JSON, ever.
2. **Everything via the API** — even scripts must not write to Supabase directly.
3. **Data scope = the DB** — 2023 Graduation Program, grades 10–12 (~3,951
   courses). Grade 9 and non-2023 programs intentionally disappear from the UI.
4. **REST shape** — `GET` all + `GET` by id; `code` is the id.
5. **`code` is globally unique** in this dataset (verified: 5,480 codes, 0 span
   multiple grades). The composite `(code, grade)` PK is defensive only.
6. **Writes** — bulk upsert, secret-protected (`X-Api-Key`), scripts-only.

## Architecture

```
Browser (page.tsx, client component)
    │  GET /api/courses          → render grid + filter in-memory (search.ts)
    │  GET /api/courses/[code]   → expand card detail (lazy, cached per code)
    ▼
Next.js Route Handlers  (src/app/api/courses/…)
    │  server-only Supabase client (service_role key)
    ▼
Supabase  (courses + course_details tables)
    ▲
    │  POST /api/courses  (X-Api-Key secret)
scripts/load_supabase.ts  (re-sync; POSTs to API, no direct createClient)
```

### Module boundaries

| Unit | File | Responsibility |
|------|------|----------------|
| Server Supabase client | `src/lib/supabase-server.ts` (new) | Single `service_role` client. **Server-only** — never imported by client code. Reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY`. |
| Field mapping | `src/lib/courses-mapper.ts` (new) | Pure functions mapping DB snake_case rows ⇄ API camelCase shapes. Keeps SQL column names out of routes and the client. |
| Courses collection route | `src/app/api/courses/route.ts` (new) | `GET` = list all courses; `POST` = secret-gated bulk upsert. |
| Single course route | `src/app/api/courses/[code]/route.ts` (new) | `GET` = one course + merged `course_details`. |
| Types | `src/lib/types.ts` (edit) | Align `Course` to DB columns; add `CourseListItem`, `CourseDetailResponse`, `CourseUpsertBody`. |
| UI | `src/app/page.tsx` (refactor) | Replace static imports with runtime fetch; remove dedup/gradPrograms machinery; add loading/error/empty states; lazy detail fetch. |
| Filtering | `src/lib/search.ts` | **Unchanged** — generic over `Searchable`. |
| Loader | `scripts/load_supabase.ts` (refactor) | Thin client that `POST`s rows to `/api/courses` with the secret. No `createClient`, no Excel, no JSON. |

## Endpoint Contracts

### `GET /api/courses` — list all
- Query `courses` table, map snake→camel, return array. No details (kept lean).
- `200` → `CourseListItem[]`
- `500` → `{ error: string }`

### `GET /api/courses/[code]` — one course + details
- Query the single `courses` row by `code`, plus `course_details` by `code`; merge.
- `200` → `{ course: CourseListItem; details: CourseDetail | null }`
- `404` → `{ error: "not found" }` when no course row for `code`
- `500` → `{ error: string }`

### `POST /api/courses` — bulk upsert (secret-gated)
- Header `X-Api-Key` must equal `API_WRITE_SECRET` env var.
- Body: `{ courses?: CourseRow[]; courseDetails?: CourseDetailRow[] }`
- Upsert in batches of 200: `onConflict: "code,grade"` (courses),
  `onConflict: "code"` (course_details) — matches `scripts/migrate.sql` PKs.
- `200` → `{ upserted: { courses: number; courseDetails: number } }`
- `400` → `{ error }` malformed body
- `401` → `{ error: "unauthorized" }` missing/wrong secret
- `500` → `{ error }`

### Types (in `src/lib/types.ts`)

```ts
// API-facing (camelCase). Mirrors the DB courses table minus grade-program rows.
export interface CourseListItem {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  subCategory: string | null;
  gradRequirement: string | null;
}

export interface CourseDetail {
  genericCourseType: string | null;
  programGuideTitle: string | null;
  publishedDescription: string | null;
  gradRequirements: { program: string; requirement: string; examinable: string }[];
  gradElectives: string[];
}

export interface CourseDetailResponse {
  course: CourseListItem;
  details: CourseDetail | null;
}
```

`CourseListItem` satisfies `search.ts`'s `Searchable`, so filtering is unchanged.

## Data Flow & UI Changes (`page.tsx`)

Today `page.tsx` builds everything at **module load** from JSON (imports +
dedup block + `detailsMap`). That all becomes **runtime fetch**:

- Remove JSON imports, the module-level `courses` dedup IIFE, and `detailsMap`.
- **Remove `DeduplicatedCourse` / `gradPrograms`** — the DB has one row per code
  with a single `gradRequirement`; per-program grad info now comes from
  `course_details` JSONB. The merged "Graduation Programs" table is deleted; grad
  info renders from `details.gradRequirements` / `gradElectives` (already present).
- On mount: `fetch('/api/courses')` into state with **loading / error / empty**
  UI states (new — none existed for static data).
- `CourseExpanded`: replace synchronous `detailsMap[code]` with lazy
  `fetch('/api/courses/[code]')` on expand, with a small loading state. Cache
  responses per `code` so re-expanding doesn't refetch.
- `search.ts` and the filter UI are untouched.

## Environment & Cleanup

### Env vars
- **New:** `API_WRITE_SECRET` (server-only; gates `POST`).
- **Reused server-side:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
- Add committed **`.env.example`** documenting all three (resolves the missing
  `.env.example` doc-debt noted in onboarding).

### Deletions (git rm — recoverable from git history)
- `src/data/courses.json`
- `src/data/course-details.json`

### Refactor
- `scripts/load_supabase.ts` → POSTs to `/api/courses`; no direct DB access.

### Out of scope (flag for follow-up, do not remove on this branch)
- `scripts/convert-excel.ts`, `npm run import`, `/api/import` route,
  `scripts/scrape-course-details.py` — Excel/JSON-era tooling, now unused by the
  app. Track as tech-debt for a later cleanup PR.

## Contributing-Guideline Compliance

- **Branch:** rename `apiLayer` → `feat/db-api-layer` before any commit.
- **Coverage ≥ 75%** (statements/branches/functions/lines): add route-handler
  tests; **rewrite `src/app/page.test.tsx`** (it asserts static-JSON rendering and
  will break under fetch — mock `fetch`). `src/lib/search.test.ts` stays green.
- **TS strict, no `any`; Tailwind only** for any new UI states.
- **ADR:** update ADR-006 to mark App Phase done and record the API-only-gateway
  and no-files decisions.
- **Docs to update** (all currently claim "no database / static JSON"):
  `CONTRIBUTING.md` (architecture + data-files sections), `README.md`,
  `CLAUDE.md`, `docs/onboarding/data-pipeline.md`, `docs/onboarding/getting-started.md`,
  `docs/architecture/overview.md`.
- **Tracking:** add a roadmap entry (R-NNN) for the cutover and a tech-debt entry
  (TD-NNN) for the unused Excel/scraper tooling.
- **Data guard hook:** blocks *editing* `src/data/*.json`; deletion via `git rm`
  is expected to pass, but verify the hook doesn't also intercept deletes.
- **PR:** single focused PR; CI (lint + build + test + coverage) must pass; code
  reviewer subagent will review.

## Testing

- **Route handlers** (Vitest, mock `supabase-server`):
  - `GET /api/courses` maps snake→camel correctly, returns array.
  - `GET /api/courses/[code]` returns merged object; `404` on miss.
  - `POST /api/courses`: `401` without secret; upserts with secret; `400` on bad body.
- **`page.test.tsx`** rewritten to mock `fetch` and assert grid render, filtering,
  loading/empty/error states, and lazy detail load.
- **Manual verification** (requires `.env.local` with real seeded DB — prerequisite
  before claiming the cutover works): `npm run dev`, load grid from DB, expand a
  card, run a secret-gated `POST`.

## Prerequisites / Open Risks

- **No `.env.local` exists** in the repo → cannot currently query the DB to confirm
  it is seeded. The app cannot go DB-only against an empty DB. Credentials must be
  provided before the verification step. JSON deletion itself is safe (git history
  retains it).
- Vercel **Hobby tier**: keep within free limits — server route + Supabase free
  tier only; no Pro features.
