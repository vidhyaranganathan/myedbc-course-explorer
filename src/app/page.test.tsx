import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import type { CourseListItem } from "@/lib/types";
import Home from "./page";

const LIST: CourseListItem[] = [
  { code: "MA10", grade: "10", title: "Mathematics 10", credits: "4", category: "Ministry", language: "English", subject: "Mathematics", subCategory: null, gradRequirement: "Required", publishedDescription: null },
  { code: "EN10", grade: "10", title: "English Language Arts 10", credits: "4", category: "Ministry", language: "English", subject: "English Language Arts", subCategory: null, gradRequirement: "Required", publishedDescription: "Core literacy course." },
  { code: "SC11", grade: "11", title: "Science 11", credits: "4", category: "Ministry", language: "English", subject: "Sciences", subCategory: "Life Sciences", gradRequirement: null, publishedDescription: null },
  { code: "BA12", grade: "12", title: "Business Education 12", credits: "4", category: "Board Authority Authorized", language: "English", subject: "Business", subCategory: null, gradRequirement: null, publishedDescription: null },
  { code: "FR10", grade: "10", title: "Français 10", credits: "4", category: "Ministry", language: "French", subject: "Languages", subCategory: null, gradRequirement: null, publishedDescription: null },
];

function makeCourses(n: number): CourseListItem[] {
  return Array.from({ length: n }, (_, i) => ({
    code: `XX${String(i).padStart(2, "0")}`,
    grade: "10",
    title: `Course ${i + 1}`,
    credits: "4",
    category: "Ministry",
    language: "English",
    subject: "Mathematics",
    subCategory: null,
    gradRequirement: null,
    publishedDescription: null,
  }));
}

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

