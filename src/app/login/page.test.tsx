import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import LoginPage from "./page";

afterEach(() => cleanup());

vi.mock("@/app/auth/actions", () => ({ signIn: vi.fn() }));

describe("LoginPage", () => {
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
});
