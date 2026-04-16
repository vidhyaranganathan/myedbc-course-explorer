# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (CDN)                        │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Next.js Application                  │  │
│  │                                                   │  │
│  │  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │ Static JSON  │  │       Client-Side App       ││  │
│  │  │              │  │                             ││  │
│  │  │ courses.json │──│  page.tsx (single page)     ││  │
│  │  │ course-      │  │    ├─ Deduplication logic   ││  │
│  │  │ details.json │──│    ├─ Filter UI             ││  │
│  │  │              │  │    ├─ Course list            ││  │
│  │  └─────────────┘  │    └─ Detail expansion       ││  │
│  │                    │                             ││  │
│  │                    │  search.ts (filter engine)   ││  │
│  │                    │  types.ts  (Course type)     ││  │
│  │                    └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Offline / Dev only:
  ┌──────────────────┐    ┌──────────────────────────┐
  │ BC Ministry Excel│───▶│ scripts/convert-excel.ts │──▶ courses.json
  └──────────────────┘    └──────────────────────────┘
  ┌──────────────────┐    ┌──────────────────────────────┐
  │ BC Course        │───▶│ scripts/scrape-course-       │──▶ course-details.json
  │ Registry website │    │ details.py                   │
  └──────────────────┘    └──────────────────────────────┘
```

## Key Components

### `src/app/page.tsx` — The Application

The entire UI is a single client component (`"use client"`). It:

1. Imports both JSON data files at build time
2. Deduplicates courses by `code|grade` key on initial load
3. Filters to grades 9-12 only
4. Renders a filter bar + paginated course list
5. Expands course cards to show scraped details from `course-details.json`

### `src/lib/search.ts` — Filter Engine

Generic filtering functions that work with any type extending the `Searchable` interface:

- `filterCourses()` — applies text search (title, code, subject) + dropdown filters
- `getFilterOptions()` — extracts unique values with counts for filter dropdowns

### `src/lib/types.ts` — Type Definitions

Defines the `Course` interface matching the raw JSON structure. The `DeduplicatedCourse` type (defined in `page.tsx`) extends this by replacing `gradProgram`/`gradRequirement` with a `gradPrograms` array.

### `src/data/` — Static Data

Two committed JSON files that constitute the entire dataset. No database, no API calls.

## Testing Strategy

Three layers, run in order from cheapest to most expensive:

| Layer | Tool | File | What it proves |
|---|---|---|---|
| Unit | Vitest | `src/lib/search.test.ts` | Filter logic is correct with controlled data |
| Component | Vitest + RTL | `src/app/page.test.tsx` | UI renders and responds to events with mocked JSON |
| E2E | Playwright | `e2e/course-finder.spec.ts` | Real browser + real JSON data — the full user experience |

Run all layers: `npm run test:all`
Run E2E only: `npm run test:e2e`

E2E tests use Chromium headless. On failure, screenshots and traces are saved to `test-results/`.

## Design Principles

1. **Simplicity over sophistication**: Static JSON + client-side filtering is sufficient for ~5K courses
2. **No backend**: The data changes infrequently and fits comfortably in memory
3. **Fast iteration**: One file for the UI, one file for search logic, one file for types
4. **Offline-first data pipeline**: Data transformation happens on the developer's machine, not at runtime