// The app reads only GET /api/courses (course_details is not used — ADR-009).
function installFetch(impl?: (url: string) => Promise<Response>) {
  const fn = vi.fn((input: string | URL) => {
    const url = String(input);
    if (impl) return impl(url);
    if (url === "/api/courses") return okJson(LIST);
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

async function renderLoaded() {
  cleanup();
  const fetchFn = installFetch();
  render(<Home />);
  await screen.findByText("Mathematics 10");
  return fetchFn;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("Home page — loading & data from API", () => {
  it("renders the page title immediately", () => {
    installFetch();
    render(<Home />);
    expect(screen.getByText("BC Course Finder")).toBeInTheDocument();
  });

  it("shows a loading state before data arrives", () => {
    installFetch();
    render(<Home />);
    expect(screen.getByText("Loading courses…")).toBeInTheDocument();
  });

  it("fetches courses from /api/courses and renders them", async () => {
    const fetchFn = installFetch();
    render(<Home />);
    await screen.findByText("Mathematics 10");
    expect(fetchFn).toHaveBeenCalledWith("/api/courses");
    expect(screen.getByText("Science 11")).toBeInTheDocument();
  });

  it("displays the total course count", async () => {
    await renderLoaded();
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });

  it("shows an error state when the courses request fails", async () => {
    installFetch(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response));
    render(<Home />);
    expect(await screen.findByText(/Couldn't load courses/)).toBeInTheDocument();
  });
});

describe("Home page — glossary", () => {
  it("renders category glossary on initial load", async () => {
    await renderLoaded();
    expect(screen.getByText("Course Categories")).toBeInTheDocument();
  });

  it("can dismiss and restore the glossary", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByLabelText("Dismiss glossary"));
    expect(screen.queryByText("Course Categories")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Show category guide"));
    expect(screen.getByText("Course Categories")).toBeInTheDocument();
  });
});

describe("Home page — filtering", () => {
  it("filters by search query", async () => {
    await renderLoaded();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "mathematics" },
    });
    expect(screen.getByText("Mathematics 10")).toBeInTheDocument();
    expect(screen.queryByText("English Language Arts 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });

  it("filters by grade chip", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Grade 11" }));
    expect(screen.getByText("Science 11")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
  });

  it("filters by language chip", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "French" }));
    expect(screen.getByText("Français 10")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });

  it("filters by category chip", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Board Authority Authorized" }));
    expect(screen.getByText("Business Education 12")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });

  it("deselects a chip on second click", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Grade 11" }));
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /grade 11/i }));
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });

  it("combines grade chip with language chip", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Grade 10" }));
    fireEvent.click(screen.getByRole("button", { name: "French" }));
    expect(screen.getByText("Français 10")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
  });

  it("shows and clears filters", async () => {
    await renderLoaded();
    expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    expect(screen.getByText("Clear all filters")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear all filters"));
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });

  it("shows no results message when nothing matches", async () => {
    await renderLoaded();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "xyznonexistent" },
    });
    expect(screen.getByText("No courses match your filters")).toBeInTheDocument();
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("renders chip groups for grade, language, category and dropdown filters for subject and credits", async () => {
    await renderLoaded();
    // Grade chips
    expect(screen.getByRole("button", { name: "Grade 10" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade 11" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade 12" })).toBeInTheDocument();
    // Language chips
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "French" })).toBeInTheDocument();
    // Category chips
    expect(screen.getByRole("button", { name: "Ministry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board Authority Authorized" })).toBeInTheDocument();
    // Subject and Credits remain as dropdowns
    expect(screen.getByRole("button", { name: /all subjects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all credits/i })).toBeInTheDocument();
  });

  it("filters by multi-select dropdown (OR match across selections)", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: /all subjects/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mathematics/i }));
    expect(screen.getByText("Mathematics 10")).toBeInTheDocument();
    expect(screen.queryByText("English Language Arts 10")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /English Language Arts/i }));
    expect(screen.getByText("Mathematics 10")).toBeInTheDocument();
    expect(screen.getByText("English Language Arts 10")).toBeInTheDocument();
    expect(screen.queryByText("Science 11")).not.toBeInTheDocument();
  });

  it("filters by multiple grade chips (OR match)", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Grade 11" }));
    fireEvent.click(screen.getByRole("button", { name: "Grade 12" }));
    expect(screen.getByText("Science 11")).toBeInTheDocument();
    expect(screen.getByText("Business Education 12")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
  });

  it("dropdown × clear button clears just that filter", async () => {
    await renderLoaded();
    // Apply subject filter
    fireEvent.click(screen.getByRole("button", { name: /all subjects/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mathematics/i }));
    expect(screen.getByText("1 of 5 courses")).toBeInTheDocument();
    // Clear just the subject filter via the × button
    fireEvent.click(screen.getByRole("button", { name: /clear subject filter/i }));
    expect(screen.getByText("5 courses")).toBeInTheDocument();
  });
});

