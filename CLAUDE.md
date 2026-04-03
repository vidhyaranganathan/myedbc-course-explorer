# CLAUDE.md

## **⚠️ IMPORTANT: This project runs on Vercel Hobby (free tier). Only use features available on the Hobby plan. No Pro/Enterprise features (Analytics, Speed Insights, Firewall, Edge Config, Cron Jobs, etc.). Keep it simple.**

## Project Overview

BC Course Finder — a single-page Next.js app to search and explore British Columbia's K-12 courses. UI filters to grades 9-12 only. All data is loaded client-side from static JSON files. No database, no backend API.

## Project Structure

```
myedbc-course-explorer/
├── docs/                 # Onboarding, architecture, ADRs, roadmap
├── .claude/
│   ├── skills/            # /adr, /backlog, /docs-audit, /gen-test
│   └── agents/            # code-reviewer subagent
├── scripts/
│   ├── convert-excel.ts          # Excel → JSON conversion
│   └── scrape-course-details.py  # Scrapes per-course details from BC Course Registry
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root layout (Inter font)
│   │   ├── page.tsx       # Search page (single page app)
│   │   ├── globals.css    # Tailwind + base styles + animations
│   │   └── api/import/    # Dev-only Excel upload endpoint
│   ├── data/
│   │   ├── courses.json          # Generated from Excel (committed, 12,741 rows)
│   │   └── course-details.json   # Scraped from BC Course Registry (5,480 entries)
│   └── lib/
│       ├── search.ts      # Client-side filtering logic (generic)
│       └── types.ts       # Course type definition
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 6
- **Styling**: Tailwind CSS 4
- **Data**: Static JSON (generated from Excel + scraped details)
- **Deployment**: Vercel (single project)

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (Vitest)
npm run test:coverage  # Run tests with coverage report
npm run import   # Convert Excel → src/data/courses.json
python3 scripts/scrape-course-details.py  # Scrape course details (resumes automatically)
```

## Data Pipeline

1. Source: `~/Downloads/open_courses (1).xlsx` (BC Ministry of Education)
2. Run `npm run import` to convert to `src/data/courses.json`
3. Run `python3 scripts/scrape-course-details.py` to scrape per-course details into `src/data/course-details.json`
4. Both JSON files are committed to git and ship with the app
5. Client deduplicates courses by code+grade (12,741 → 4,962 unique) and filters to grades 9-12

Custom path: `npm run import -- /path/to/file.xlsx`

Dev-only upload: `POST /api/import` with multipart form file upload (blocked in production).

## Course Data Fields

**courses.json**: code, grade, title, credits, category, language, subject, subCategory, gradProgram, gradRequirement

**course-details.json** (keyed by course code): programGuideTitle, publishedDescription, genericCourseType, gradRequirements, gradElectives

## Architecture Decisions

- **Client-side search**: ~5K deduplicated courses loads once, filtering is instant (<10ms)
- **Deduplication**: Same course code appears multiple times in source data (one row per grad program). Deduplicated at runtime by code+grade, merging grad programs into an array
- **No database**: Data comes from a periodically updated Excel file, no need for a DB
- **No separate backend**: Single Next.js app, no CORS, no API server
- **xlsx in devDependencies**: Has unpatched vulns but only used in local import script
- **Grades 9-12 only**: Source data has all grades K-12 but UI filters to high school only

## Documentation

See `docs/` for onboarding guides, architecture overview, decision records, and roadmap.

## Skills

- `/adr <topic>` — Auto-generate an Architecture Decision Record in `docs/decisions/`
- `/docs-audit` — Audit all docs against the codebase, find stale content, and offer to fix it
- `/gen-test <file>` — Generate tests for a source file following project patterns
- `/backlog <description>` — Auto-routes to roadmap, tech-debt, or agentic-workflows based on content
- `/backlog-sweep` — Scans tracking files and closes items that are done (auto-triggers on "done"/"shipped")

## Code Conventions

- TypeScript strict mode
- Tailwind CSS for all styling
- Generic filter functions in search.ts (work with any type extending Searchable)
- DeduplicatedCourse type in page.tsx extends Course (replaces gradProgram/gradRequirement with gradPrograms array)
