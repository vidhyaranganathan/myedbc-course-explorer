import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: ReactNode }) => children,
}));

const { default: Header } = await import("./Header");

afterEach(() => cleanup());

describe("Header", () => {
  it("shows a Log in link when logged out", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("shows the email initial and Log out when logged in with an email", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "user_2abc", email: "test@example.com" });
    render(await Header());
    expect(screen.getByRole("link", { name: "Your profile" })).toHaveTextContent("T");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("falls back to the userId initial and still shows signed-in UI when there is no primary email", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "user_2abc", email: null });
    render(await Header());
    expect(screen.getByRole("link", { name: "Your profile" })).toHaveTextContent("U");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });
});
