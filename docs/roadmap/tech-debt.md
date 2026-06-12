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
| TD-016 | Enforce code-uniqueness invariant | Resolved (2026-06-12): `migrate.sql` now adds a `UNIQUE(code)` constraint (idempotent) so a bad load fails loudly; the [code] route no longer `.maybeSingle()`-errors on multiple rows (takes lowest grade via `.limit(1)`); GET pagination orders by `(code, grade)`. **Action:** run the constraint block in the Supabase SQL editor against the live DB (data has 0 dupes, so it applies cleanly). Surfaced by code review | Unassigned | Resolved |
| TD-017 | Make POST /api/courses writes atomic | Partially resolved (2026-06-12): POST now validates the body (rejects empty/missing arrays with 400), uses a constant-time secret compare, and returns generic 500s (no raw `error.message` leaked). **Remaining:** the courses + course_details upserts are still sequential non-transactional batches, so a mid-stream failure can leave a partial load — make it all-or-nothing via a Postgres function/RPC. Surfaced by code review | Unassigned | Open |
| TD-018 | Detail fetch caches failures as "no details" | Resolved (2026-06-12): page.tsx now tracks `detailError` separately from `detailCache`, shows a Retry affordance on failure (no permanent poisoning), dedups in-flight fetches, and guards setState against unmount. Surfaced by code review | Unassigned | Resolved |

## Low Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-009 | Fix __dirname in convert-excel.ts | Resolved (2026-06-11): obsolete — `scripts/convert-excel.ts` was deleted in the ADR-007 cutover | Unassigned | Resolved |
| TD-010 | Add tsconfig for scripts | `scripts/` excluded from main tsconfig, TypeScript errors not caught by lint | Unassigned | Open |
| TD-011 | Optimize getFilterOptions to single pass | Five `.map()` passes over course array. Single pass would be more efficient (negligible at 5K rows) | Unassigned | Open |
