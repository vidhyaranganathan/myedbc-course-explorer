# Getting Started

Welcome to BC Course Finder! This guide will get you up and running.

## Prerequisites

- **Node.js** 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** (comes with Node.js)
- **Git**
- **Supabase project** (free tier) — the database is the source of truth and powers the API layer

## Setup

```bash
# Clone the repo
git clone <repo-url>
cd myedbc-course-explorer

# Install dependencies (automatically enables pre-push hook)
npm install

# Copy the env template and fill in your credentials
cp .env.example .env.local
# Edit .env.local and set SUPABASE_URL, SUPABASE_SECRET_KEY, and API_WRITE_SECRET

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment variables

All three are read **server-side only** — none are exposed to the browser.

| Var | Purpose |
|-----|---------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | service_role key — used only by the API route handlers |
| `API_WRITE_SECRET` | shared secret that gates `POST /api/courses` (sent as the `X-Api-Key` header) |

There is no anon/publishable key — the browser never queries Supabase directly.

## Project at a Glance

BC Course Finder is a **single-page Next.js app** that lets users search and explore British Columbia's high school courses. It shows only the 2023 Graduation Program, grades 10-12 (~3,951 courses). A Supabase Postgres database is the single source of truth; the browser reaches it only through the Next.js API layer under `src/app/api/courses/`.

Key things to know:

- **One page**: The entire UI lives in `src/app/page.tsx`
- **API-only data access**: The browser never queries Supabase directly. The app fetches `GET /api/courses` for the grid. The only write path is the secret-gated `POST /api/courses`.
- **In-memory filtering**: Once the course list is fetched, all search/filter logic runs in the browser via `src/lib/search.ts`
- **Server-only secrets**: The `service_role` key (`SUPABASE_SECRET_KEY`) lives only in the route handlers via `src/lib/supabase-server.ts`. RLS is enabled and there is no anon key in use.

## Common Tasks

### Run the dev server

```bash
npm run dev
```

### Run a production build

```bash
npm run build
```

### Run the linter

```bash
npm run lint
```

### Load data into the database

The DB is the single source of truth — load data by POSTing a JSON payload file through the write API:

```bash
npm run db:load -- ./payload.json
```

`scripts/load_supabase.ts` reads the payload file and POSTs it to `/api/courses`, which performs the secret-gated upsert. It reads `API_WRITE_SECRET` from `.env.local` and sends it as the `X-Api-Key` header; the dev server must be running. The upsert is idempotent and safe to re-run. See ADR-006 and ADR-007 for the migration rationale, and the [Data Pipeline](data-pipeline.md) doc for the payload shape.

## Next Steps

- Read the [Architecture Overview](../architecture/overview.md) to understand how the pieces fit together
- Check the [Decision Records](../decisions/) to understand why things are built this way
- See the [Roadmap](../roadmap/roadmap.md) for what's planned next
