# ADR-008: UI Scope — 2023 Graduation Program, Grades 10-12

**Status**: Accepted
**Date**: 2026-06-11
**Supersedes**: ADR-005

## Context

ADR-005 scoped the UI to grades 9-12 by filtering the static `courses.json`
(which held all of K-12) to a `HIGH_SCHOOL_GRADES` set in `page.tsx`. That filter
made sense when the app shipped the full dataset and chose what to show at runtime.

ADR-006 / ADR-007 change the premise: the app no longer ships the full dataset. It
reads from the Supabase DB, which is **deliberately scoped at load time** to the
**2023 Graduation Program** (see ADR-006). That scope has two practical effects on
what the UI can show:

- **Grade 9 is excluded.** Grade 9 is not part of the 2023 Graduation Program
  structure, so those rows are not in the `courses` table.
- **Only 2023-program courses exist** in the DB (~3,951 rows). The ~1,600 courses
  tied to older programs (1995/2004/2018), Adult, course-based, or no program are
  not loaded.

With the DB as the only source of truth, the UI can only display what the DB
contains. The runtime grade filter from ADR-005 is now redundant and, more
importantly, can no longer "reach back" to data that isn't there.

## Decision

Scope the UI to exactly what the DB holds: the **2023 Graduation Program, grades
10, 11, and 12**. Drop the client-side `HIGH_SCHOOL_GRADES` filter — the DB scope
is the filter now. This supersedes ADR-005's grades 9-12 scope.

This is an intentional, user-visible narrowing: Grade 9 courses and all
non-2023-program courses no longer appear in the app.

## Consequences

**Positive:**
- The UI shows a coherent, single-program dataset directly relevant to current
  students planning under the 2023 Graduation Program.
- No client-side grade filtering and no `DeduplicatedCourse` complexity — the data
  arrives already scoped and one-row-per-course.
- Smaller working set and payload.

**Negative:**
- Grade 9 courses (visible under ADR-005) disappear from the UI.
- Courses only offered under older/Adult/course-based programs are not shown.
- Re-adding any of this means changing the DB load scope (ADR-006), not just a UI
  toggle — the data is no longer present client-side to re-enable cheaply.

**When to revisit:**
- If there's demand for Grade 9 or for older/Adult graduation programs — widen the
  DB load scope in `scripts/migrate.sql` + the loader, then expose a program/grade
  selector in the UI.
- If the graduation planner (R-004) needs cross-program data — revisit alongside
  the ADR-006 schema scope.
