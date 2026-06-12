# Data Pipeline

This doc explains how course data flows from source to the running app.

## Overview

```
BC Ministry Excel (live URL)
        │
        ├──▶ scripts/load_supabase.ts    (npm run db:load)
        │         │
        │         ▼
        │    Supabase: courses (3,951 rows — 2023 Graduation Program only)
        │
        └──▶ scripts/scrape-course-details.py
                  │  (uses Excel to get code list, scrapes BC Course Registry)
                  ▼
             src/data/course-details.json   (5,569 entries, committed to git)
                  │
                  ▼
             scripts/load_supabase.ts       (npm run db:load)
                  │
                  ▼
             Supabase: course_details (5,569 rows)
```

## Data Sources

### 1. BC Ministry Excel (primary source for `courses` table)

- **URL**: `https://www.bced.gov.bc.ca/datacollections/course_registry_web_search/data/open_courses.xlsx`
- **Downloaded at runtime** by `scripts/load_supabase.ts` — no manual download needed
- **Filtered to**: 2023 Graduation Program rows only → 3,951 unique (code, grade) rows
- **Fields loaded**: code, grade, title, credits, category, language, subject, sub_category, myedb_code, trax_code, developer, grad_requirement
- **Fields excluded**: authorizer, open_date, ministry_subject_code (not needed). close_date and completion_end_date do not exist in the source file.

Grade 9 courses are not part of the 2023 Graduation Program and are excluded by design. The raw Excel file retains them.

### 2. BC Course Registry (`course-details.json`)

- **Source**: BC Course Registry website scraped per course code
- **Script**: `scripts/scrape-course-details.py`
- **Code list**: Downloaded from the live Ministry Excel at scrape time — always in sync
- **Output**: `src/data/course-details.json` (committed to git, 5,569 entries)
- **Fields**: programGuideTitle, publishedDescription, genericCourseType, gradRequirements, gradElectives
- **Coverage**: All unique course codes across all grad programs (superset — not filtered to 2023)

#### How the scraper works

```
1. Download live Excel from Ministry URL → extract all unique course codes
2. Merge with existing course-details.json (skip already-scraped codes)
3. For each new code:
   a. POST to run-search.php to establish a cookie session
   b. GET run-details.php?courseCode={code}
   c. Parse HTML with regex → extract title, description, type, grad data
   d. Save progress every 100 courses (resumable)
   e. Rate-limited to ~3 req/s (0.3s sleep)
   f. Session refreshes every 200 requests
4. Write updated course-details.json
```

The scraper resumes automatically — re-running skips already-scraped codes.

#### Limitations

- **Regex-based HTML parsing** — fragile if the BC Course Registry changes its HTML structure
- **Some courses have no description** — the registry returned empty results (mostly French-language and newer courses)
- **Cookie/session dependent** — requires a search session before detail pages work
- **Single-threaded** — takes ~30 min to scrape all codes from scratch at 3 req/s

## Updating Data

When the Ministry publishes updated data:

1. Run `npm run db:load` — downloads the latest Excel automatically and upserts `courses`
2. Run `python3 scripts/scrape-course-details.py` — picks up any new course codes, skips existing
3. Run `npm run db:load` again — upserts the updated `course-details.json` into `course_details`
4. Commit the updated `src/data/course-details.json`

## Supabase Schema

Tables are created by running `scripts/migrate.sql` in the Supabase SQL Editor (one-time setup).
To reset: `DROP TABLE IF EXISTS course_details, courses CASCADE;` then re-run the SQL.

| Table | Source | Primary Key | Rows |
|-------|--------|-------------|------|
| `courses` | BC Ministry Excel (live URL) | `(code, grade)` | 3,951 |
| `course_details` | course-details.json (scraped) | `code` | 5,569 |

## Fallback

If the Ministry URL is unavailable, `npm run db:load -- --json` falls back to `src/data/courses.json`.
Note: this fallback has `null` for `myedb_code`, `trax_code`, and `developer`.
