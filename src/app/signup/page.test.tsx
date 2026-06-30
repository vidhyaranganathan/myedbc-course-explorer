import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SignupPage from "./page";

afterEach(() => cleanup());

vi.mock("@/app/auth/actions", () => ({ signUp: vi.fn() }));

describe("SignupPage", () => {
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
});
