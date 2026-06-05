## Status: Resolved

This note captured the design discussion that led to the current 2-table JSONB schema.
See ADR-006 (`docs/decisions/006-migrate-to-supabase.md`) for the authoritative decision record.

---

## Original note (preserved for context)

Two tables:

`courses` — 3500+ rows, pre-filtered to 2023 Graduation Program only. At that filter there is zero duplication — every row is a unique course. No normalization needed.

Columns to keep:
- Course Code — join key to course_details
- TRAX Code
- MyEd BC Code — useful for parents cross-referencing their kid's MyEdBC timetable
- Grade
- Course Title
- Credit Value
- Course Category
- Lang of Inst
- Developer — 110 unique values (IB, SkilledTradesBC, colleges, Ministry etc.) — this is a UI filter
- HST Main Category / HST Sub Category — UI filter for subject area
- Grad Program Requirement — lets us surface required vs elective down the road

Drop: Authorizer, Open/Close/Completion dates, Ministry Subject Code.

`course_details` — from the scraper, unchanged. Joins to courses on Course Code. Only hits the DB when a student expands a card.

Why 2023 only: The 12000+ raw rows are entirely explained by grad program repetition — the same course repeats once per program it belongs to (1995, 2004, 2018, 2023, Adult, Course-Based). Current students are all on the 2023 program. Filtering to 2023 gives us a clean, flat, non-duplicated table. can check if there is even more latest one and use that too

On the current 5-table schema: The normalization makes sense in principle but it's solving for a graduation planner we haven't designed yet. When we build that we'll have real query patterns to work from — the schema will be better for it. For now this unblocks the app refactoring with the minimum viable structure.

---

## How the design evolved

Filtering to 2023 only would have silently dropped 1,600 course codes:
- 1,500 courses with no grad program association (French-language, K-8, Board Authority)
- 100 courses only in older programs (1995, Adult, Course-Based)

The solution: keep all 5,480 unique (code, grade) rows and store the full list of grad program associations as a `grad_info jsonb` array on each row. This gives a flat 2-table design with zero data loss and full queryability via Postgres JSONB operators.
