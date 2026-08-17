# Tech Debt

Code and design issues that need fixing. Not bugs — the app works correctly — but areas where the code could be cleaner, more maintainable, or more performant.

For product features see [roadmap.md](roadmap.md). For automation ideas see [agentic-workflows.md](agentic-workflows.md).

## High Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-001 | Extract page.tsx into components | Large component. Break into FilterBar, CourseCard, CourseDetail, Pagination components. (Dedup logic no longer applies — removed in the ADR-007 cutover.) | Unassigned | Open |
| TD-002 | Move types to types.ts | Resolved (2026-06-11): `CourseDetail` now lives in `src/lib/types.ts`; `DeduplicatedCourse` was removed in the ADR-007 cutover | Unassigned | Resolved |
| TD-003 | Consolidate duplicated Excel transform | Resolved (2026-06-11): obsolete — `scripts/convert-excel.ts` and `src/app/api/import/route.ts` were both deleted in the ADR-007 cutover | Unassigned | Resolved |
| TD-004 | Accessibility audit and fixes | No skip-to-content link, no `<label>` on dropdowns, no `aria-expanded` on course cards, no keyboard nav, no `aria-live` for result counts, color contrast unaudited, decorative SVGs lack `aria-hidden` | Unassigned | Open |
| TD-012 | Add E2E tests | No end-to-end tests exist. Set up Playwright to cover critical user flows: page load, search, filter, expand course, clear filters, load more pagination, empty state | Unassigned | Open |

## Medium Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-005 | Migrate Google Fonts to next/font | `layout.tsx` loads Inter via raw `<link>` tags, bypassing Next.js font optimization. Duplicate `font-family` in globals.css | Unassigned | Open |
| TD-006 | Deduplicate SVG icons | Close icon and search icon each appear twice in page.tsx. Extract into icon components or constants | Unassigned | Open |
| TD-007 | Memoize card list for expand/collapse | Each `setExpanded` re-renders entire 50-item list. Extract card into `React.memo`-wrapped component | Unassigned | Open |
| TD-008 | Pre-filter JSON at build time | Resolved (2026-06-11): obsolete — no JSON ships; the DB is loaded already scoped to 2023 grades 10-12 | Unassigned | Resolved |
| TD-013 | Evaluate scraper approach | Resolved (2026-06-12): obsolete — the scraper (`scripts/scrape-course-details.py`) has been removed. The DB is the source of truth; refreshing details now means POSTing a payload through the write API (see R-011 for the future "fill missing descriptions" feature) | Unassigned | Resolved |
| TD-014 | Automate DB re-sync through the API | Re-sync is currently manual: assemble a snake_case payload file, then `npm run db:load -- ./payload.json`. Build a step that produces the API payload shape and POSTs it, so refreshes are one command | Unassigned | Open |
| TD-015 | Cache GET /api/courses | Resolved (2026-06-12): GET now sets `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so the CDN absorbs repeat loads instead of re-querying the DB each time | Unassigned | Resolved |
| TD-016 | Enforce code-uniqueness invariant | Resolved (2026-06-12): `migrate.sql` adds an idempotent `UNIQUE(code)` constraint so a bad load fails loudly; the [code] route no longer `.maybeSingle()`-errors on multiple rows (takes lowest grade via `.limit(1)`); GET pagination orders by `(code, grade)`. The constraint is applied and verified active on the live DB (`courses_code_unique`). Surfaced by code review | Unassigned | Resolved |
| TD-017 | Make POST /api/courses writes atomic | Partially resolved (2026-06-12): POST now validates the body (rejects empty/missing arrays with 400), uses a constant-time secret compare, and returns generic 500s (no raw `error.message` leaked). **Remaining:** the courses + course_details upserts are still sequential non-transactional batches, so a mid-stream failure can leave a partial load — make it all-or-nothing via a Postgres function/RPC. Surfaced by code review | Unassigned | Open |
| TD-018 | Detail fetch caches failures as "no details" | Resolved (2026-06-12): page.tsx now tracks `detailError` separately from `detailCache`, shows a Retry affordance on failure (no permanent poisoning), dedups in-flight fetches, and guards setState against unmount. Surfaced by code review | Unassigned | Resolved |
| TD-019 | Orphaned `profiles`/`saved_filter_sets` rows on account deletion | Migrating auth to Clerk (ADR-010) dropped the `UUID REFERENCES auth.users(id) ON DELETE CASCADE` FK — `id`/`user_id` are now plain `TEXT` with no DB-level cascade. There's no account-deletion feature today, so this is inert, but if one ships, deleting a Clerk user won't clean up their `profiles`/`saved_filter_sets` rows. Needs a Clerk `user.deleted` webhook to delete them explicitly before that feature ships | Unassigned | Open |
| TD-022 | Flaky default-filter auto-load test | Resolved: `"auto-loads the default filter set on mount when logged in"` (`src/app/page.test.tsx:445`) raced two independent `useEffect`s in `page.tsx` — one renders the unfiltered course list from `/api/courses`, the other chains `/api/auth/me` → `/api/user/filters` to apply the default saved filter set. The test only awaited the first effect (`findByText("Mathematics 10")`), then asserted the second effect's end-state synchronously. Passed intermittently depending on effect scheduling; failed deterministically on PR #17's CI. Fixed by awaiting the actual filtered end-state (`await screen.findByText("Science 11")`) instead of racing it | Unassigned | Resolved |
| TD-023 | Non-atomic default-filter-set race in `POST /api/user/filters` and `PATCH /api/user/filters/[id]` | Resolved: adapted the RPC approach from the unmerged `fix/default-filter-race-and-auth-improvements` branch (commit `4cc0f10`) for the post-Clerk `TEXT` user id. Added `insert_default_filter_set`/`set_default_filter_set` Postgres functions (`scripts/user-schema.sql`, plus `scripts/migrate-atomic-default-filter.sql` for the already-provisioned DB) that clear-then-write inside one transaction, replacing the two-round-trip pattern in both route handlers. `one_default_per_user` unique-violation still maps to a 409 for the client to retry. **DB migration applied and verified live** (2026-08-17): the two `CREATE OR REPLACE FUNCTION` statements were run in the Supabase SQL Editor. First live test hit `PGRST203` (function overloading), not the anticipated schema-cache 404 — an old `uuid`-typed version of both functions already existed from an earlier manual run of the pre-Clerk fix commit, and `CREATE OR REPLACE` doesn't replace a function whose parameter types changed, it adds an overload. Fixed with `DROP FUNCTION public.set_default_filter_set(uuid, uuid, text, jsonb);` and `DROP FUNCTION public.insert_default_filter_set(uuid, text, jsonb);`. Re-verified both RPCs directly via the Supabase REST API afterward — both return correct rows; no leftover test data | Unassigned | Resolved |

## Low Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-009 | Fix __dirname in convert-excel.ts | Resolved (2026-06-11): obsolete — `scripts/convert-excel.ts` was deleted in the ADR-007 cutover | Unassigned | Resolved |
| TD-010 | Add tsconfig for scripts | `scripts/` excluded from main tsconfig, TypeScript errors not caught by lint | Unassigned | Open |
| TD-011 | Optimize getFilterOptions to single pass | Five `.map()` passes over course array. Single pass would be more efficient (negligible at 5K rows) | Unassigned | Open |
