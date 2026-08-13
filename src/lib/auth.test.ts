import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCurrentUser = vi.fn();
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => mockCurrentUser(),
  auth: () => mockAuth(),
}));

const { getSessionUser, getSessionUserId } = await import("./auth");

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns userId and email when a session exists", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "u1",
      primaryEmailAddressId: "em1",
      emailAddresses: [{ id: "em1", emailAddress: "test@example.com" }],
    });
    expect(await getSessionUser()).toEqual({ userId: "u1", email: "test@example.com" });
  });

  it("returns null when there is no user", async () => {
    mockCurrentUser.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the session read throws", async () => {
    mockCurrentUser.mockRejectedValue(new Error("no session"));
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null email when the user has no matching primary email address", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "u1",
      primaryEmailAddressId: null,
      emailAddresses: [],
    });
    expect(await getSessionUser()).toEqual({ userId: "u1", email: null });
  });
});

describe("getSessionUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the userId from the session token when a session exists", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    expect(await getSessionUserId()).toBe("u1");
  });

  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    expect(await getSessionUserId()).toBeNull();
  });

  it("returns null when the session read throws", async () => {
    mockAuth.mockRejectedValue(new Error("no session"));
    expect(await getSessionUserId()).toBeNull();
  });

  it("does not call currentUser (no Clerk Backend API round-trip)", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    await getSessionUserId();
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });
});
