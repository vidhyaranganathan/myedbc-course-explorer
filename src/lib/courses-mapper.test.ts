import { describe, it, expect } from "vitest";
import { toCourseListItem, toCourseDetail } from "./courses-mapper";

describe("toCourseListItem", () => {
  it("maps snake_case DB columns to camelCase", () => {
    const row = {
      code: "MA10",
      grade: "10",
      title: "Mathematics 10",
      credits: "4",
      category: "Ministry",
      language: "English",
      subject: "Mathematics",
      sub_category: "Numeracy",
      grad_requirement: "Required",
    };
    expect(toCourseListItem(row)).toEqual({
      code: "MA10",
      grade: "10",
      title: "Mathematics 10",
      credits: "4",
      category: "Ministry",
      language: "English",
      subject: "Mathematics",
      subCategory: "Numeracy",
      gradRequirement: "Required",
    });
  });

  it("preserves null values", () => {
    const row = {
      code: "BA12",
      grade: "12",
      title: "Business 12",
      credits: null,
      category: "Board Authority Authorized",
      language: "English",
      subject: null,
      sub_category: null,
      grad_requirement: null,
    };
    const result = toCourseListItem(row);
    expect(result.credits).toBeNull();
    expect(result.subject).toBeNull();
    expect(result.subCategory).toBeNull();
    expect(result.gradRequirement).toBeNull();
  });
});

describe("toCourseDetail", () => {
  it("maps detail columns and passes through JSONB arrays", () => {
    const row = {
      generic_course_type: "Ministry-Developed",
      program_guide_title: "Mathematics",
      published_description: "Intro to math.",
      grad_requirements: [{ program: "2023 Graduation Program", requirement: "Required", examinable: "" }],
      grad_electives: ["Sciences"],
    };
    expect(toCourseDetail(row)).toEqual({
      genericCourseType: "Ministry-Developed",
      programGuideTitle: "Mathematics",
      publishedDescription: "Intro to math.",
      gradRequirements: [{ program: "2023 Graduation Program", requirement: "Required", examinable: "" }],
      gradElectives: ["Sciences"],
    });
  });

  it("defaults null JSONB arrays to empty arrays", () => {
    const row = {
      generic_course_type: null,
      program_guide_title: null,
      published_description: null,
      grad_requirements: null,
      grad_electives: null,
    };
    const result = toCourseDetail(row);
    expect(result.gradRequirements).toEqual([]);
    expect(result.gradElectives).toEqual([]);
  });
});
