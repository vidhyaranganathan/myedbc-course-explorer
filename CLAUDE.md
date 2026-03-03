# CLAUDE.md

## Project Overview

BC Course Finder — a single-page Next.js app to search and explore British Columbia's 12,741 courses. All data is loaded client-side from a static JSON file. No database, no backend API.

## Project Structure

```
myedbc-course-explorer/
├── scripts/
│   └── convert-excel.ts   # Excel → JSON conversion
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Search page (single page app)
│   │   ├── globals.css    # Tailwind + base styles
│   │   └── api/import/    # Dev-only Excel upload endpoint
│   ├── data/
│   │   └── courses.json   # Generated from Excel (committed)
│   └── lib/
│       ├── search.ts      # Client-side filtering logic
│       └── types.ts       # Course type definition
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Data**: Static JSON (generated from Excel)
- **Deployment**: Vercel (single project)

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run import   # Convert Excel → src/data/courses.json
```

## Data Pipeline

1. Source: `~/Downloads/open_courses (1).xlsx` (BC Ministry of Education)
2. Run `npm run import` to convert to `src/data/courses.json`
3. JSON is committed to git and ships with the app
4. Client loads all 12,741 courses and filters in-browser

Custom path: `npm run import -- /path/to/file.xlsx`

Dev-only upload: `POST /api/import` with multipart form file upload (blocked in production).

## Course Data Fields

code, grade, title, credits, category, language, subject, subCategory, gradProgram, gradRequirement

## Architecture Decisions

- **Client-side search**: 12K courses (~3.7 MB JSON) loads once, filtering is instant (<10ms)
- **No database**: Data comes from a periodically updated Excel file, no need for a DB
- **No separate backend**: Single Next.js app, no CORS, no API server
- **xlsx in devDependencies**: Has unpatched vulns but only used in local import script

## Code Conventions

- TypeScript strict mode
- Tailwind CSS for all styling
- Same course code can appear multiple times (different graduation programs)
