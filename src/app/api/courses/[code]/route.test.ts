import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/supabase-server", () => ({ createServerClient: vi.fn() }));

import { createServerClient } from "@/lib/supabase-server";
import { GET } from "./route";

type Result = { data?: unknown; error: { message: string } | null };

interface Builder {
  select: () => Builder;
  eq: () => Builder;
  order: () => Builder;
  limit: () => Builder;
  then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => Promise<unknown>;
}

function mockSupabase(result: Result): SupabaseClient {
  const b: Builder = {
    select: () => b,
    eq: () => b,
    order: () => b,
    limit: () => b,
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return { from: () => b } as unknown as SupabaseClient;
}

function setClient(result: Result) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(result));
}

function ctx(code: string) {
  return { params: Promise.resolve({ code }) };
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/courses/[code]", () => {
  it("returns the single course mapped to camelCase", async () => {
    setClient({
      data: [{
        code: "MA10", grade: "10", title: "Mathematics 10", credits: "4",
        category: "Ministry", language: "English", subject: "Mathematics",
        sub_category: null, grad_requirement: "Required", published_description: null,
      }],
      error: null,
    });
    const res = await GET(new Request("http://localhost/api/courses/MA10"), ctx("MA10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      code: "MA10", grade: "10", title: "Mathematics 10", credits: "4",
      category: "Ministry", language: "English", subject: "Mathematics",
      subCategory: null, gradRequirement: "Required", publishedDescription: null,
    });
  });

  it("returns 404 when the course is not found", async () => {
    setClient({ data: [], error: null });
    const res = await GET(new Request("http://localhost/api/courses/NOPE"), ctx("NOPE"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("returns a generic 500 (no DB internals) when the query errors", async () => {
    setClient({ data: null, error: { message: "connection terminated unexpectedly" } });
    const res = await GET(new Request("http://localhost/api/courses/X"), ctx("X"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal server error" });
  });
});
