# ADR-004: Deduplication at Runtime

**Status**: Accepted  
**Date**: 2025

## Context

The source Excel file contains ~12,741 rows, but many are duplicates — the same course appears multiple times (once per graduation program it applies to). We needed to decide where to deduplicate.

Options considered:

1. **Deduplicate during import** (in `convert-excel.ts`)
2. **Deduplicate at runtime** (in `page.tsx` when the app loads)

## Decision

Deduplicate at runtime in the browser. The raw `courses.json` preserves all rows from the Excel file. The client groups by `code|grade` key and merges graduation programs into an array.

## Consequences

**Positive:**
- `courses.json` is a faithful representation of the source data
- Easy to verify data integrity (row count matches the Excel)
- Graduation program information is preserved by merging into a `gradPrograms` array
- If deduplication logic needs to change, no re-import is needed

**Negative:**
- JSON file is larger than it needs to be (~12K rows instead of ~5K)
- Deduplication runs on every page load (though it's fast — single-digit milliseconds)
- The `DeduplicatedCourse` type adds complexity to the type system
