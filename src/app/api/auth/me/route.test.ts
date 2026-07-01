import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextResponse: { json: vi.fn((data: unknown) => data) },
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase-auth", () => ({
  createAuthClient: () => Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

const { GET } = await import("./route");
const { NextResponse } = await import("next/server");

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns user email when authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "test@example.com" } } });
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: "test@example.com" });
  });

  it("returns null when no user session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: null });
  });

  it("returns null on auth error", async () => {
    mockGetUser.mockRejectedValue(new Error("Auth error"));
    await GET();
    expect(NextResponse.json).toHaveBeenCalledWith({ email: null });
  });
});
