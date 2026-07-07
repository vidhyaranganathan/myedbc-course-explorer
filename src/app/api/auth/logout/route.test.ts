import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignOut = vi.fn();
const mockSetCookie = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn((url: string) => ({
      url,
      cookies: { set: mockSetCookie },
    })),
  },
}));

const { POST } = await import("./route");
const { NextResponse } = await import("next/server");

function makeRequest() {
  return {
    url: "http://localhost/api/auth/logout",
    cookies: { getAll: () => [] },
  };
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("calls signOut and redirects to home", async () => {
    mockSignOut.mockResolvedValue({});
    await POST(makeRequest() as never);
    expect(mockSignOut).toHaveBeenCalled();
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost/");
  });

  it("redirects home when env vars are missing", async () => {
    const savedUrl = process.env.SUPABASE_URL;
    const savedKey = process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    await POST(makeRequest() as never);
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost/");
    process.env.SUPABASE_URL = savedUrl;
    process.env.SUPABASE_ANON_KEY = savedKey;
  });
});
