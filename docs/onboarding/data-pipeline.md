# Data Pipeline

This doc explains how course data flows from source to the running app.

## Overview

```
BC Ministry Excel file
        │
        ▼
  npm run import               (scripts/convert-excel.ts)
        │
        ▼
  src/data/courses.json        (12,741 rows, committed to git)
        │
        ├──▶ Browser loads JSON (interim — page.tsx imports it statically)
        │         │
        │         ▼
        │    Client deduplicates  (code+grade key → 4,962 unique courses)
        │         │
        │         ▼
        │    Filtered to grades 9-12 and displayed
        │
        └──▶ npm run db:load    (scripts/load_supabase.ts)
                  │
                  ▼
         Supabase: courses (5,480 rows, PK: code+grade)
                   course_grad_programs (11,241 rows)


BC Course Registry website
        │
        ▼
  python3 scripts/scrape-course-details.py
        │
        ▼
  src/data/course-details.json   (5,480 entries, committed to git)
        │
        ├──▶ Browser looks up details by course code (interim)
        │
        └──▶ npm run db:load    (scripts/load_supabase.ts)
                  │
                  ▼
         Supabase: course_details (5,480 rows)
                   course_grad_requirements (2,983 rows)
                   course_grad_electives (3,833 rows)
```

## Data Sources

### 1. BC Ministry Excel File (`courses.json`)

- **Source**: `~/Downloads/open_courses (1).xlsx` from the BC Ministry of Education
- **Conversion script**: `scripts/convert-excel.ts` (run via `npm run import`)
- **Output**: `src/data/courses.json`
- **Fields captured in JSON**: code, grade, title, credits, category, language, subject, subCategory, gradProgram, gradRequirement
- **Additional fields in Excel** (not in JSON, loaded directly by `load_supabase.ts` when Excel path is provided): myedb_code, trax_code, developer, authorizer, open_date, close_date, completion_end_date, ministry_subject_code

Each row in the Excel file represents one course + graduation program combination. The same course code appears multiple times if it counts toward different grad programs.

### 2. BC Course Registry (`course-details.json`)

- **Source**: BC Course Registry website (scraped per course code)
- **Script**: `scripts/scrape-course-details.py`
- **Output**: `src/data/course-details.json`
- **Fields**: programGuideTitle, publishedDescription, genericCourseType, gradRequirements, gradElectives
- **Last run**: Once during initial project setup (2025). Has not been re-run since.

#### How the scraper works

The script uses `curl` via subprocess to scrape the BC Course Registry at `www.bced.gov.bc.ca/datacollections/course_registry_web_search`. It is not browser automation — it makes raw HTTP requests.

```
For each unique course code in courses.json:
    1. POST to run-search.php to establish a session (cookie-based)
    2. GET run-details.php?courseCode={code} to fetch the detail page
    3. Parse the HTML response with regex to extract:
       - Program Guide Title
       - Published Description
       - Generic Course Type
       - Grad Program Requirements (table: program, requirement, examinable)
       - Grad Program Electives (table: program names)
    4. Save to progress file every 100 courses (resumable)
    5. Rate-limited to ~3 requests/second (0.3s sleep)
    6. Session refreshes every 200 requests
```

#### Limitations

- **Regex-based HTML parsing** — fragile, breaks if the BC Course Registry changes its HTML structure
- **951 courses have no description** — the registry returned empty results for these (mostly French-language and newer courses)
- **No validation** — doesn't verify if scraped data is complete or correct
- **Cookie/session dependent** — the BC registry requires a search session before detail pages work
- **Single-threaded** — takes ~30 minutes to scrape all 5,480 courses at 3 req/s

The scraper is resumable — if you interrupt it, re-running picks up where it left off (progress saved to `/tmp/bced_scrape_progress.json`).

## Updating Data

When the Ministry publishes a new Excel file:

1. Download the new file
2. Run `npm run import -- /path/to/file.xlsx` to regenerate `courses.json`
3. Optionally re-run the scraper if new course codes appear: `python3 scripts/scrape-course-details.py`
4. Commit both JSON files
5. Reload Supabase: `npm run db:load -- /path/to/file.xlsx` (or `npm run db:load` to use courses.json)
6. Deploy

## Supabase Schema

Tables are created by running `scripts/migrate.sql` in the Supabase SQL Editor (one-time setup).

| Table | Source | Primary Key | Rows |
|-------|--------|-------------|------|
| `courses` | Excel / courses.json | `(code, grade)` | 5,480 |
| `course_grad_programs` | Excel / courses.json | `(course_code, course_grade, grad_program)` | 11,241 |
| `course_details` | course-details.json | `code` | 5,480 |
| `course_grad_requirements` | course-details.json | `(course_code, requirement, examinable_date)` | 2,983 |
| `course_grad_electives` | course-details.json | `(course_code, grad_program)` | 3,833 |

## Important Notes

- Both JSON files are **committed to git** and serve as the seed source for Supabase
- The `xlsx` npm package is in `devDependencies` only — it has known vulnerabilities but is only used locally in the import script, never in production
- Deduplication happens at runtime in the browser (interim), and is implicit in the DB schema via the `(code, grade)` primary key
