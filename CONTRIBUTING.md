# Contributing to BC Course Finder

Thanks for your interest in contributing! This doc covers everything you need to get started.

## Setup

```bash
git clone git@github.com:vidhyaranganathan/myedbc-course-explorer.git
cd myedbc-course-explorer
npm install    # automatically enables pre-push hook via prepare script
npm run dev
```

## Development Workflow

1. **Create a branch** from `main` — never push directly to `main`
2. **Make your changes** — the auto-lint hook runs on every file save in Claude Code
3. **Write tests** — new logic should have tests. Use `/gen-test <file>` in Claude Code to scaffold them
4. **Push your branch** — the pre-push hook runs lint, tests, and build automatically
5. **Open a PR** — CI runs the same checks. The code reviewer subagent reviews against project conventions

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- If your change affects architecture, write an [ADR](docs/decisions/template.md) first
- Make sure CI passes before requesting review
- Update docs if your change affects the project structure, commands, or data pipeline

## Code Conventions

- **TypeScript strict mode** — no `any` types
- **Tailwind CSS** for all styling — no inline styles or CSS modules
- **Generic functions** in `search.ts` — must work with any type extending `Searchable`
- **Test style** — use Vitest + React Testing Library. See `src/lib/search.test.ts` and `src/app/page.test.tsx` for patterns

## Project Architecture

This is a single-page Next.js app with no database. All data is static JSON loaded client-side. Key files:

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | The entire UI — search, filters, course list |
| `src/lib/search.ts` | Client-side filtering engine |
| `src/lib/types.ts` | Course type definitions |
| `src/data/courses.json` | Course data (generated, do not edit by hand) |
| `src/data/course-details.json` | Course descriptions (generated, do not edit by hand) |

Read the [Architecture Overview](docs/architecture/overview.md) and [Decision Records](docs/decisions/) for the full picture.

## Data Files

**Do not edit `src/data/*.json` by hand.** These files are generated:

- `courses.json` — from `npm run import` (Excel conversion)
- `course-details.json` — from `python3 scripts/scrape-course-details.py`

See the [Data Pipeline](docs/onboarding/data-pipeline.md) doc for details.

## Running Tests

```bash
npm run test           # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

## Deployment

The app is deployed on **Vercel Hobby (free tier)**. Only use features available on the Hobby plan — no Pro/Enterprise features.

Merging to `main` triggers a production deploy automatically.

## Claude Code Commands

If you're using Claude Code, these commands are available:

| Command | Purpose |
|---------|---------|
| `/adr <topic>` | Create an Architecture Decision Record |
| `/docs-audit` | Check all docs are up to date with the codebase |
| `/gen-test <file>` | Generate tests for a source file |

## Questions?

Open an issue or check the [onboarding docs](docs/onboarding/getting-started.md).
