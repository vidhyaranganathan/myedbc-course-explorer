# ADR-002: Client-Side Search and Filtering

**Status**: Accepted  
**Date**: 2025

## Context

With ~5K deduplicated courses loaded as static JSON, we needed to decide where search and filtering logic should run.

Options considered:

1. **Server-side search** (API endpoint with query params)
2. **Client-side filtering** (filter the in-memory array in the browser)
3. **Search service** (Algolia, ElasticSearch, etc.)

## Decision

Client-side filtering using generic TypeScript functions in `src/lib/search.ts`.

## Consequences

**Positive:**
- Instant results (<10ms filter time for ~5K items)
- No network round-trips for filter changes
- Works offline once the page loads
- Generic `filterCourses()` function works with any type extending `Searchable`
- Filter option counts are computed once at load time from the full dataset

**Negative:**
- Full-text search is basic (substring matching on title, code, subject)
- No fuzzy matching, typo tolerance, or relevance ranking
- All data must fit in browser memory

**Neutral:**
- Pagination is client-side (PAGE_SIZE = 50, "load more" pattern)
