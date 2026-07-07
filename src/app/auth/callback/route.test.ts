import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExchangeCodeForSession = vi.fn();
const mockSetCookie = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
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

const { GET } = await import("./route");
const { NextResponse } = await import("next/server");

function makeRequest(path: string) {
  return {
    url: `http://localhost${path}`,
    cookies: { getAll: () => [] },
  };
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("redirects to home when no code param", async () => {
    await GET(makeRequest("/auth/callback") as never);
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost/");
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("exchanges code for session and redirects home", async () => {
    mockExchangeCodeForSession.mockResolvedValue({});
    await GET(makeRequest("/auth/callback?code=abc123") as never);
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost/");
  });

  it("redirects home even when env vars are missing", async () => {
    const savedUrl = process.env.SUPABASE_URL;
    const savedKey = process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    await GET(makeRequest("/auth/callback?code=abc123") as never);
    expect(NextResponse.redirect).toHaveBeenCalledWith("http://localhost/");
    process.env.SUPABASE_URL = savedUrl;
    process.env.SUPABASE_ANON_KEY = savedKey;
  });
});
