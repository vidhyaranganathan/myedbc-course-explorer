import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase-server", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }));

import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser } from "@/lib/auth";
import { PATCH, DELETE } from "./route";

type Result = { data?: unknown; error: { message: string } | null };
type UpdateCall = { patch: object };

interface Builder {
  select: () => Builder;
  eq: () => Builder;
  update: (patch: object) => Builder;
  delete: () => Builder;
  maybeSingle: () => Promise<Result>;
  single: () => Promise<Result>;
}

function mockSupabase(opts: {
  existing: Result;
  finalResult?: Result;
  updateCalls?: UpdateCall[];
}): SupabaseClient {
  let updateCallCount = 0;
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    update: (patch) => {
      opts.updateCalls?.push({ patch });
      updateCallCount++;
      return builder;
    },
    delete: () => builder,
    maybeSingle: () => {
      // First maybeSingle call is the ownership check; subsequent calls (e.g. the
      // "clear old default" update) don't call maybeSingle, so this always serves
      // either the ownership check or a DELETE's final maybeSingle.
      return Promise.resolve(updateCallCount > 0 && opts.finalResult ? opts.finalResult : opts.existing);
    },
    single: () => Promise.resolve(opts.finalResult ?? opts.existing),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

function setClient(opts: { existing: Result; finalResult?: Result; updateCalls?: UpdateCall[] }) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(opts));
}

function patchReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/filters/abc", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ctx(id = "abc") {
  return { params: Promise.resolve({ id }) };
}

const validFilters = { query: "", grades: ["11"], categories: [], languages: [], subjects: [], credits: [] };

afterEach(() => vi.clearAllMocks());

describe("PATCH /api/user/filters/[id]", () => {
  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await PATCH(patchReq({ name: "X" }), ctx());
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq("not json"), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq({ name: "  " }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when filters is malformed", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await PATCH(patchReq({ filters: { query: "" } }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the set doesn't exist or belongs to another user", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ existing: { data: null, error: null } });
    const res = await PATCH(patchReq({ name: "X" }), ctx());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("updates name and returns the updated set", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({
      existing: { data: { id: "abc" }, error: null },
      finalResult: { data: { id: "abc", name: "New name", is_default: false, filters: validFilters, created_at: "t1", updated_at: "t2" }, error: null },
    });
    const res = await PATCH(patchReq({ name: "New name" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "abc", name: "New name", isDefault: false, filters: validFilters, createdAt: "t1", updatedAt: "t2" });
  });

  it("clears the old default before setting isDefault true", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const updateCalls: UpdateCall[] = [];
    setClient({
      existing: { data: { id: "abc" }, error: null },
      finalResult: { data: { id: "abc", name: "X", is_default: true, filters: validFilters, created_at: "t1", updated_at: "t2" }, error: null },
      updateCalls,
    });
    const res = await PATCH(patchReq({ isDefault: true }), ctx());
    expect(res.status).toBe(200);
    expect(updateCalls[0].patch).toEqual({ is_default: false });
  });

  it("returns a generic 500 on a DB error during update", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({
      existing: { data: { id: "abc" }, error: null },
      finalResult: { data: null, error: { message: "boom" } },
    });
    const res = await PATCH(patchReq({ name: "X" }), ctx());
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/user/filters/[id]", () => {
  function delReq() {
    return new NextRequest("http://localhost/api/user/filters/abc", { method: "DELETE" });
  }

  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const res = await DELETE(delReq(), ctx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when nothing was deleted (missing or foreign-owned)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ existing: { data: null, error: null } });
    const res = await DELETE(delReq(), ctx());
    expect(res.status).toBe(404);
  });

  it("returns success when a row was deleted", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ existing: { data: { id: "abc" }, error: null } });
    const res = await DELETE(delReq(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns a generic 500 on a DB error", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    setClient({ existing: { data: null, error: { message: "boom" } } });
    const res = await DELETE(delReq(), ctx());
    expect(res.status).toBe(500);
  });
});
