# ADR-006: Migrate Data Layer to Supabase

**Status**: Accepted
**Date**: 2026-04-10
**Supersedes**: ADR-001

## Context

The app originally used static JSON files shipped with the build (see ADR-001). That approach was appropriate for a proof-of-concept but has clear limitations as the project moves toward a production release:

- Data updates require a code commit and a full redeploy
- No ability to add user-generated content (saved searches, course lists, notes)
- No ability to serve personalised or filtered data server-side
- The full dataset (~500 KB compressed) is downloaded on every initial page load
- Future features (graduation planner, recommendations, LLM chat — see roadmap) all require a persistent, queryable backend

Supabase was the original backend before the static-JSON simplification. The schema knowledge and data pipeline already exist.

## Decision

Migrate the runtime data layer from static JSON to Supabase (Postgres). The migration is done in two phases:

1. **Seed phase** — `scripts/load_supabase.ts` reads the committed JSON files and upserts them into three Supabase tables (`courses`, `course_grad_programs`, `course_grad_requirements`). Run manually via `npm run db:load`.
2. **App phase** — Replace the client-side JSON imports in `page.tsx` with Supabase queries using `@supabase/supabase-js`.

The static JSON files remain in the repo as the authoritative seed source and as a fallback during the transition.

## Supabase Table Schema

| Table | Primary Key | ~Rows |
|-------|-------------|-------|
| `courses` | `code` | 5,480 |
| `course_grad_programs` | `course_code, grad_program` | 12,741 |
| `course_grad_requirements` | `course_code, requirement, examinable_date` | varies |

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=       # Project URL from Supabase dashboard
SUPABASE_SECRET_KEY=            # service_role key (server/scripts only — never exposed to browser)
```

For the Next.js app (client-side queries), the publishable/anon key will also be needed once the app phase begins:

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon key, safe to expose
```

## Consequences

**Positive:**
- Data updates no longer require a redeploy — re-run `npm run db:load` after refreshing the JSON files
- Unlocks user-generated content, server-side filtering, and personalisation
- Enables all medium/long-term roadmap features (R-004, R-007, R-010)
- Reduces initial page load size (query only visible rows instead of full dataset)
- Supabase Hobby tier is free and compatible with Vercel Hobby

**Negative:**
- Adds infrastructure dependency — the app now requires a live Supabase project
- Requires secret management (`.env.local` locally, Vercel env vars in CI/CD)
- Slightly more complex local setup for new contributors
- Supabase free tier has row limits (500 MB storage, 50K MAU) — sufficient for now

**When to revisit:**
- If Supabase free-tier limits are hit (consider Supabase Pro or self-hosted Postgres)
- If query latency becomes a UX issue (consider edge caching or ISR)
