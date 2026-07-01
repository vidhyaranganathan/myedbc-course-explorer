import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as React from "react";
import LoginPage from "./page";

vi.mock("@/app/auth/actions", () => ({ signIn: vi.fn() }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return { ...actual, useActionState: vi.fn() };
});

afterEach(() => cleanup());

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(React.useActionState).mockReturnValue([null, vi.fn(), false]);
  });

  it("renders email and password fields with login button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("links to signup page", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
  });

  it("shows error message when login fails", () => {
    vi.mocked(React.useActionState).mockReturnValue(["Invalid login credentials", vi.fn(), false]);
    render(<LoginPage />);
    expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
  });

  it("shows loading state while submitting", () => {
    vi.mocked(React.useActionState).mockReturnValue([null, vi.fn(), true]);
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled();
  });
});
