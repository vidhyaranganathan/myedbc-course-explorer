// Pure mapping functions between DB snake_case rows and API camelCase shapes.
// Keeping these isolated means route handlers and the client never deal with
// raw column names, and the mapping is unit-testable without a DB.

import type { CourseListItem } from "./types";

/** Columns selected for the course list. */
export const COURSE_COLUMNS =
  "code, grade, title, credits, category, language, subject, sub_category, grad_requirement, published_description";

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
  published_description: string | null;
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
    publishedDescription: row.published_description,
  };
}
