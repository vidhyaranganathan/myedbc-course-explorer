// Course data types.
//
// The app reads exclusively from the Supabase DB via the API layer (ADR-007).
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
}

/** Backwards-compatible alias. A course is one DB row. */
export type Course = CourseListItem;

/** Detail for a course, from the `course_details` table (camelCase). */
export interface CourseDetail {
  genericCourseType: string | null;
  programGuideTitle: string | null;
  publishedDescription: string | null;
  gradRequirements: { program: string; requirement: string; examinable: string }[];
  gradElectives: string[];
}

/** Response shape for GET /api/courses/[code]. */
export interface CourseDetailResponse {
  course: CourseListItem;
  details: CourseDetail | null;
}

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
}

export interface CourseDetailUpsertRow {
  code: string;
  generic_course_type: string | null;
  program_guide_title: string | null;
  published_description: string | null;
  grad_requirements: { program: string; requirement: string; examinable: string }[];
  grad_electives: string[];
}

export interface CourseUpsertBody {
  courses?: CourseUpsertRow[];
  courseDetails?: CourseDetailUpsertRow[];
}