describe("Home page — faceted counts", () => {
  it("subject dropdown only shows subjects matching the active grade filter", async () => {
    await renderLoaded();
    // With Grade 10 selected, Sciences (grade 11) and Business (grade 12) should not appear
    fireEvent.click(screen.getByRole("button", { name: "Grade 10" }));
    fireEvent.click(screen.getByRole("button", { name: /all subjects/i }));
    const listbox = screen.getByRole("listbox", { name: /subject/i });
    expect(within(listbox).getByText("Mathematics")).toBeInTheDocument();
    expect(within(listbox).getByText("English Language Arts")).toBeInTheDocument();
    expect(within(listbox).queryByText("Sciences")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Business")).not.toBeInTheDocument();
  });

  it("grade chips narrow to only grades with matching courses when a subject is selected", async () => {
    await renderLoaded();
    // Mathematics only exists in Grade 10 — faceted counts should remove Grade 11 and 12 chips
    fireEvent.click(screen.getByRole("button", { name: /all subjects/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Mathematics/i }));
    expect(screen.getByRole("button", { name: "Grade 10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grade 11" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grade 12" })).not.toBeInTheDocument();
  });
});

describe("Home page — pagination", () => {
  it("does not show the Show more button when results fit on one page", async () => {
    await renderLoaded();
    expect(screen.queryByRole("button", { name: /show more/i })).not.toBeInTheDocument();
  });

  it("shows the Show more button with remaining count when results exceed page size", async () => {
    installFetch(() => okJson(makeCourses(55)));
    render(<Home />);
    await screen.findByText("Course 1");
    expect(screen.getByRole("button", { name: /show more \(5 remaining\)/i })).toBeInTheDocument();
    expect(screen.getByText("Course 50")).toBeInTheDocument();
    expect(screen.queryByText("Course 51")).not.toBeInTheDocument();
  });

  it("loads the next page on click and hides the button when all results are shown", async () => {
    installFetch(() => okJson(makeCourses(55)));
    render(<Home />);
    await screen.findByText("Course 1");
    fireEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getByText("Course 55")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show more/i })).not.toBeInTheDocument();
  });

  it("resets to page 1 when a filter changes", async () => {
    installFetch(() => okJson(makeCourses(55)));
    render(<Home />);
    await screen.findByText("Course 1");
    fireEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getByText("Course 55")).toBeInTheDocument();
    // Applying a filter resets pagination — all 55 are Mathematics, so results stay
    // but the page counter resets; re-filtering to a non-matching query collapses the list
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "Course 1" },
    });
    // Only courses matching "Course 1" show (Course 1, Course 10-19) — well under PAGE_SIZE
    expect(screen.queryByRole("button", { name: /show more/i })).not.toBeInTheDocument();
    // Clearing the query should show page 1 again (50 courses), not all 55
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "" },
    });
    expect(screen.getByText("Course 50")).toBeInTheDocument();
    expect(screen.queryByText("Course 51")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show more/i })).toBeInTheDocument();
  });
});

describe("Home page — expand (courses-only, no detail fetch)", () => {
  it("expands to show the course's own fields", async () => {
    await renderLoaded();
    const card = screen.getByText("Science 11").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Toggle details" }));
    expect(within(card).getByText("Sub-category")).toBeInTheDocument();
    expect(within(card).getByText("Life Sciences")).toBeInTheDocument();
    expect(within(card).getByText("Subject")).toBeInTheDocument();
  });

  it("does NOT fetch course detail on expand", async () => {
    const fetchFn = await renderLoaded();
    const card = screen.getByText("Mathematics 10").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Toggle details" }));
    const detailCalls = fetchFn.mock.calls.filter((c) => String(c[0]) !== "/api/courses");
    expect(detailCalls).toHaveLength(0);
  });

  it("collapses on a second click", async () => {
    await renderLoaded();
    const card = screen.getByText("Mathematics 10").closest("article")!;
    const button = within(card).getByRole("button", { name: "Toggle details" });
    fireEvent.click(button);
    expect(within(card).getByText("Language")).toBeInTheDocument();
    fireEvent.click(button);
    expect(within(card).queryByText("Language")).not.toBeInTheDocument();
  });

  it("hides Detail fields with null values", async () => {
    await renderLoaded();
    const card = screen.getByText("Business Education 12").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Toggle details" }));
    expect(within(card).queryByText("Sub-category")).not.toBeInTheDocument();
    expect(within(card).queryByText("Grad requirement")).not.toBeInTheDocument();
  });

  it("shows published description when non-empty", async () => {
    await renderLoaded();
    const card = screen.getByText("English Language Arts 10").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Toggle details" }));
    expect(within(card).getByText("Published description")).toBeInTheDocument();
    expect(within(card).getByText("Core literacy course.")).toBeInTheDocument();
  });

  it("hides published description section when empty", async () => {
    await renderLoaded();
    const card = screen.getByText("Mathematics 10").closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: "Toggle details" }));
    expect(within(card).queryByText("Published description")).not.toBeInTheDocument();
  });
});
