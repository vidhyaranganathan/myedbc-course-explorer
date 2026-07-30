import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("server-only", () => ({}));

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  createServerClient: () => ({ from: mockFrom }),
}));

const { default: ProfilePage } = await import("./page");

function builder(result: { data: unknown; error: null }) {
  const b = {
    select: () => b,
    eq: () => b,
    order: () => b,
    maybeSingle: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
  };
  return b;
}

afterEach(() => cleanup());

describe("ProfilePage", () => {
  it("renders profile heading and back link", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    mockFrom.mockReturnValue(builder({ data: null, error: null }));
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to course search/i })).toHaveAttribute("href", "/");
  });

  it("shows user email from session", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    mockFrom.mockReturnValue(builder({ data: null, error: null }));
    render(await ProfilePage());
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders editable profile fields", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    mockFrom.mockReturnValue(builder({ data: null, error: null }));
    render(await ProfilePage());
    expect(screen.getByLabelText("Role")).not.toBeDisabled();
    expect(screen.getByPlaceholderText("e.g. Burnaby North Secondary")).not.toBeDisabled();
  });

  it("shows empty saved filters state when no sets exist", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: "user@example.com" });
    mockFrom.mockReturnValue(builder({ data: null, error: null }));
    render(await ProfilePage());
    expect(screen.getByText("No saved filters yet")).toBeInTheDocument();
  });

  it("renders gracefully when there is no session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("No saved filters yet")).toBeInTheDocument();
  });
});
