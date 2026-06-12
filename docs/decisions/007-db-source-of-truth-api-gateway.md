# ADR-007: DB as Source of Truth via API-Only Gateway

**Status**: Accepted
**Date**: 2026-06-11
**Supersedes**: ADR-004
**Amends**: ADR-006
**Amended by**: ADR-009 (course_details dropped from the app; GET [code] removed; POST is courses-only)

## Context

ADR-006 migrated the data layer to Supabase in two phases. The **seed phase** is
complete (schema created, tables populated). It left two things unresolved that
this ADR settles for the **app phase**:

1. **Who owns DB access.** ADR-006 sketched the app phase as "replace the
   client-side JSON imports in `page.tsx` with Supabase queries" — i.e. the
   browser would query Supabase directly with the anon key. It also kept the
   static JSON files as the "authoritative seed source," and `load_supabase.ts`
   wrote to Supabase directly with the service_role key. That leaves **three
   different paths to the data** (browser→Supabase, script→Supabase, static JSON)
   and two long-lived copies of the data (DB + committed JSON).

2. **Runtime deduplication (ADR-004).** Dedup existed because the committed
   `courses.json` held ~12,741 raw rows (one per grad program). The redesigned DB
   stores one row per `(code, grade)` already filtered to a single program
   (see ADR-008), so there is nothing left to deduplicate at runtime.

We want a single, auditable way in and out of the data, and we want the DB to be
the only place the data lives.

## Decision

**The Supabase DB is the single source of truth, reached only through a Next.js
API layer. No Excel, no JSON files — anywhere, ever.**

- **One gateway.** All data access goes through Route Handlers under
  `src/app/api/courses/`. The `service_role` key lives only in a server-only
  module (`src/lib/supabase-server.ts`); it is never shipped to the browser and
  no client-side Supabase queries are made.
- **Read** — `GET /api/courses` (list all) and `GET /api/courses/[code]`
  (one course + its `course_details`). The browser fetches at runtime and keeps
  the existing in-memory filtering (`search.ts` is unchanged).
- **Write** — `POST /api/courses`, a bulk upsert gated by an `X-Api-Key` secret
  (`API_WRITE_SECRET`). Scripts (e.g. a refactored `load_supabase.ts`) call this
  endpoint instead of writing to Supabase directly. Nothing bypasses the API.
- **Delete the static data files.** `src/data/courses.json` and
  `src/data/course-details.json` are removed from the repo. Git history retains
  them, so this is reversible and not data loss.
- **No runtime deduplication.** The `DeduplicatedCourse` / `gradPrograms`
  machinery in `page.tsx` is removed; the DB already holds one row per course.

This overrides ADR-004 (runtime dedup) and amends ADR-006, which had retained the
JSON files and allowed direct browser/script DB access.

## Consequences

**Positive:**
- One auditable path to the data; the `service_role` key never leaves the server.
- A single source of truth — no risk of the DB and committed JSON drifting apart.
- Smaller repo and app bundle (two large JSON files gone).
- `page.tsx` loses the dedup IIFE and `DeduplicatedCourse` type — simpler code.
- Writes are centralized and secret-gated, so the schema has one chokepoint.

**Negative:**
- The app now depends on a reachable API + live DB; an empty or unreachable DB
  means an empty UI. (Mitigated by loading/error states.)
- Course detail now requires a second request on card expand (lazy `GET [code]`),
  versus the old synchronous in-memory lookup.
- Refreshing `course_details` now means assembling a payload and POSTing it
  through the write API. The old scraper has been removed, so there is no
  built-in regeneration path — the DB holds the only copy.
- Requires `.env.local` (and Vercel env vars) for `SUPABASE_URL`,
  `SUPABASE_SECRET_KEY`, and `API_WRITE_SECRET` — local setup is heavier.

**When to revisit:**
- If read latency hurts UX — add caching/ISR in front of `GET /api/courses`.
- If write sources multiply beyond scripts — revisit auth (move from a shared
  secret to per-caller credentials).
- If the dataset grows enough that shipping all rows in one `GET` is too large —
  introduce server-side filtering/pagination (explicitly deferred for now).
