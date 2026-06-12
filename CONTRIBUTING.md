# Contributing to BC Course Finder

Thanks for your interest in contributing! This repo uses Claude Code with automated hooks, skills, and subagents to maintain quality. This doc explains the development flow.

## Setup

```bash
git clone git@github.com:vidhyaranganathan/myedbc-course-explorer.git
cd myedbc-course-explorer
npm install    # automatically enables pre-push hook via prepare script
npm run dev
```

## How Development Works in This Repo

This project uses **agent-assisted development**. Claude Code skills, hooks, and subagents run automatically during your workflow — you don't need to remember to lint, test, or check for architectural violations. The automation handles it.

### What happens when you edit code

```
You edit a file
    │
    ├─ Auto-lint ──────── ESLint runs on .ts/.tsx files
    ├─ Auto-test ──────── Vitest runs if search.ts or page.tsx changed
    ├─ Drift detector ─── Checks your change against Architecture Decision Records
    └─ Data guard ──────── Blocks direct edits to src/data/*.json (those files no longer exist — data lives in Supabase, reached via the API layer)
```

### What happens when you push

```
git push
    │
    ├─ Lint ────────── Must pass (0 errors)
    ├─ Test + Coverage ── Must pass, coverage must stay above 75%
    └─ Build ────────── Must succeed
    │
    ▼
Push goes through (or is blocked with clear error)
```

### What happens on a PR

```
PR opened
    │
    ├─ CI ─────── Lint + build + test + coverage (GitHub Actions)
    └─ Review ─── Code reviewer subagent checks against project conventions
```

### Skills available during development

| Skill | What it does | When it triggers |
|-------|-------------|------------------|
| `/adr` | Creates Architecture Decision Records | Auto-triggers when decision language is detected ("let's use X instead of Y", "the tradeoff is...") |
| `/backlog` | Adds items to tracking files | Auto-routes to roadmap, tech-debt, or agentic-workflows based on content |
| `/backlog-sweep` | Closes completed backlog items | Auto-triggers when you say "done", "finished", or "shipped". Checks codebase for evidence before closing |
| `/gen-test` | Generates tests for a file | Use when adding new code. Follows project test patterns |
| `/docs-audit` | Audits docs against codebase | Use periodically. Also runs weekly via GitHub Actions |

## Branch Naming Convention

Branches must be named by **feature**, not by person. Format: `<type>/<short-description>`

| Type | Use for |
|------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Tooling, config, deps |
| `refactor/` | Code restructuring |
| `docs/` | Documentation only |

Examples: `feat/multi-select-filters`, `fix/pagination-scroll`, `refactor/extract-components`

Do **not** name branches after yourself (e.g. `Anitha`, `PriyaK`).

## Development Workflow

1. **Create a branch** from `main`
2. **Make your changes** — hooks run automatically in Claude Code (lint, test, drift detection)
3. **Write tests** — coverage must stay above 75%. Use `/gen-test <file>` to scaffold them
4. **Push your branch** — pre-push hook validates lint + coverage + build locally
5. **Open a PR** — CI runs the same checks, code reviewer subagent reviews

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- If your change affects architecture, the drift detector will flag it — write or update an [ADR](docs/decisions/template.md)
- Make sure CI passes before requesting review
- Update docs if your change affects the project structure, commands, or data pipeline

## Code Conventions

- **TypeScript strict mode** — no `any` types
- **Tailwind CSS** for all styling — no inline styles or CSS modules
- **Generic functions** in `search.ts` — must work with any type extending `Searchable`
- **Test style** — Vitest + React Testing Library. See `src/lib/search.test.ts` and `src/app/page.test.tsx` for patterns
- **Coverage floor** — 75% across statements, branches, functions, and lines

## Project Architecture

Single-page Next.js app backed by a Supabase Postgres database. The DB is the single source of truth, reached only through Next.js Route Handlers under `src/app/api/courses/` — the browser never queries Supabase directly (ADR-007). The app shows the 2023 Graduation Program, grades 10-12 only (ADR-008).

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | The entire UI — search, filters, course list |
| `src/app/api/courses/route.ts` | `GET` (all courses) + `POST` (secret-gated bulk upsert) |
| `src/app/api/courses/[code]/route.ts` | `GET` one course + its details (lazy-loaded) |
| `src/lib/search.ts` | In-memory filtering engine |
| `src/lib/supabase-server.ts` | Server-only Supabase client (service_role key) |
| `src/lib/courses-mapper.ts` | Maps DB snake_case rows ↔ API camelCase shapes |
| `src/lib/types.ts` | Course / CourseDetail type definitions |

Read the [Architecture Overview](docs/architecture/overview.md) and [Decision Records](docs/decisions/) for the full picture.

## Course Data

Course data lives in Supabase, not in committed files. There are no `src/data/*.json` files — the data guard hook still blocks any attempt to recreate them.

- **Read**: the app fetches `GET /api/courses` (the grid) and `GET /api/courses/[code]` (details when a card expands).
- **Write**: the only write path is `POST /api/courses` (secret-gated by the `X-Api-Key` header, which must match env `API_WRITE_SECRET`).
- **Re-sync**: produce a JSON payload file, then run `npm run db:load -- ./payload.json` to POST it through the API. `python3 scripts/scrape-course-details.py` can generate detail data, but its output is a transient payload, not a committed file.

See the [Data Pipeline](docs/onboarding/data-pipeline.md) doc for details.

## Tracking Work

Work is tracked in three files under `docs/roadmap/`:

| File | What goes in it | ID prefix |
|------|----------------|-----------|
| [roadmap.md](docs/roadmap/roadmap.md) | Product features | R-NNN | `Planned` → `In Progress` → `Done` |
| [tech-debt.md](docs/roadmap/tech-debt.md) | Code/design issues | TD-NNN | `Open` → `In Progress` → `Resolved` |
| [agentic-workflows.md](docs/roadmap/agentic-workflows.md) | Automation ideas | AW-NNN | `Idea` → `Planned` → `Implemented` |

- `/backlog <description>` — adds items, auto-routes to the right file
- `/backlog-sweep` — scans for completed items and closes them (checks codebase for evidence)

## Running Tests

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report (must stay above 75%)
```

## Deployment

Deployed on **Vercel Hobby (free tier)**. Only use features available on the Hobby plan.

Merging to `main` triggers a production deploy automatically.

## Questions?

Open an issue or check the [onboarding docs](docs/onboarding/getting-started.md).
