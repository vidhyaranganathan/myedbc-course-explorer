import { describe, it, expect } from "vitest";
import { toProfile, toSavedFilterSet } from "./user-mapper";

describe("toProfile", () => {
  it("maps snake_case DB columns to camelCase", () => {
    const row = { role: "student", grade_interest: [10, 11], school: "Burnaby North", district: "SD41" };
    expect(toProfile(row)).toEqual({
      role: "student",
      gradeInterest: [10, 11],
      school: "Burnaby North",
      district: "SD41",
    });
  });

  it("preserves null values", () => {
    const row = { role: null, grade_interest: null, school: null, district: null };
    expect(toProfile(row)).toEqual({
      role: null,
      gradeInterest: null,
      school: null,
      district: null,
    });
  });
});

describe("toSavedFilterSet", () => {
  it("maps snake_case DB columns to camelCase", () => {
    const row = {
      id: "abc-123",
      name: "Grade 11 Science",
      is_default: true,
      filters: { query: "", grades: ["11"], categories: [], languages: [], subjects: ["Science"], credits: [] },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };
    expect(toSavedFilterSet(row)).toEqual({
      id: "abc-123",
      name: "Grade 11 Science",
      isDefault: true,
      filters: { query: "", grades: ["11"], categories: [], languages: [], subjects: ["Science"], credits: [] },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });
});
