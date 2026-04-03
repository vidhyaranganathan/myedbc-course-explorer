# Tech Debt

Code and design issues that need fixing. Not bugs — the app works correctly — but areas where the code could be cleaner, more maintainable, or more performant.

For product features see [roadmap.md](roadmap.md). For automation ideas see [agentic-workflows.md](agentic-workflows.md).

## High Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-001 | Extract page.tsx into components | 459-line god component. Break into FilterBar, CourseCard, CourseDetail, Pagination components + `src/lib/courses.ts` for dedup logic | Unassigned | Open |
| TD-002 | Move types to types.ts | `CourseDetail` and `DeduplicatedCourse` are inline in page.tsx but used as project-wide conventions | Unassigned | Open |
| TD-003 | Consolidate duplicated Excel transform | `clean()` and `transformRow()` copy-pasted between `scripts/convert-excel.ts` and `src/app/api/import/route.ts` | Unassigned | Open |
| TD-004 | Accessibility audit and fixes | No skip-to-content link, no `<label>` on dropdowns, no `aria-expanded` on course cards, no keyboard nav, no `aria-live` for result counts, color contrast unaudited, decorative SVGs lack `aria-hidden` | Unassigned | Open |
| TD-012 | Add E2E tests | No end-to-end tests exist. Set up Playwright to cover critical user flows: page load, search, filter, expand course, clear filters, load more pagination, empty state | Unassigned | Open |

## Medium Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-005 | Migrate Google Fonts to next/font | `layout.tsx` loads Inter via raw `<link>` tags, bypassing Next.js font optimization. Duplicate `font-family` in globals.css | Unassigned | Open |
| TD-006 | Deduplicate SVG icons | Close icon and search icon each appear twice in page.tsx. Extract into icon components or constants | Unassigned | Open |
| TD-007 | Memoize card list for expand/collapse | Each `setExpanded` re-renders entire 50-item list. Extract card into `React.memo`-wrapped component | Unassigned | Open |
| TD-008 | Pre-filter JSON at build time | `courses.json` ships all 12K rows including K-8. Pre-filter during import to cut size | Unassigned | Open |
| TD-013 | Evaluate scraper approach | Current scraper uses curl + regex HTML parsing — fragile and misses 951 courses. Evaluate alternatives: Playwright browser automation (renders JS, handles sessions natively), Cheerio/JSDOM for structured parsing, or an official BC API if one exists. Consider also scraping the BC curriculum site as a secondary source for missing descriptions | Unassigned | Open |

## Low Priority

| ID | Issue | Description | Assigned | Status |
|----|-------|-------------|----------|--------|
| TD-009 | Fix __dirname in convert-excel.ts | Uses `__dirname` which isn't available in ESM — works only because `tsx` polyfills it | Unassigned | Open |
| TD-010 | Add tsconfig for scripts | `scripts/` excluded from main tsconfig, TypeScript errors not caught by lint | Unassigned | Open |
| TD-011 | Optimize getFilterOptions to single pass | Five `.map()` passes over course array. Single pass would be more efficient (negligible at 5K rows) | Unassigned | Open |
