import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

// Mock data modules before importing the component
vi.mock("@/data/courses.json", () => ({
  default: [
    { code: "MA10", grade: "10", title: "Mathematics 10", credits: "4", category: "Ministry", language: "English", subject: "Mathematics", subCategory: null, gradProgram: "2018 Graduation Program", gradRequirement: "Elective" },
    { code: "MA10", grade: "10", title: "Mathematics 10", credits: "4", category: "Ministry", language: "English", subject: "Mathematics", subCategory: null, gradProgram: "2023 Graduation Program", gradRequirement: "Required" },
    { code: "EN10", grade: "10", title: "English Language Arts 10", credits: "4", category: "Ministry", language: "English", subject: "English Language Arts", subCategory: null, gradProgram: "2018 Graduation Program", gradRequirement: "Required" },
    { code: "SC11", grade: "11", title: "Science 11", credits: "4", category: "Ministry", language: "English", subject: "Sciences", subCategory: "Life Sciences", gradProgram: null, gradRequirement: null },
    { code: "BA12", grade: "12", title: "Business Education 12", credits: "4", category: "Board Authority Authorized", language: "English", subject: "Business", subCategory: null, gradProgram: null, gradRequirement: null },
    { code: "FR10", grade: "10", title: "Français 10", credits: "4", category: "Ministry", language: "French", subject: "Languages", subCategory: null, gradProgram: null, gradRequirement: null },
    { code: "EL08", grade: "08", title: "Elementary Art 8", credits: "4", category: "Ministry", language: "English", subject: "Arts", subCategory: null, gradProgram: null, gradRequirement: null },
  ],
}));

vi.mock("@/data/course-details.json", () => ({
  default: {
    MA10: { publishedDescription: "An introduction to foundational mathematics concepts.", programGuideTitle: "Mathematics" },
    SC11: { publishedDescription: "Exploring the sciences.", gradElectives: ["Sciences", "Applied Skills"] },
  },
}));

import Home from "./page";

function renderHome() {
  cleanup();
  return render(<Home />);
}

describe("Home page", () => {
  it("renders the page title", () => {
    renderHome();
    expect(screen.getByText("BC Course Finder")).toBeInTheDocument();
  });

  it("filters out non-high-school grades", () => {
    renderHome();
    expect(screen.queryByText("Elementary Art 8")).not.toBeInTheDocument();
  });

  it("deduplicates courses by code+grade", () => {
    renderHome();
    // MA10 appears twice in mock data (two grad programs) but should show once in the list
    // It appears in the course card title and potentially in filter options
    const courseCards = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.includes("Mathematics 10")
    );
    expect(courseCards).toHaveLength(1);
  });

  it("displays course count", () => {
    renderHome();
    // 7 rows → filter out grade 08 → 6 rows → dedup MA10 → 5 unique courses
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });

  it("renders category glossary on initial load", () => {
    renderHome();
    expect(screen.getByText("Course Categories")).toBeInTheDocument();
  });

  it("can dismiss and restore the glossary", () => {
    renderHome();
    fireEvent.click(screen.getByLabelText("Dismiss glossary"));
    expect(screen.queryByText("Course Categories")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Show category guide"));
    expect(screen.getByText("Course Categories")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    renderHome();
    const searchInput = screen.getByPlaceholderText("Search by course title, code, or subject...");
    fireEvent.change(searchInput, { target: { value: "mathematics" } });

    expect(screen.getByText("Mathematics 10")).toBeInTheDocument();
    expect(screen.queryByText("English Language Arts 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });

  it("filters by grade dropdown", () => {
    renderHome();
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "11" } });

    expect(screen.getByText("Science 11")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
  });

  it("shows and hides clear filters button", () => {
    renderHome();
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search by course title, code, or subject...");
    fireEvent.change(searchInput, { target: { value: "math" } });
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
  });

  it("clears all filters", () => {
    renderHome();
    const searchInput = screen.getByPlaceholderText("Search by course title, code, or subject...");
    fireEvent.change(searchInput, { target: { value: "math" } });
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear all filters"));
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });

  it("expands and collapses course details", () => {
    renderHome();
    const courseButton = screen.getByText("Mathematics 10").closest("button")!;

    fireEvent.click(courseButton);
    expect(screen.getByText("An introduction to foundational mathematics concepts.")).toBeInTheDocument();

    fireEvent.click(courseButton);
    expect(screen.queryByText("An introduction to foundational mathematics concepts.")).not.toBeInTheDocument();
  });

  it("shows merged grad programs for deduplicated courses", () => {
    renderHome();
    fireEvent.click(screen.getByText("Mathematics 10").closest("button")!);

    expect(screen.getByText("2018 Graduation Program")).toBeInTheDocument();
    expect(screen.getByText("2023 Graduation Program")).toBeInTheDocument();
    expect(screen.getByText("Graduation Programs")).toBeInTheDocument();
  });

  it("shows no results message when nothing matches", () => {
    renderHome();
    const searchInput = screen.getByPlaceholderText("Search by course title, code, or subject...");
    fireEvent.change(searchInput, { target: { value: "xyznonexistent" } });

    expect(screen.getByText("No courses match your filters")).toBeInTheDocument();
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("renders all five filter dropdowns", () => {
    renderHome();
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(5);
  });

  it("shows grad electives when available", () => {
    renderHome();
    fireEvent.click(screen.getByText("Science 11").closest("button")!);

    expect(screen.getByText("Counts as Elective In")).toBeInTheDocument();
    expect(screen.getAllByText("Sciences").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Applied Skills")).toBeInTheDocument();
  });

  it("hides Detail fields with null values", () => {
    renderHome();
    fireEvent.click(screen.getByText("Business Education 12").closest("button")!);

    const expandedArea = screen.getByText("Business Education 12")
      .closest("button")!
      .parentElement!;
    expect(within(expandedArea).queryByText("Sub-category")).not.toBeInTheDocument();
  });

  it("combines multiple filters", () => {
    renderHome();
    const selects = screen.getAllByRole("combobox");
    // Grade = 10
    fireEvent.change(selects[0], { target: { value: "10" } });
    // Language = French
    fireEvent.change(selects[2], { target: { value: "French" } });

    expect(screen.getByText("Français 10")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });
});
