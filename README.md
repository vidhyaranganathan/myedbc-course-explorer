# BC Course Finder


[![CI](https://github.com/vidhyaranganathan/myedbc-course-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/vidhyaranganathan/myedbc-course-explorer/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/vidhyaranganathan/myedbc-course-explorer/main/.github/badges/coverage.json)](https://github.com/vidhyaranganathan/myedbc-course-explorer/actions/workflows/ci.yml)

Search and explore British Columbia's high school courses. Helps students, parents, and educators find courses by grade, category, subject, language, and credits.

**Live**: Deployed on Vercel (Hobby)

## Quick Start

```bash
git clone git@github.com:vidhyaranganathan/myedbc-course-explorer.git
cd myedbc-course-explorer
npm install    # automatically enables pre-push hook
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (service_role, server-only), and `API_WRITE_SECRET` in `.env.local`. See [Getting Started](docs/onboarding/getting-started.md) for details.

## How It Works

A Supabase Postgres database is the single source of truth. The browser never queries Supabase directly — all data goes through Next.js Route Handlers under `src/app/api/courses/`. On load, the app fetches `GET /api/courses` (~3,951 courses) once into the browser, then search and filtering happen in memory. Expanding a course card lazy-loads its details from `GET /api/courses/[code]`.

The app shows only the 2023 Graduation Program, grades 10-12. Course detail text originates from the **BC Course Registry** website (scraped, then loaded into the DB via the write API).

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Framework |
| React | 19 | UI |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 4 | Styling |
| Supabase | Postgres | Database (source of truth) |
| Vitest | 4 | Testing |
| Vercel | Hobby | Deployment |

## Scripts

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # Production build
npm run lint           # Run ESLint
npm run test           # Run tests
npm run test:coverage  # Run tests with coverage report
npm run db:load -- ./payload.json  # POST a JSON payload to /api/courses (gated upsert)
```

## Updating Course Data

The DB is the single source of truth — there is no committed JSON data file. To re-sync, produce a JSON payload file (snake_case rows matching the DB columns; see `scripts/load_supabase.ts` for the shape), then POST it through the write API:

```bash
python3 scripts/scrape-course-details.py    # generate detail data (transient, resumable)
npm run db:load -- ./payload.json           # POST the payload to /api/courses
```

`POST /api/courses` is secret-gated: the request must send `X-Api-Key` equal to env `API_WRITE_SECRET`. This is the only write path. No JSON data files are committed.

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Single-page app (search, filters, course list)
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Tailwind + animations
│   └── api/courses/      # DB gateway: GET (list), GET [code] (one+details), POST (gated upsert)
├── lib/
│   ├── search.ts         # In-memory filtering engine
│   ├── supabase-server.ts  # Server-only Supabase client (service_role key)
│   ├── courses-mapper.ts   # Maps DB snake_case rows ↔ API camelCase shapes
│   └── types.ts          # Course / CourseDetail type definitions

docs/
├── onboarding/           # Getting started, data pipeline
├── architecture/         # System overview, tech stack
├── decisions/            # Architecture Decision Records (ADRs)
└── roadmap/              # Feature roadmap, tech debt

scripts/
├── load_supabase.ts      # Reads a JSON payload and POSTs it to /api/courses
├── migrate.sql           # Supabase schema DDL (run once in SQL Editor)
└── scrape-course-details.py  # Course details scraper
```

## Documentation

See the [`docs/`](docs/) folder for:
- [Getting Started](docs/onboarding/getting-started.md) — setup and common tasks
- [Architecture Overview](docs/architecture/overview.md) — how the pieces fit together
- [Decision Records](docs/decisions/) — why things are built this way
- [Roadmap](docs/roadmap/roadmap.md) — what's planned next

## Development Automation

This repo uses **agent-assisted development** with Claude Code. Automation runs at every stage:

| Stage | What runs automatically |
|-------|------------------------|
| **On edit** | Auto-lint, auto-test, architecture drift detection, data file guard |
| **On push** | Pre-push hook: lint + test + coverage (75% floor) + build |
| **On PR** | CI pipeline + code reviewer subagent |
| **Weekly** | Docs audit checks for stale documentation |

Skills available: `/adr` (auto-triggers on decisions), `/backlog` (auto-routes items), `/gen-test`, `/docs-audit`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow, including how the automation works and what to expect.

## License

See [LICENSE](LICENSE) for details.
