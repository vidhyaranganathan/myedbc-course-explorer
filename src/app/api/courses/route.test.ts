import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase-server", () => ({ createServerClient: vi.fn() }));

import { createServerClient } from "@/lib/supabase-server";
import { GET, POST } from "./route";

type Result = { data?: unknown; error: { message: string } | null };

interface Builder {
  select: () => Builder;
  eq: () => Builder;
  order: () => Builder;
  range: () => Builder;
  maybeSingle: () => Promise<Result>;
  upsert: () => Promise<Result>;
  then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => Promise<unknown>;
}

// A table's value may be a single Result, or an array of Results consumed one
// per terminal call (to simulate paginated reads across multiple .range() loops).
function mockSupabase(byTable: Record<string, Result | Result[]>): SupabaseClient {
  const counters: Record<string, number> = {};
  const make = (table: string): Builder => {
    const spec = byTable[table] ?? { data: [], error: null };
    const next = (): Result => {
      if (!Array.isArray(spec)) return spec;
      const i = counters[table] ?? 0;
      counters[table] = i + 1;
      return spec[Math.min(i, spec.length - 1)];
    };
    const builder: Builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      range: () => builder,
      maybeSingle: () => Promise.resolve(next()),
      upsert: () => Promise.resolve(next()),
      then: (res, rej) => Promise.resolve(next()).then(res, rej),
    };
    return builder;
  };
  return {
    from: (table: string) => make(table),
  } as unknown as SupabaseClient;
}

function setClient(byTable: Record<string, Result | Result[]>) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(byTable));
}

function courseRow(code: string) {
  return {
    code, grade: "10", title: `Course ${code}`, credits: "4",
    category: "Ministry", language: "English", subject: "Sciences",
    sub_category: null, grad_requirement: null,
  };
}

const SECRET = "test-secret";

beforeEach(() => {
  process.env.API_WRITE_SECRET = SECRET;
});

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.API_WRITE_SECRET;
});

describe("GET /api/courses", () => {
  it("returns all courses mapped to camelCase", async () => {
    setClient({
      courses: {
        data: [
          {
            code: "MA10", grade: "10", title: "Mathematics 10", credits: "4",
            category: "Ministry", language: "English", subject: "Mathematics",
            sub_category: "Numeracy", grad_requirement: "Required",
          },
        ],
        error: null,
      },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        code: "MA10", grade: "10", title: "Mathematics 10", credits: "4",
        category: "Ministry", language: "English", subject: "Mathematics",
        subCategory: "Numeracy", gradRequirement: "Required",
      },
    ]);
  });

  it("returns 500 when the DB errors", async () => {
    setClient({ courses: { data: null, error: { message: "boom" } } });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "boom" });
  });

  it("pages past the 1000-row PostgREST cap", async () => {
    // First page is a full 1000 rows → loop continues; second page is short → stop.
    const fullPage = Array.from({ length: 1000 }, (_, i) => courseRow(`C${i}`));
    const shortPage = [courseRow("LAST1"), courseRow("LAST2")];
    setClient({
      courses: [
        { data: fullPage, error: null },
        { data: shortPage, error: null },
      ],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1002);
    expect(body[1001].code).toBe("LAST2");
  });
});

function postReq(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/courses", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("POST /api/courses", () => {
  it("returns 401 with no secret header", async () => {
    const res = await POST(postReq(JSON.stringify({ courses: [] })));
    expect(res.status).toBe(401);
  });

  it("returns 401 with a wrong secret", async () => {
    const res = await POST(postReq(JSON.stringify({ courses: [] }), { "x-api-key": "nope" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await POST(postReq("not json", { "x-api-key": SECRET }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when neither array is present", async () => {
    const res = await POST(postReq(JSON.stringify({ foo: 1 }), { "x-api-key": SECRET }));
    expect(res.status).toBe(400);
  });

  it("upserts courses and details and returns counts", async () => {
    setClient({
      courses: { error: null },
      course_details: { error: null },
    });
    const res = await POST(
      postReq(
        JSON.stringify({
          courses: [{ code: "MA10", grade: "10" }],
          courseDetails: [{ code: "MA10" }, { code: "EN10" }],
        }),
        { "x-api-key": SECRET }
      )
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ upserted: { courses: 1, courseDetails: 2 } });
  });

  it("returns 500 when an upsert errors", async () => {
    setClient({ courses: { error: { message: "constraint violation" } } });
    const res = await POST(
      postReq(JSON.stringify({ courses: [{ code: "X" }] }), { "x-api-key": SECRET })
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "constraint violation" });
  });
});
