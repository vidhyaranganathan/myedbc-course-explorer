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
| TD-014 | Automate DB re-sync through the API | Re-sync is currently manual: run the scraper, hand-assemble a snake_case payload file, then `npm run db:load -- ./payload.json`. Build a step that transforms scraper output into the API payload shape and POSTs it, so refreshes are one command | Unassigned | Open |
| TD-015 | Cache GET /api/courses | The list endpoint re-queries and re-serializes all ~4K rows on every page load with no caching. Add short-lived caching/ISR (Vercel Hobby-compatible) once it matters. See ADR-007 "when to revisit" | Unassigned | Open |
| TD-016 | Enforce code-uniqueness invariant | The detail route (`.maybeSingle()` on `code`), list pagination order, and the React keys/detail-cache in page.tsx all assume `code` is globally unique, but the schema PK is `(code, grade)` and POST upserts `onConflict: "code,grade"` — both permit a code at two grades. Verified 0 duplicates in current data, so it's dormant. Add a DB `UNIQUE(code)` constraint to make the invariant explicit (fails a bad load loudly), or key reads/UI on `(code, grade)`. Surfaced by code review | Unassigned | Open |
| TD-017 | Harden POST /api/courses writes | The only write path upserts the raw body in sequential non-transactional 200-row batches with no field validation. A bad row (e.g. null `title`/`category`) fails mid-stream, leaving the DB half-updated, and the opaque Postgres error is returned verbatim to the caller. Validate the payload shape before writing and/or make each table's load atomic. Also: API catch blocks return raw `error.message` (DB internals) to the client — return a generic message and log server-side. Surfaced by code review | Unassigned | Open |
| TD-018 | Detail fetch caches failures as "no details" | page.tsx `toggleExpand` writes `detailCache[code] = null` on both a genuinely-empty detail and a fetch error, and the `!(code in detailCache)` guard then never retries — a transient error silently shows "no details" forever. Distinguish the error state and allow retry. Surfaced by code review | Unassigned | Open |

## Low Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-009 | Fix __dirname in convert-excel.ts | Resolved (2026-06-11): obsolete — `scripts/convert-excel.ts` was deleted in the ADR-007 cutover | Unassigned | Resolved |
| TD-010 | Add tsconfig for scripts | `scripts/` excluded from main tsconfig, TypeScript errors not caught by lint | Unassigned | Open |
| TD-011 | Optimize getFilterOptions to single pass | Five `.map()` passes over course array. Single pass would be more efficient (negligible at 5K rows) | Unassigned | Open |
