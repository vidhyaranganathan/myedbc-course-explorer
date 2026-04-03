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
- Import from vitest + testing-library: `describe`, `it`, `expect`, `vi`, `render`, `screen`, `fireEvent`, `cleanup`
- Mock `@/data/courses.json` and `@/data/course-details.json` with small realistic datasets (5-7 entries)
- Use a `renderComponent()` helper that calls `cleanup()` then `render()`
- Test: renders correctly, user interactions, conditional rendering, edge cases
- Use `screen.getByText`, `screen.getByRole`, `screen.getByPlaceholderText` — prefer accessible queries

### For api/ route files:
- Test the exported HTTP handler function
- Mock filesystem operations and external dependencies
- Test: success path, error responses, input validation, edge cases

4. **Run the tests** with `npm run test -- <test-file-path>` to verify they pass
5. **Run coverage** with `npm run test:coverage` and report the coverage change

## Style Rules
- One `describe` block per exported function/component
- Descriptive test names: `it("returns empty array when no courses match")`
- No snapshot tests — use explicit assertions
- Keep mock data minimal but realistic (use actual field names from `src/lib/types.ts`)
