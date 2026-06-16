# ADR-009: Drop course_details from the Application

**Status**: Accepted
**Date**: 2026-06-12
**Amends**: ADR-007

## Context

The `course_details` table holds per-course descriptions and graduation-program
data (`published_description`, `program_guide_title`, `grad_requirements`,
`grad_electives`). It was scraped from the BC Course Registry, and the data is
unreliable — e.g. one course's `grad_electives` is `["Program End Date"]` and its
`grad_requirements` entries put dates in the `program` field. The scraper that
produced it has been removed (ADR-007), and we have not found a viable, accurate
source for this content.

ADR-007's app phase surfaced this data: the expanded course card showed the
description, program guide title, a "Graduation Program Requirements" table, and
"Counts As Elective In", loaded lazily via `GET /api/courses/[code]`.

Showing unreliable data to users is worse than showing none. Until there is a
trustworthy source, the app should not use this data at all.

## Decision

**The application does not use the `course_details` table.**

- **UI** — the expanded course card shows only fields from the `courses` table
  (code, grade, credits, category, language, subject, sub-category, grad
  requirement). The description, program guide title, grad-requirements table,
  and electives are removed. With no detail to fetch, expanding a card is instant
  (no second request).
- **API** — `POST /api/courses` no longer accepts or writes `courseDetails`, and
  no endpoint reads `course_details`. The API surface is courses-only:
  - `GET /api/courses` — list all courses
  - `GET /api/courses/[code]` — one course (from the `courses` table; **no
    details** — this is the REST get-by-id, not a details lookup)
  - `POST /api/courses` — secret-gated upsert of courses

  (The original `[code]` route returned `{ course, details }`; it now returns just
  the course row.)
- **DB** — the `course_details` table and its data **remain** in Supabase and in
  `scripts/migrate.sql`, untouched. They are simply not referenced by any
  application code, so the data is preserved for if/when it becomes viable.

This amends ADR-007, which had the browser lazily load `course_details` on expand
and the write API accept `courseDetails`.

## Consequences

**Positive:**
- No unreliable/garbage data is shown to users.
- Simpler app — no detail cache, no error/retry state, no second round-trip on
  expand; the only data path is the one `GET /api/courses` list.
- Smaller, courses-only API surface and request/response types.

**Negative:**
- Course descriptions and graduation-program details are unavailable in the UI
  until re-enabled.
- Re-enabling means restoring the `[code]` read route and the detail rendering,
  plus wiring a trustworthy data source.

**When to revisit:**
- When an accurate source for course descriptions and graduation-program data
  exists (an official BC API or a cleaned dataset). At that point, restore the
  `[code]` read route and the card's detail sections, loading from
  `course_details` (or its replacement).
