import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/lib/supabase-auth", () => ({
  createAuthClient: () =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
      },
    }),
}));

const { signIn, signUp } = await import("./actions");
const { redirect } = await import("next/navigation");

describe("signIn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error message on bad credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "wrong");
    expect(await signIn(null, fd)).toBe("Invalid login credentials");
  });

  it("calls redirect on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "correct");
    await signIn(null, fd);
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("signUp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error message on failure", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: { message: "Email taken" } });
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "pass123");
    expect(await signUp(null, fd)).toBe("Email taken");
  });

  it("returns CHECK_EMAIL when session is null", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "pass123");
    expect(await signUp(null, fd)).toBe("CHECK_EMAIL");
  });

  it("calls redirect when session exists", async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    const fd = new FormData();
    fd.set("email", "a@b.com");
    fd.set("password", "pass123");
    await signUp(null, fd);
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
