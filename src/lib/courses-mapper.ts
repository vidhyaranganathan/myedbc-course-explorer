// Pure mapping functions between DB snake_case rows and API camelCase shapes.
// Keeping these isolated means route handlers and the client never deal with
// raw column names, and the mapping is unit-testable without a DB.

import type { CourseListItem, CourseDetail } from "./types";

/** Columns selected for the course list / single course. */
export const COURSE_COLUMNS =
  "code, grade, title, credits, category, language, subject, sub_category, grad_requirement";

/** Columns selected for course details. */
export const COURSE_DETAIL_COLUMNS =
  "generic_course_type, program_guide_title, published_description, grad_requirements, grad_electives";

interface CourseDbRow {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
  sub_category: string | null;
  grad_requirement: string | null;
}

interface CourseDetailDbRow {
  generic_course_type: string | null;
  program_guide_title: string | null;
  published_description: string | null;
  grad_requirements: { program: string; requirement: string; examinable: string }[] | null;
  grad_electives: string[] | null;
}

export function toCourseListItem(row: CourseDbRow): CourseListItem {
  return {
    code: row.code,
    grade: row.grade,
    title: row.title,
    credits: row.credits,
    category: row.category,
    language: row.language,
    subject: row.subject,
    subCategory: row.sub_category,
    gradRequirement: row.grad_requirement,
  };
}

export function toCourseDetail(row: CourseDetailDbRow): CourseDetail {
  return {
    genericCourseType: row.generic_course_type,
    programGuideTitle: row.program_guide_title,
    publishedDescription: row.published_description,
    gradRequirements: row.grad_requirements ?? [],
    gradElectives: row.grad_electives ?? [],
  };
}
