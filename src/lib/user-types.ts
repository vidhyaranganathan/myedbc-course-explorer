// Profile and saved-filter-set types.
//
// The app reads/writes these exclusively through src/app/api/user/* route
// handlers (ADR-007). These are the camelCase, API-facing shapes. The DB
// stores snake_case columns; see src/lib/user-mapper.ts for the mapping.
//
// Schema: scripts/user-schema.sql (public.profiles, public.saved_filter_sets).

import type { Filters } from "./search";

export const PROFILE_ROLES = ["student", "parent", "counselor", "teacher"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const VALID_GRADES = [10, 11, 12] as const;

/** One row from the `profiles` table (camelCase). */
export interface Profile {
  role: ProfileRole | null;
  gradeInterest: number[] | null;
  school: string | null;
  district: string | null;
}

export interface ProfileDbRow {
  role: string | null;
  grade_interest: number[] | null;
  school: string | null;
  district: string | null;
}

/** One row from the `saved_filter_sets` table (camelCase). */
export interface SavedFilterSet {
  id: string;
  name: string;
  isDefault: boolean;
  filters: Filters;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilterSetDbRow {
  id: string;
  name: string;
  is_default: boolean;
  filters: Filters;
  created_at: string;
  updated_at: string;
}
