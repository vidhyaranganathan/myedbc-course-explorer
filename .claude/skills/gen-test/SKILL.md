---
name: gen-test
description: Generate tests for source files following the project's established Vitest + React Testing Library patterns
---

Generate tests for a source file following the project's established testing patterns.

Target file: $ARGUMENTS

If no file is specified, find the most recently modified `.ts` or `.tsx` file under `src/` and generate tests for it.

## Instructions

1. **Read the target file** to understand what needs testing
2. **Read existing test files** to match the established patterns:
   - `src/lib/search.test.ts` — unit test pattern for pure functions
   - `src/app/page.test.tsx` — component test pattern with mocked JSON data

3. **Generate the test file** next to the source (e.g., `foo.ts` → `foo.test.ts`):

### For lib/ files (pure functions):
- Import from vitest: `describe`, `it`, `expect`
- Test each exported function
- Cover: normal cases, edge cases (empty input, null values), boundary conditions
- No mocking needed for pure functions

### For app/ component files:
- Import from vitest + testing-library: `describe`, `it`, `expect`, `vi`, `render`, `screen`, `fireEvent`, `cleanup`, `waitFor`
- Mock `global.fetch` to return the API responses the component fetches (e.g. `GET /api/courses` → a small `CourseListItem[]`, `GET /api/courses/[code]` → `{ course, details }`). Data comes from the API, not committed JSON files.
- Use a helper that installs the fetch mock, renders, then `await screen.findByText(...)` for the first item (the initial load is async). See `src/app/page.test.tsx` for the pattern.
- Test: loading/error/empty states, user interactions, conditional rendering, lazy detail load + retry on failure
- Use `screen.getByText`, `screen.getByRole`, `screen.getByPlaceholderText` — prefer accessible queries

### For api/ route files:
- Test the exported HTTP handler(s) (`GET`, `POST`, etc.)
- `vi.mock("@/lib/supabase-server")` and return a fake Supabase query builder (a chainable thenable exposing `select`/`eq`/`order`/`range`/`limit`/`maybeSingle`/`upsert`). See `src/app/api/courses/route.test.ts`.
- Test: success path + mapped output, auth (401), input validation (400), not-found (404), and DB-error (generic 500) paths; for writes, assert the upsert args (rows, `onConflict`) and batching

4. **Run the tests** with `npm run test -- <test-file-path>` to verify they pass
5. **Run coverage** with `npm run test:coverage` and report the coverage change

## Style Rules
- One `describe` block per exported function/component
- Descriptive test names: `it("returns empty array when no courses match")`
- No snapshot tests — use explicit assertions
- Keep mock data minimal but realistic (use actual field names from `src/lib/types.ts`)
