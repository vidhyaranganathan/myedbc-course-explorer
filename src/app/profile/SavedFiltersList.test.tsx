import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import SavedFiltersList from "./SavedFiltersList";
import type { SavedFilterSet } from "@/lib/user-types";

const FILTERS = { query: "", grades: [], categories: [], languages: [], subjects: [], credits: [] };

function set(overrides: Partial<SavedFilterSet> = {}): SavedFilterSet {
  return {
    id: "s1",
    name: "My Set",
    isDefault: false,
    filters: FILTERS,
    createdAt: "t1",
    updatedAt: "t1",
    ...overrides,
  };
}

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SavedFiltersList", () => {
  it("shows the empty state when there are no sets", () => {
    render(<SavedFiltersList initialSets={[]} />);
    expect(screen.getByText("No saved filters yet")).toBeInTheDocument();
  });

  it("renders each set with a Load link and a Default badge", () => {
    render(<SavedFiltersList initialSets={[set({ isDefault: true })]} />);
    expect(screen.getByText("My Set")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Load" })).toHaveAttribute("href", "/?loadFilterSet=s1");
  });

  it("renames a set", async () => {
    const fetchMock = vi.fn(() => okJson(set({ name: "New Name" })));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByDisplayValue("My Set");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("New Name");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/user/filters/s1",
      expect.objectContaining({ method: "PATCH" })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ name: "New Name" });
  });

  it("cancels a rename without saving", () => {
    render(<SavedFiltersList initialSets={[set()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("My Set")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("My Set")).not.toBeInTheDocument();
  });

  it("sets a set as default", async () => {
    const fetchMock = vi.fn(() => okJson(set({ isDefault: true })));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Set default" }));

    await screen.findByText("Default");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ isDefault: true });
  });

  it("unsets a default set", async () => {
    const fetchMock = vi.fn(() => okJson(set({ isDefault: false })));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set({ isDefault: true })]} />);
    fireEvent.click(screen.getByRole("button", { name: "Unset default" }));

    await screen.findByRole("button", { name: "Set default" });
    expect(screen.queryByText("Default")).not.toBeInTheDocument();
  });

  it("deletes a set after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.fn(() => okJson({ success: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await screen.findByText("No saved filters yet");
    expect(fetchMock).toHaveBeenCalledWith("/api/user/filters/s1", expect.objectContaining({ method: "DELETE" }));
  });

  it("does not delete when the confirmation is declined", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const fetchMock = vi.fn(() => okJson({ success: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("My Set")).toBeInTheDocument();
  });

  it("shows a per-row error without affecting other rows", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/user/filters/s1") {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: "not found" }) } as Response);
      }
      return okJson(set({ id: "s2", name: "Set Two", isDefault: true }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<SavedFiltersList initialSets={[set({ id: "s1", name: "Set One" }), set({ id: "s2", name: "Set Two" })]} />);
    const rowOne = screen.getByText("Set One").closest("div.border")!;
    const rowTwo = screen.getByText("Set Two").closest("div.border")!;

    fireEvent.click(within(rowOne).getByRole("button", { name: "Set default" }));
    await screen.findByText("not found");

    fireEvent.click(within(rowTwo).getByRole("button", { name: "Set default" }));
    await within(rowTwo).findByText("Default");
    expect(within(rowOne).getByText("not found")).toBeInTheDocument();
  });
});
