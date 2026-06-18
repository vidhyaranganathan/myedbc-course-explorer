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
    expect(await screen.findByText(/Couldn’t load courses/)).toBeInTheDocument();
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

  it("combines grade chip with dropdown filter", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Grade 10" }));
    fireEvent.click(screen.getByRole("button", { name: /all languages/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /french/i }));
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

  it("renders grade chips and four multi-select dropdowns", async () => {
    await renderLoaded();
    expect(screen.getByRole("button", { name: "Grade 10" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade 11" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grade 12" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all categories/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all languages/i })).toBeInTheDocument();
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
