import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";
import type { CourseListItem } from "@/lib/types";
import type { SavedFilterSet } from "@/lib/user-types";
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

// The app reads GET /api/courses and GET /api/auth/me (course_details is not used — ADR-009).
function installFetch(impl?: (url: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn((input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (impl) return impl(url, init);
    if (url === "/api/courses") return okJson(LIST);
    if (url === "/api/auth/me") return okJson({ email: null, isSignedIn: false });
    if (url === "/api/user/filters") return okJson([]);
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
  it("renders the glossary accordion header on initial load", async () => {
    await renderLoaded();
    expect(screen.getByText("Course categories & credits guide")).toBeInTheDocument();
  });

  it("glossary content is collapsed by default", async () => {
    await renderLoaded();
    expect(screen.queryByText("Locally Developed")).not.toBeInTheDocument();
  });

  it("expands and collapses the glossary on toggle", async () => {
    await renderLoaded();
    const toggle = screen.getByRole("button", { name: /course categories/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Locally Developed")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText("Locally Developed")).not.toBeInTheDocument();
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
    const detailCalls = fetchFn.mock.calls.filter((c) => !(["/api/courses", "/api/auth/me"] as string[]).includes(String(c[0])));
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

const SAVED_SETS = [
  {
    id: "set-1",
    name: "My Grade 11 Set",
    isDefault: true,
    filters: { query: "", grades: ["11"], categories: [], languages: [], subjects: [], credits: [] },
    createdAt: "t1",
    updatedAt: "t1",
  },
];

async function renderLoggedIn(sets: SavedFilterSet[] = []) {
  cleanup();
  const fetchFn = installFetch((url: string, init?: RequestInit) => {
    if (url === "/api/courses") return okJson(LIST);
    if (url === "/api/auth/me") return okJson({ email: "user@example.com", isSignedIn: true });
    if (url === "/api/user/filters" && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return okJson({ id: "new-set", name: body.name, isDefault: !!body.isDefault, filters: body.filters, createdAt: "t1", updatedAt: "t1" });
    }
    if (url.startsWith("/api/user/filters/") && init?.method === "PATCH") {
      const id = url.split("/").pop();
      const existing = sets.find((s) => s.id === id);
      const body = JSON.parse(String(init.body));
      return okJson({ ...existing, ...body });
    }
    if (url === "/api/user/filters") return okJson(sets);
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
  });
  render(<Home />);
  await screen.findByText("Mathematics 10");
  return fetchFn;
}

describe("Home page — save filters (logged in)", () => {
  it("shows a login prompt instead of Save filters when logged out", async () => {
    await renderLoaded();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    expect(screen.getByRole("link", { name: /save filters/i })).toHaveAttribute("href", "/login");
  });

  it("shows an active Save filters button when logged in", async () => {
    await renderLoggedIn();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    expect(screen.getByRole("button", { name: /save filters/i })).toBeInTheDocument();
  });

  it("opens the popover, enters a name, and saves a new filter set", async () => {
    const fetchFn = await renderLoggedIn();
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: "My Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Saved");
    const postCall = fetchFn.mock.calls.find(
      (c) => c[0] === "/api/user/filters" && c[1]?.method === "POST"
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.name).toBe("My Set");
    expect(body.filters.query).toBe("math");
    expect(body.isDefault).toBe(false);
  });

  it("shows an inline error when saving fails", async () => {
    installFetch((url, init) => {
      if (url === "/api/courses") return okJson(LIST);
      if (url === "/api/auth/me") return okJson({ email: "user@example.com", isSignedIn: true });
      if (url === "/api/user/filters" && init?.method === "POST") {
        return Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: "name is required" }) } as Response);
      }
      if (url === "/api/user/filters") return okJson([]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });
    render(<Home />);
    await screen.findByText("Mathematics 10");
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: "My Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("name is required")).toBeInTheDocument();
  });
});

describe("Home page — loading saved filter sets", () => {
  it("auto-loads the default filter set on mount when logged in", async () => {
    await renderLoggedIn(SAVED_SETS);
    // "Science 11" alone isn't proof — it's also in the unfiltered list — so wait
    // for the conjunction with "Mathematics 10" gone, not a snapshot after a
    // single findByText (see TD-022 follow-up).
    await waitFor(() => {
      expect(screen.getByText("Science 11")).toBeInTheDocument();
      expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    });
  });

  it("does not fetch saved filter sets when logged out", async () => {
    const fetchFn = await renderLoaded();
    const filterSetCalls = fetchFn.mock.calls.filter((c) => c[0] === "/api/user/filters");
    expect(filterSetCalls).toHaveLength(0);
  });
});

describe("Home page — active filter set indicator", () => {
  it("shows Viewing: <name> when the current filters match a saved set", async () => {
    await renderLoggedIn(SAVED_SETS);
    await screen.findByText("Science 11");
    expect(screen.getByText("Viewing: My Grade 11 Set")).toBeInTheDocument();
  });

  it("hides the indicator once the filters no longer match the saved set", async () => {
    await renderLoggedIn(SAVED_SETS);
    await screen.findByText("Science 11");
    expect(screen.getByText("Viewing: My Grade 11 Set")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    expect(screen.queryByText(/^Viewing:/)).not.toBeInTheDocument();
  });

  it("shows no indicator when the current filters don't match any saved set", async () => {
    await renderLoggedIn(SAVED_SETS);
    await screen.findByText("Science 11");
    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    expect(screen.queryByText(/^Viewing:/)).not.toBeInTheDocument();
  });

  it("tags the indicator as Default when the active set is the default", async () => {
    await renderLoggedIn(SAVED_SETS);
    await waitFor(() => {
      expect(screen.getByText("Science 11")).toBeInTheDocument();
      expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Viewing: My Grade 11 Set")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("does not tag the indicator as Default for a non-default set", async () => {
    const NON_DEFAULT_SET = {
      id: "set-2",
      name: "My Other Set",
      isDefault: false,
      filters: { query: "", grades: ["11"], categories: [], languages: [], subjects: [], credits: [] },
      createdAt: "t1",
      updatedAt: "t1",
    };
    await renderLoggedIn([NON_DEFAULT_SET]);
    fireEvent.click(screen.getByRole("button", { name: "Grade 11" }));
    expect(await screen.findByText("Viewing: My Other Set")).toBeInTheDocument();
    expect(screen.queryByText("Default")).not.toBeInTheDocument();
  });
});

describe("Home page — duplicate filter set on save", () => {
  const MATH_SET: SavedFilterSet = {
    id: "m1",
    name: "My Math Set",
    isDefault: false,
    filters: { query: "math", grades: [], categories: [], languages: [], subjects: [], credits: [] },
    createdAt: "t1",
    updatedAt: "t1",
  };

  async function openSaveWithMatchingFilters(newName: string) {
    await renderLoggedIn([MATH_SET]);
    await screen.findByText("Mathematics 10");
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: newName } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  }

  it("prompts to rename the existing set instead of silently duplicating", async () => {
    await openSaveWithMatchingFilters("Another Name");
    const prompt = await screen.findByText(/This matches your saved filter/);
    expect(prompt.textContent).toContain("My Math Set");
    expect(prompt.textContent).toContain("Another Name");
  });

  it("renames the existing set when the user confirms", async () => {
    const fetchFn = installFetch((url: string, init?: RequestInit) => {
      if (url === "/api/courses") return okJson(LIST);
      if (url === "/api/auth/me") return okJson({ email: "user@example.com", isSignedIn: true });
      if (url === "/api/user/filters/m1" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        return okJson({ ...MATH_SET, ...body });
      }
      if (url === "/api/user/filters") return okJson([MATH_SET]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });
    render(<Home />);
    await screen.findByText("Mathematics 10");
    fireEvent.change(screen.getByPlaceholderText("Search by course title, code, or subject..."), {
      target: { value: "math" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: "Another Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText(/This matches your saved filter/);

    fireEvent.click(screen.getByRole("button", { name: "Rename existing" }));
    await screen.findByText("Saved");

    const patchCall = fetchFn.mock.calls.find(
      (c) => c[0] === "/api/user/filters/m1" && c[1]?.method === "PATCH"
    );
    expect(patchCall).toBeTruthy();
    const body = JSON.parse(patchCall![1]!.body as string);
    expect(body).toEqual({ name: "Another Name", isDefault: false });
    expect(screen.getByText("Viewing: Another Name")).toBeInTheDocument();
  });

  it("saves as a new set when the user declines the rename", async () => {
    await openSaveWithMatchingFilters("Another Name");
    await screen.findByText(/This matches your saved filter/);

    const fetchFn = global.fetch as unknown as ReturnType<typeof installFetch>;
    fireEvent.click(screen.getByRole("button", { name: "Save as new" }));
    await screen.findByText("Saved");

    const postCall = fetchFn.mock.calls.find(
      (c) => c[0] === "/api/user/filters" && c[1]?.method === "POST"
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.name).toBe("Another Name");
  });

  it("returns to the name field when the duplicate prompt is cancelled", async () => {
    await openSaveWithMatchingFilters("Another Name");
    await screen.findByText(/This matches your saved filter/);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByDisplayValue("Another Name")).toBeInTheDocument();
  });

  it("defaults to retaining default status when renaming the current default set", async () => {
    const fetchFn = installFetch((url: string, init?: RequestInit) => {
      if (url === "/api/courses") return okJson(LIST);
      if (url === "/api/auth/me") return okJson({ email: "user@example.com", isSignedIn: true });
      if (url === "/api/user/filters/set-1" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        return okJson({ ...SAVED_SETS[0], ...body });
      }
      if (url === "/api/user/filters") return okJson(SAVED_SETS);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });
    render(<Home />);
    // Auto-loads the default set (grades: ["11"]) on mount. "Science 11" alone isn't
    // proof — it's also in the unfiltered list — so also wait out "Mathematics 10".
    await waitFor(() => {
      expect(screen.getByText("Science 11")).toBeInTheDocument();
      expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: "Renamed Grade 11 Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText(/This matches your saved filter/);
    const keepDefaultCheckbox = screen.getByRole("checkbox", { name: /keep this as my default filter set/i });
    expect(keepDefaultCheckbox).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Rename existing" }));
    await screen.findByText("Saved");

    const patchCall = fetchFn.mock.calls.find(
      (c) => c[0] === "/api/user/filters/set-1" && c[1]?.method === "PATCH"
    );
    expect(patchCall).toBeTruthy();
    const body = JSON.parse(patchCall![1]!.body as string);
    expect(body).toEqual({ name: "Renamed Grade 11 Set", isDefault: true });
  });

  it("lets the user opt out of retaining default status when renaming", async () => {
    const fetchFn = installFetch((url: string, init?: RequestInit) => {
      if (url === "/api/courses") return okJson(LIST);
      if (url === "/api/auth/me") return okJson({ email: "user@example.com", isSignedIn: true });
      if (url === "/api/user/filters/set-1" && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        return okJson({ ...SAVED_SETS[0], ...body });
      }
      if (url === "/api/user/filters") return okJson(SAVED_SETS);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText("Science 11")).toBeInTheDocument();
      expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save filters/i }));
    fireEvent.change(screen.getByPlaceholderText(/grade 11 science french/i), { target: { value: "Renamed Grade 11 Set" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText(/This matches your saved filter/);

    fireEvent.click(screen.getByRole("checkbox", { name: /keep this as my default filter set/i }));
    fireEvent.click(screen.getByRole("button", { name: "Rename existing" }));
    await screen.findByText("Saved");

    const patchCall = fetchFn.mock.calls.find(
      (c) => c[0] === "/api/user/filters/set-1" && c[1]?.method === "PATCH"
    );
    const body = JSON.parse(patchCall![1]!.body as string);
    expect(body).toEqual({ name: "Renamed Grade 11 Set", isDefault: false });
  });
});
