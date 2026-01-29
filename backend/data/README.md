# Course Data

This directory contains the source data files for the BC Course Finder.

## Required Files

### `open_courses.xlsx`

The Excel file containing BC course data. This file should be obtained from the BC Ministry of Education.

**Expected columns (18 total):**

1. Course Code - Unique identifier for the course
2. Grade - K, 01-12
3. Course Title - Full name of the course
4. Credit Value - Credits (e.g., "4", "1,2,4")
5. MyEd BC Code - Secondary identifier
6. TRAX Code - Transcript code
7. Course Category - Ministry, External Credential, Board Authority Authorized, Locally Developed
8. Lang Of Inst - English or French
9. Developer - Organization that created the course
10. Authorizer - Organization that approved the course
11. Open Date - When the course became available
12. Close Date - When the course closes (if applicable)
13. Completion End Date - End date for completion
14. Grad Program - Graduation program name
15. Grad Program Requirement - Elective, Required, etc.
16. HST Main Category - High-level subject categorization
17. HST Sub Category - Detailed subject categorization
18. Ministry Subject Code - BC Ministry classification

## Import Process

1. Place `open_courses.xlsx` in this directory
2. Ensure `.env` file is configured with Supabase credentials
3. Run the database migrations in Supabase SQL Editor
4. Run: `npm run import`

## Notes

- The Excel file is NOT committed to git (see .gitignore)
- Current data contains approximately 12,741 courses
- Same course codes may appear multiple times for different graduation programs
