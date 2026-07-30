import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase-server", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));

import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/auth";
import { GET, PATCH } from "./route";

type Result = { data?: unknown; error: { message: string } | null };

interface Builder {
  select: () => Builder;
  eq: () => Builder;
  update: (patch: object) => Builder;
  upsert: (row: object, options: { onConflict: string }) => Builder;
  maybeSingle: () => Promise<Result>;
  single: () => Promise<Result>;
}

function mockSupabase(result: Result, upsertResult?: Result): SupabaseClient {
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    update: () => builder,
    upsert: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(upsertResult ?? result),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

function setClient(result: Result, upsertResult?: Result) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(result, upsertResult));
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/user/profile", () => {
  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the profile mapped to camelCase", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: { role: "student", grade_interest: [10, 11], school: "Burnaby North", district: "SD41" }, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      role: "student", gradeInterest: [10, 11], school: "Burnaby North", district: "SD41",
    });
  });

  it("returns an all-null profile when the row is missing", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: null, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: null, gradeInterest: null, school: null, district: null });
  });

  it("returns a generic 500 when the DB errors", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: null, error: { message: "boom" } });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal server error" });
  });
});

describe("PATCH /api/user/profile", () => {
  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await PATCH(patchReq({ school: "X" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq("not json"));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid role", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq({ role: "admin" }));
    expect(res.status).toBe(400);
  });

  it("rejects a gradeInterest value outside 10-12", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq({ gradeInterest: [9] }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid patch and returns the updated profile", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: { role: "teacher", grade_interest: [11, 12], school: "X", district: "Y" }, error: null });
    const res = await PATCH(patchReq({ role: "teacher", gradeInterest: [11, 12], school: "X", district: "Y" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "teacher", gradeInterest: [11, 12], school: "X", district: "Y" });
  });

  it("allows clearing a field with null", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: { role: null, grade_interest: null, school: null, district: null }, error: null });
    const res = await PATCH(patchReq({ role: null }));
    expect(res.status).toBe(200);
  });

  it("falls back to upsert when no row was updated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient(
      { data: null, error: null },
      { data: { role: "student", grade_interest: null, school: null, district: null }, error: null }
    );
    const res = await PATCH(patchReq({ role: "student" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "student", gradeInterest: null, school: null, district: null });
  });

  it("returns a generic 500 when the DB errors", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ data: null, error: { message: "boom" } });
    const res = await PATCH(patchReq({ school: "X" }));
    expect(res.status).toBe(500);
  });
});
