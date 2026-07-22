// Pure mapping functions between DB snake_case rows and API camelCase shapes
// for profiles and saved filter sets. See src/lib/courses-mapper.ts for the
// same pattern applied to courses.

import type { Profile, ProfileDbRow, SavedFilterSet, SavedFilterSetDbRow, ProfileRole } from "./user-types";

export const PROFILE_COLUMNS = "role, grade_interest, school, district";
export const FILTER_SET_COLUMNS = "id, name, is_default, filters, created_at, updated_at";

export function toProfile(row: ProfileDbRow): Profile {
  return {
    role: row.role as ProfileRole | null,
    gradeInterest: row.grade_interest,
    school: row.school,
    district: row.district,
  };
}

export function toSavedFilterSet(row: SavedFilterSetDbRow): SavedFilterSet {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    filters: row.filters,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
