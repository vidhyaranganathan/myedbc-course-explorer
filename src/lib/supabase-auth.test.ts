import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve({ getAll: () => [], set: () => {} }) }));

const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}));

const { getSessionUser } = await import("./supabase-auth");

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("returns userId and email when a session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "test@example.com" } } });
    expect(await getSessionUser()).toEqual({ userId: "u1", email: "test@example.com" });
  });

  it("returns null when there is no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the session read throws", async () => {
    mockGetUser.mockRejectedValue(new Error("no session"));
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null email as null (not undefined) when user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: undefined } } });
    expect(await getSessionUser()).toEqual({ userId: "u1", email: null });
  });
});
