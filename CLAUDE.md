# CLAUDE.md

## **⚠️ IMPORTANT: This project runs on Vercel Hobby (free tier). Only use features available on the Hobby plan. No Pro/Enterprise features (Analytics, Speed Insights, Firewall, Edge Config, Cron Jobs, etc.). Keep it simple.**

## Project Overview

BC Course Finder — a single-page Next.js app to search and explore British Columbia's high school courses. The app shows only the 2023 Graduation Program, grades 10-12 (~3,951 courses). A Supabase Postgres database is the single source of truth; the browser never queries Supabase directly. All data access goes through Next.js Route Handlers under `src/app/api/courses/`. See ADR-006 (migrate to Supabase), ADR-007 (DB source of truth via API-only gateway), and ADR-008 (UI scope: 2023 grades 10-12).

## Project Structure

```
myedbc-course-explorer/
├── docs/                 # Onboarding, architecture, ADRs, roadmap
├── .claude/
│   ├── skills/            # /adr, /backlog, /docs-audit, /gen-test
│   └── agents/            # code-reviewer subagent
├── scripts/
│   ├── load_supabase.ts          # Reads a JSON payload and POSTs it to /api/courses
│   └── migrate.sql               # Supabase schema DDL (run once in SQL Editor)
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root layout (Inter font)
│   │   ├── page.tsx       # Search page (single page app)
│   │   ├── globals.css    # Tailwind + base styles + animations
│   │   └── api/courses/   # DB gateway: GET (list), POST (gated upsert)
│   └── lib/
│       ├── search.ts          # In-memory filtering logic (generic)
│       ├── supabase-server.ts # Server-only Supabase client (service_role key)
│       ├── courses-mapper.ts  # Maps DB snake_case rows ↔ API camelCase shapes
│       └── types.ts           # Course / CourseDetail type definitions
├── .env.example
├── package.json
├── next.config.ts
└── tsconfig.json
```

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 6
- **Styling**: Tailwind CSS 4
- **Data**: Supabase Postgres (single source of truth), reached only through the `src/app/api/courses/` route handlers
- **Deployment**: Vercel (single project)

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm run test     # Run tests (Vitest)
npm run test:coverage  # Run tests with coverage report
npm run db:load -- ./payload.json  # POST a JSON payload to /api/courses (gated upsert)
```

## API Layer

All DB access goes through Next.js Route Handlers under `src/app/api/courses/`:

- `GET /api/courses` — all courses (list) as JSON; feeds the client grid + in-memory filtering.
- `GET /api/courses/[code]` — one course from the `courses` table (REST get-by-id, no `course_details` — ADR-009); `404` if not found. Not used by the current UI (the grid filters the list client-side), but available for API consumers.
- `POST /api/courses` — secret-gated bulk upsert of courses only; header `X-Api-Key` must equal env `API_WRITE_SECRET`. This is the only write path.

The browser never queries Supabase directly. The `service_role` key (`SUPABASE_SECRET_KEY`) lives only in the server-side route handlers via `src/lib/supabase-server.ts`, and RLS is enabled on the DB.

## Data Pipeline

The DB is the single source of truth — there is no Excel and no committed JSON data file.

1. Produce a JSON payload file (snake_case rows matching the DB columns; see `scripts/load_supabase.ts` for the shape).
2. Run `npm run db:load -- ./payload.json` to POST it to `/api/courses`, which performs the gated upsert.
3. Schema is created once via `scripts/migrate.sql` in the Supabase SQL Editor.

Env vars (see `.env.example`, all server-only): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (service_role), `API_WRITE_SECRET`. There is no anon/publishable key in use.

## Course Data Fields

API-facing camelCase shapes (`src/lib/types.ts`); the DB stores snake_case columns (`src/lib/courses-mapper.ts`).

**Course (list item)**: code, grade, title, credits, category, language, subject, subCategory, gradRequirement

The `course_details` table exists in the DB but is not surfaced by any app code (ADR-009).

## Architecture Decisions

- **DB source of truth via API-only gateway**: Supabase is the single source of truth; the browser reaches it only through `src/app/api/courses/` route handlers (ADR-007, supersedes ADR-004; amended by ADR-009).
- **course_details not used by the app**: the table and its data remain in the DB but no app code references them; the API is courses-only (ADR-009).
- **In-memory search**: `GET /api/courses` loads all courses once into the client, then filtering is instant (<10ms).
- **No runtime deduplication**: The DB stores one row per course; the old `gradPrograms`/`DeduplicatedCourse` machinery is gone.
- **2023 Graduation Program, grades 10-12 only**: ~3,951 courses; grade 9 and non-2023 programs do not appear (ADR-008, supersedes ADR-005).

## Documentation

See `docs/` for onboarding guides, architecture overview, decision records, and roadmap.

## Skills

- `/adr <topic>` — Auto-generate an Architecture Decision Record in `docs/decisions/`
- `/docs-audit` — Audit all docs against the codebase, find stale content, and offer to fix it
- `/gen-test <file>` — Generate tests for a source file following project patterns
- `/backlog <description>` — Auto-routes to roadmap, tech-debt, or agentic-workflows based on content
- `/backlog-sweep` — Scans tracking files and closes items that are done (auto-triggers on "done"/"shipped")

## Branch Naming Convention

Branches must be named by feature, not by person. Format: `<type>/<short-description>`

| Type | Use for |
|------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Tooling, config, deps |
| `refactor/` | Code restructuring |
| `docs/` | Documentation only |

Examples: `feat/multi-select-filters`, `fix/pagination-scroll`, `refactor/extract-components`

Do **not** name branches after yourself (e.g. `Anitha`, `PriyaK`).

## Code Conventions

- TypeScript strict mode
- Tailwind CSS for all styling
- Generic filter functions in search.ts (work with any type extending Searchable)
- The browser never queries Supabase directly — all data goes through `src/app/api/courses/`. The `service_role` key stays server-side in `src/lib/supabase-server.ts`
