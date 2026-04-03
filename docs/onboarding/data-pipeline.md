# Data Pipeline

This doc explains how course data flows from source to the running app.

## Overview

```
BC Ministry Excel file
        │
        ▼
  npm run import          (scripts/convert-excel.ts)
        │
        ▼
  src/data/courses.json   (12,741 rows, committed to git)
        │
        ▼
  Browser loads JSON      (page.tsx imports it statically)
        │
        ▼
  Client deduplicates     (code+grade key → 4,962 unique courses)
        │
        ▼
  Filtered to grades 9-12 and displayed


BC Course Registry website
        │
        ▼
  python3 scripts/scrape-course-details.py
        │
        ▼
  src/data/course-details.json   (5,480 entries, committed to git)
        │
        ▼
  Browser looks up details by course code
```

## Data Sources

### 1. BC Ministry Excel File (`courses.json`)

- **Source**: `~/Downloads/open_courses (1).xlsx` from the BC Ministry of Education
- **Conversion script**: `scripts/convert-excel.ts` (run via `npm run import`)
- **Output**: `src/data/courses.json`
- **Fields**: code, grade, title, credits, category, language, subject, subCategory, gradProgram, gradRequirement

Each row in the Excel file represents one course + graduation program combination. The same course code appears multiple times if it counts toward different grad programs.

### 2. BC Course Registry (`course-details.json`)

- **Source**: BC Course Registry website (scraped per course code)
- **Script**: `scripts/scrape-course-details.py`
- **Output**: `src/data/course-details.json`
- **Fields**: programGuideTitle, publishedDescription, genericCourseType, gradRequirements, gradElectives

The scraper is resumable — if you interrupt it, re-running picks up where it left off.

## Updating Data

When the Ministry publishes a new Excel file:

1. Download the new file
2. Run `npm run import -- /path/to/file.xlsx`
3. Optionally re-run the scraper if new course codes appear: `python3 scripts/scrape-course-details.py`
4. Commit both JSON files
5. Deploy

## Important Notes

- Both JSON files are **committed to git** and ship with the app — there is no runtime data fetching
- The `xlsx` npm package is in `devDependencies` only — it has known vulnerabilities but is only used locally in the import script, never in production
- Deduplication happens at runtime in the browser, not during the import step
