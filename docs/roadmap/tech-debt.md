# Tech Debt

Tracked refactors identified during the simplify review (2026-04-02). These are not bugs — the app works correctly — but they represent areas where the code could be cleaner, more maintainable, or more performant.

## High Priority

### Extract page.tsx into components
`src/app/page.tsx` is 459 lines with mixed concerns: data transformation, constants, the main page component, and sub-components. Break into:
- `src/components/FilterBar.tsx`
- `src/components/CourseCard.tsx`
- `src/components/CourseDetail.tsx`
- `src/components/Pagination.tsx`
- `src/lib/courses.ts` (deduplication logic + CATEGORY_INFO constant)

### Move types to types.ts
`CourseDetail` and `DeduplicatedCourse` interfaces are defined inline in `page.tsx` but are used as project-wide conventions (referenced in code-reviewer agent, docs). Move to `src/lib/types.ts`.

### Consolidate duplicated Excel transform logic
`clean()` and `transformRow()` are copy-pasted between `scripts/convert-excel.ts` and `src/app/api/import/route.ts`. Extract to a shared `src/lib/excel.ts` module. Note: the script is excluded from tsconfig (`"exclude": ["scripts"]`), so only the API route can import from `src/lib/` — the script would need its own tsconfig or continue duplicating.

## Medium Priority

### Migrate Google Fonts to next/font
`src/app/layout.tsx` loads Inter via raw `<link>` tags, bypassing Next.js font optimization (self-hosting, preloading, CLS prevention). Replace with `next/font/google` import and remove the duplicate `font-family` declaration in `globals.css`.

### Deduplicate SVG icons
Close icon (`M6 18L18 6M6 6l12 12`) and search icon (`M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z`) each appear twice in `page.tsx`. Extract into small icon components or constants.

### Memoize card list for expand/collapse
Each `setExpanded` call re-renders the entire 50-item results list. Extracting the course card into a `React.memo`-wrapped component would limit re-renders to just the old and new expanded cards.

### Pre-filter JSON at build time
`courses.json` ships all 12K rows including K-8 grades, but only grades 9-12 are used. Pre-filtering during import would cut the JSON size and eliminate runtime filtering.

## Low Priority

### Fix __dirname usage in convert-excel.ts
`scripts/convert-excel.ts` uses `__dirname` which isn't available in ESM — it works only because `tsx` polyfills it. Use `import.meta.dirname` (Node 21+) for correctness.

### Add tsconfig for scripts
`scripts/` is excluded from the main tsconfig, so TypeScript errors in the import script aren't caught by `tsc` or `npm run lint`. Add a `tsconfig.scripts.json` that includes only `scripts/`.

### Optimize getFilterOptions to single pass
`getFilterOptions()` in `search.ts` does five separate `.map()` passes over the course array. A single pass building all five maps simultaneously would be more efficient, though with ~5K rows the impact is negligible (~2ms).
