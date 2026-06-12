import { describe, it, expect } from "vitest";
import { toCourseListItem } from "./courses-mapper";

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
