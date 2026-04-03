import { describe, it, expect } from "vitest";
import { filterCourses, getFilterOptions, emptyFilters, type Filters } from "./search";

interface TestCourse {
  code: string;
  grade: string;
  title: string;
  credits: string | null;
  category: string;
  language: string;
  subject: string | null;
}

const courses: TestCourse[] = [
  { code: "MA10", grade: "10", title: "Mathematics 10", credits: "4", category: "Ministry", language: "English", subject: "Mathematics" },
  { code: "EN10", grade: "10", title: "English Language Arts 10", credits: "4", category: "Ministry", language: "English", subject: "English Language Arts" },
  { code: "SC11", grade: "11", title: "Science 11", credits: "4", category: "Ministry", language: "English", subject: "Sciences" },
  { code: "FR10", grade: "10", title: "Français langue première 10", credits: "4", category: "Ministry", language: "French", subject: "Languages" },
  { code: "BA12", grade: "12", title: "Business Education 12", credits: "4", category: "Board Authority Authorized", language: "English", subject: "Business" },
  { code: "AR09", grade: "09", title: "Art 9", credits: null, category: "Ministry", language: "English", subject: null },
];

describe("filterCourses", () => {
  it("returns all courses with empty filters", () => {
    const result = filterCourses(courses, emptyFilters);
    expect(result).toHaveLength(6);
  });

  it("filters by text query matching title", () => {
    const filters: Filters = { ...emptyFilters, query: "math" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("MA10");
  });

  it("filters by text query matching code", () => {
    const filters: Filters = { ...emptyFilters, query: "EN10" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("English Language Arts 10");
  });

  it("filters by text query matching subject", () => {
    const filters: Filters = { ...emptyFilters, query: "sciences" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("SC11");
  });

  it("text query is case-insensitive", () => {
    const filters: Filters = { ...emptyFilters, query: "MATHEMATICS" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
  });

  it("filters by grade", () => {
    const filters: Filters = { ...emptyFilters, grade: "10" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.grade === "10")).toBe(true);
  });

  it("filters by category", () => {
    const filters: Filters = { ...emptyFilters, category: "Board Authority Authorized" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("BA12");
  });

  it("filters by language", () => {
    const filters: Filters = { ...emptyFilters, language: "French" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("FR10");
  });

  it("filters by subject", () => {
    const filters: Filters = { ...emptyFilters, subject: "Mathematics" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
  });

  it("filters by credits", () => {
    const filters: Filters = { ...emptyFilters, credits: "4" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(5);
  });

  it("combines multiple filters", () => {
    const filters: Filters = { ...emptyFilters, grade: "10", language: "English" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.code).sort()).toEqual(["EN10", "MA10"]);
  });

  it("combines text query with dropdown filters", () => {
    const filters: Filters = { ...emptyFilters, query: "10", grade: "10" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when no courses match", () => {
    const filters: Filters = { ...emptyFilters, grade: "08" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(0);
  });

  it("handles course with null subject in query search", () => {
    const filters: Filters = { ...emptyFilters, query: "art 9" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("AR09");
  });

  it("does not match null credits filter", () => {
    const filters: Filters = { ...emptyFilters, credits: "" };
    const result = filterCourses(courses, filters);
    expect(result).toHaveLength(6);
  });
});

describe("getFilterOptions", () => {
  it("extracts unique grades with counts", () => {
    const options = getFilterOptions(courses);
    expect(options.grades).toContainEqual({ value: "10", count: 3 });
    expect(options.grades).toContainEqual({ value: "11", count: 1 });
    expect(options.grades).toContainEqual({ value: "12", count: 1 });
    expect(options.grades).toContainEqual({ value: "09", count: 1 });
  });

  it("extracts unique categories with counts", () => {
    const options = getFilterOptions(courses);
    expect(options.categories).toContainEqual({ value: "Ministry", count: 5 });
    expect(options.categories).toContainEqual({ value: "Board Authority Authorized", count: 1 });
  });

  it("extracts unique languages with counts", () => {
    const options = getFilterOptions(courses);
    expect(options.languages).toContainEqual({ value: "English", count: 5 });
    expect(options.languages).toContainEqual({ value: "French", count: 1 });
  });

  it("extracts subjects excluding null values", () => {
    const options = getFilterOptions(courses);
    const subjectValues = options.subjects.map((s) => s.value);
    expect(subjectValues).not.toContain(null);
    expect(subjectValues).toContain("Mathematics");
    expect(options.subjects).toHaveLength(5);
  });

  it("extracts credits excluding null values", () => {
    const options = getFilterOptions(courses);
    expect(options.credits).toHaveLength(1);
    expect(options.credits[0]).toEqual({ value: "4", count: 5 });
  });

  it("sorts options alphabetically by value", () => {
    const options = getFilterOptions(courses);
    const subjectValues = options.subjects.map((s) => s.value);
    const sorted = [...subjectValues].sort();
    expect(subjectValues).toEqual(sorted);
  });

  it("returns empty arrays for empty input", () => {
    const options = getFilterOptions([]);
    expect(options.grades).toHaveLength(0);
    expect(options.categories).toHaveLength(0);
    expect(options.languages).toHaveLength(0);
    expect(options.subjects).toHaveLength(0);
    expect(options.credits).toHaveLength(0);
  });
});

describe("emptyFilters", () => {
  it("has all empty string values", () => {
    expect(Object.values(emptyFilters).every((v) => v === "")).toBe(true);
  });

  it("has all expected filter keys", () => {
    expect(Object.keys(emptyFilters).sort()).toEqual(
      ["category", "credits", "grade", "language", "query", "subject"]
    );
  });
});
