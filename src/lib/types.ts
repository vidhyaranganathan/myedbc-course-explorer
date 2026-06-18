// Course data types.
//
// The app reads exclusively from the Supabase DB via the API layer (ADR-007) and
// uses only the `courses` table — `course_details` is not surfaced (ADR-009).
// These are the camelCase, API-facing shapes. The DB stores snake_case columns;
// see src/lib/courses-mapper.ts for the mapping.

/** One course row from the `courses` table (camelCase). */
export interface CourseListItem {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  subCategory: string | null;
  gradRequirement: string | null;
  publishedDescription: string | null;
}

/** Backwards-compatible alias. A course is one DB row. */
export type Course = CourseListItem;

/** Request body for POST /api/courses (snake_case rows matching the DB). */
export interface CourseUpsertRow {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  sub_category: string | null;
  myedb_code: string | null;
  trax_code: string | null;
  developer: string | null;
  grad_requirement: string | null;
  published_description: string | null;
}

export interface CourseUpsertBody {
  courses?: CourseUpsertRow[];
}
