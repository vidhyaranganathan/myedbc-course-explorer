import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: { json: vi.fn((data: unknown) => data) },
}));

const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

const { GET } = await import("./route");
const { NextResponse } = await import("next/server");

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user email and isSignedIn true when authenticated", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: "test@example.com" });
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: "test@example.com", isSignedIn: true });
  });

  it("returns null email and isSignedIn false when no user session", async () => {
    mockGetSessionUser.mockResolvedValue(null);
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: null, isSignedIn: false });
  });

  it("returns isSignedIn true even when the session has no primary email", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", email: null });
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: null, isSignedIn: true });
  });
});
