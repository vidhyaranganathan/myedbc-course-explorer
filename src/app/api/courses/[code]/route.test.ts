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
  maybeSingle: () => Promise<Result>;
  then: (res: (v: Result) => unknown, rej?: (e: unknown) => unknown) => Promise<unknown>;
}

function mockSupabase(byTable: Record<string, Result>): SupabaseClient {
  const make = (result: Result): Builder => {
    const builder: Builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(result),
      then: (res, rej) => Promise.resolve(result).then(res, rej),
    };
    return builder;
  };
  return {
    from: (table: string) => make(byTable[table] ?? { data: null, error: null }),
  } as unknown as SupabaseClient;
}

function setClient(byTable: Record<string, Result>) {
  vi.mocked(createServerClient).mockReturnValue(mockSupabase(byTable));
}

function ctx(code: string) {
  return { params: Promise.resolve({ code }) };
}

afterEach(() => vi.clearAllMocks());

describe("GET /api/courses/[code]", () => {
  it("returns the course merged with its details", async () => {
    setClient({
      courses: {
        data: [{
          code: "MA10", grade: "10", title: "Mathematics 10", credits: "4",
          category: "Ministry", language: "English", subject: "Mathematics",
          sub_category: null, grad_requirement: "Required",
        }],
        error: null,
      },
      course_details: {
        data: {
          generic_course_type: "Ministry-Developed",
          program_guide_title: "Mathematics",
          published_description: "Intro to math.",
          grad_requirements: [],
          grad_electives: ["Sciences"],
        },
        error: null,
      },
    });
    const res = await GET(new Request("http://localhost/api/courses/MA10"), ctx("MA10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.course.code).toBe("MA10");
    expect(body.course.subCategory).toBeNull();
    expect(body.details.genericCourseType).toBe("Ministry-Developed");
    expect(body.details.gradElectives).toEqual(["Sciences"]);
  });

  it("returns the course with null details when none exist", async () => {
    setClient({
      courses: {
        data: [{
          code: "BA12", grade: "12", title: "Business 12", credits: null,
          category: "Board Authority Authorized", language: "English",
          subject: null, sub_category: null, grad_requirement: null,
        }],
        error: null,
      },
      course_details: { data: null, error: null },
    });
    const res = await GET(new Request("http://localhost/api/courses/BA12"), ctx("BA12"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.course.code).toBe("BA12");
    expect(body.details).toBeNull();
  });

  it("returns 404 when the course is not found", async () => {
    setClient({ courses: { data: [], error: null } });
    const res = await GET(new Request("http://localhost/api/courses/NOPE"), ctx("NOPE"));
    expect(res.status).toBe(404);
  });

  it("returns a generic 500 (no DB internals) when the course query errors", async () => {
    setClient({ courses: { data: null, error: { message: "connection terminated unexpectedly" } } });
    const res = await GET(new Request("http://localhost/api/courses/X"), ctx("X"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal server error" });
  });
});
