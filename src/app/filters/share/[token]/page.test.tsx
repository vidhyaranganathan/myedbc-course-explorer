import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SharedFilterPage from "./page";

afterEach(() => cleanup());

describe("SharedFilterPage", () => {
  it("renders the shared filter shell", () => {
    render(<SharedFilterPage params={{ token: "abc123" }} />);
    expect(screen.getByText("Shared filter set")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load these filters" })).toBeDisabled();
  });

  it("links back to BC Course Finder home", () => {
    render(<SharedFilterPage params={{ token: "abc123" }} />);
    expect(screen.getByRole("link", { name: "BC Course Finder" })).toHaveAttribute("href", "/");
  });
});
