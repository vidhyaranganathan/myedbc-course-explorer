import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";
import type { CourseListItem, CourseDetail } from "@/lib/types";
import Home from "./page";

const LIST: CourseListItem[] = [
  { code: "MA10", grade: "10", title: "Mathematics 10", credits: "4", category: "Ministry", language: "English", subject: "Mathematics", subCategory: null, gradRequirement: "Required" },
  { code: "EN10", grade: "10", title: "English Language Arts 10", credits: "4", category: "Ministry", language: "English", subject: "English Language Arts", subCategory: null, gradRequirement: "Required" },
  { code: "SC11", grade: "11", title: "Science 11", credits: "4", category: "Ministry", language: "English", subject: "Sciences", subCategory: "Life Sciences", gradRequirement: null },
  { code: "BA12", grade: "12", title: "Business Education 12", credits: "4", category: "Board Authority Authorized", language: "English", subject: "Business", subCategory: null, gradRequirement: null },
  { code: "FR10", grade: "10", title: "Français 10", credits: "4", category: "Ministry", language: "French", subject: "Languages", subCategory: null, gradRequirement: null },
];

const DETAILS: Record<string, CourseDetail> = {
  MA10: { genericCourseType: null, programGuideTitle: "Mathematics", publishedDescription: "An introduction to foundational mathematics concepts.", gradRequirements: [], gradElectives: [] },
  SC11: { genericCourseType: null, programGuideTitle: null, publishedDescription: "Exploring the sciences.", gradRequirements: [], gradElectives: ["Sciences", "Applied Skills"] },
};

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function installFetch(impl?: (url: string) => Promise<Response>) {
  const fn = vi.fn((input: string | URL) => {
    const url = String(input);
    if (impl) return impl(url);
    if (url === "/api/courses") return okJson(LIST);
    const m = url.match(/^\/api\/courses\/(.+)$/);
    if (m) {
      const code = decodeURIComponent(m[1]);
      const course = LIST.find((c) => c.code === code)!;
      return okJson({ course, details: DETAILS[code] ?? null });
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

async function renderLoaded() {
  cleanup();
  installFetch();
  render(<Home />);
  await screen.findByText("Mathematics 10");
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

  it("filters by grade dropdown", async () => {
    await renderLoaded();
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "11" } });
    expect(screen.getByText("Science 11")).toBeInTheDocument();
    expect(screen.queryByText("Mathematics 10")).not.toBeInTheDocument();
  });

  it("combines multiple filters", async () => {
    await renderLoaded();
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "10" } });
    fireEvent.change(selects[2], { target: { value: "French" } });
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

  it("renders all five filter dropdowns", async () => {
    await renderLoaded();
    expect(screen.getAllByRole("combobox")).toHaveLength(5);
  });
});

describe("Home page — expand & lazy detail", () => {
  it("lazy-loads and shows the published description on expand", async () => {
    const fetchFn = await renderLoadedReturningFetch();
    fireEvent.click(screen.getByText("Mathematics 10").closest("button")!);
    expect(await screen.findByText("An introduction to foundational mathematics concepts.")).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith("/api/courses/MA10");
  });

  it("collapses on a second click", async () => {
    await renderLoaded();
    const button = screen.getByText("Mathematics 10").closest("button")!;
    fireEvent.click(button);
    await screen.findByText("An introduction to foundational mathematics concepts.");
    fireEvent.click(button);
    expect(screen.queryByText("An introduction to foundational mathematics concepts.")).not.toBeInTheDocument();
  });

  it("does not refetch a detail that is already cached", async () => {
    const fetchFn = await renderLoadedReturningFetch();
    const button = screen.getByText("Mathematics 10").closest("button")!;
    fireEvent.click(button);
    await screen.findByText("An introduction to foundational mathematics concepts.");
    fireEvent.click(button); // collapse
    fireEvent.click(button); // expand again
    await screen.findByText("An introduction to foundational mathematics concepts.");
    const detailCalls = fetchFn.mock.calls.filter((c) => String(c[0]) === "/api/courses/MA10");
    expect(detailCalls).toHaveLength(1);
  });

  it("shows grad electives when available", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText("Science 11").closest("button")!);
    expect(await screen.findByText("Counts as Elective In")).toBeInTheDocument();
    expect(screen.getByText("Applied Skills")).toBeInTheDocument();
  });

  it("hides Detail fields with null values", async () => {
    await renderLoaded();
    fireEvent.click(screen.getByText("Business Education 12").closest("button")!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/courses/BA12"));
    const expandedArea = screen.getByText("Business Education 12").closest("button")!.parentElement!;
    expect(within(expandedArea).queryByText("Sub-category")).not.toBeInTheDocument();
  });
});

async function renderLoadedReturningFetch() {
  cleanup();
  const fetchFn = installFetch();
  render(<Home />);
  await screen.findByText("Mathematics 10");
  return fetchFn;
}
