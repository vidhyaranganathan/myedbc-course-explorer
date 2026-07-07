import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("server-only", () => ({}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase-auth", () => ({
  createAuthClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

const { default: ProfilePage } = await import("./page");

afterEach(() => cleanup());

describe("ProfilePage", () => {
  it("renders profile heading and back link", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "user@example.com" } } });
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to course search/i })).toHaveAttribute("href", "/");
  });

  it("shows user email from session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "user@example.com" } } });
    render(await ProfilePage());
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders profile fields as disabled inputs", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "user@example.com" } } });
    render(await ProfilePage());
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("shows empty saved filters state", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "user@example.com" } } });
    render(await ProfilePage());
    expect(screen.getByText("No saved filters yet")).toBeInTheDocument();
  });

  it("renders gracefully when session read fails", async () => {
    mockGetUser.mockRejectedValue(new Error("No session"));
    render(await ProfilePage());
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });
});
