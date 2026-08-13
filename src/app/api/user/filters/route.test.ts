import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase-server", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn() }));

import { createServerClient } from "@/lib/supabase-server";
import { getSessionUserId } from "@/lib/auth";
import { GET, POST } from "./route";

type Result = { data?: unknown; error: { message: string } | null };
type UpdateCall = { patch: object };

interface Builder {
  select: () => Builder;
  eq: (col: string, val: unknown) => Builder;
  order: () => Builder;
  update: (patch: object) => Builder;
  insert: (row: object) => Builder;
  single: () => Promise<Result>;
  then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => Promise<unknown>;
}

function mockSupabase(
  listResult: Result,
  insertResult?: Result,
  updateCalls?: UpdateCall[]
): SupabaseClient {
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    update: (patch) => {
      updateCalls?.push({ patch });
      return builder;
    },
    insert: () => builder,
    single: () => Promise.resolve(insertResult ?? listResult),
    then: (res, rej) => Promise.resolve(listResult).then(res, rej),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

function setClient(listResult: Result, insertResult?: Result, updateCalls?: UpdateCall[]) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(listResult, insertResult, updateCalls));
}

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/user/filters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validFilters = { query: "", grades: ["11"], categories: [], languages: [], subjects: [], credits: [] };

afterEach(() => vi.clearAllMocks());

describe("GET /api/user/filters", () => {
  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the list mapped to camelCase", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    setClient({
      data: [
        { id: "1", name: "Set A", is_default: true, filters: validFilters, created_at: "t1", updated_at: "t1" },
      ],
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: "1", name: "Set A", isDefault: true, filters: validFilters, createdAt: "t1", updatedAt: "t1" },
    ]);
  });

  it("returns an empty array when there are no saved sets", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    setClient({ data: [], error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns a generic 500 when the DB errors", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    setClient({ data: null, error: { message: "boom" } });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/user/filters", () => {
  it("returns 401 when logged out", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    const res = await POST(postReq({ name: "X", filters: validFilters }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const res = await POST(postReq("not json"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const res = await POST(postReq({ filters: validFilters }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is empty after trim", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const res = await POST(postReq({ name: "   ", filters: validFilters }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when filters is malformed", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const res = await POST(postReq({ name: "X", filters: { query: "" } }));
    expect(res.status).toBe(400);
  });

  it("creates a non-default set without clearing any existing default", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const updateCalls: UpdateCall[] = [];
    setClient(
      { data: null, error: null },
      { data: { id: "1", name: "X", is_default: false, filters: validFilters, created_at: "t1", updated_at: "t1" }, error: null },
      updateCalls
    );
    const res = await POST(postReq({ name: "X", filters: validFilters }));
    expect(res.status).toBe(201);
    expect(updateCalls).toHaveLength(0);
    expect(await res.json()).toEqual({ id: "1", name: "X", isDefault: false, filters: validFilters, createdAt: "t1", updatedAt: "t1" });
  });

  it("clears the old default before inserting when isDefault is true", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    const updateCalls: UpdateCall[] = [];
    setClient(
      { data: null, error: null },
      { data: { id: "2", name: "Y", is_default: true, filters: validFilters, created_at: "t1", updated_at: "t1" }, error: null },
      updateCalls
    );
    const res = await POST(postReq({ name: "Y", filters: validFilters, isDefault: true }));
    expect(res.status).toBe(201);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].patch).toEqual({ is_default: false });
  });

  it("returns 409 on a unique-violation race for the default index", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    setClient(
      { data: null, error: null },
      { data: null, error: { message: 'duplicate key value violates unique constraint "one_default_per_user"' } }
    );
    const res = await POST(postReq({ name: "Y", filters: validFilters, isDefault: true }));
    expect(res.status).toBe(409);
  });

  it("returns a generic 500 on other insert errors", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue("u1");
    setClient({ data: null, error: null }, { data: null, error: { message: "boom" } });
    const res = await POST(postReq({ name: "Y", filters: validFilters }));
    expect(res.status).toBe(500);
  });
});
