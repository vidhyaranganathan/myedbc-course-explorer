import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as React from "react";
import SignupPage from "./page";

vi.mock("@/app/auth/actions", () => ({ signUp: vi.fn() }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof React>("react");
  return { ...actual, useActionState: vi.fn() };
});

afterEach(() => cleanup());

describe("SignupPage", () => {
  beforeEach(() => {
    vi.mocked(React.useActionState).mockReturnValue([null, vi.fn(), false]);
  });

  it("renders email and password fields with submit button", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("links to login page", () => {
    render(<SignupPage />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("shows check email message after signup with email confirmation", () => {
    vi.mocked(React.useActionState).mockReturnValue(["CHECK_EMAIL", vi.fn(), false]);
    render(<SignupPage />);
    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/confirmation link/i)).toBeInTheDocument();
  });

  it("shows error message when signup fails", () => {
    vi.mocked(React.useActionState).mockReturnValue(["Email already registered", vi.fn(), false]);
    render(<SignupPage />);
    expect(screen.getByText("Email already registered")).toBeInTheDocument();
  });

  it("shows loading state while submitting", () => {
    vi.mocked(React.useActionState).mockReturnValue([null, vi.fn(), true]);
    render(<SignupPage />);
    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled();
  });
});
