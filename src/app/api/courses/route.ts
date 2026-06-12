import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase-server";
import { COURSE_COLUMNS, toCourseListItem } from "@/lib/courses-mapper";
import type { CourseUpsertBody } from "@/lib/types";

const BATCH_SIZE = 200; // upsert batch size for writes
const READ_PAGE_SIZE = 1000; // PostgREST caps a select at ~1000 rows; page through for reads

/** Generic 500 — log the real error server-side, never leak DB internals to the client. */
function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/courses] ${context}:`, err);
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

/** Constant-time secret comparison to avoid a timing side-channel on API_WRITE_SECRET. */
function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Upsert rows in batches; returns the affected-row count, or throws on DB error. */
async function upsertBatches(
  supabase: SupabaseClient,
  table: string,
  rows: object[],
  onConflict: string
): Promise<number> {
  let count = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, count: affected } = await supabase
      .from(table)
      .upsert(batch, { onConflict, count: "exact" });
    if (error) throw error;
    count += affected ?? batch.length;
  }
  return count;
}

/**
 * GET /api/courses — all courses (no details). Feeds the grid + in-memory filtering.
 *
 * PostgREST caps a single select at ~1000 rows, so we page through with .range().
 * Ordered by (code, grade) — the full primary key — so paging is stable even if a
 * code ever spans multiple grades.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const all: Parameters<typeof toCourseListItem>[0][] = [];
    for (let from = 0; ; from += READ_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("courses")
        .select(COURSE_COLUMNS)
        .order("code", { ascending: true })
        .order("grade", { ascending: true })
        .range(from, from + READ_PAGE_SIZE - 1);
      if (error) return serverError("GET list", error);
      const page = data ?? [];
      all.push(...page);
      if (page.length < READ_PAGE_SIZE) break;
    }
    // Course data changes only on re-sync, so let the CDN cache the full list briefly.
    // This caps repeated DB round-trips from the public endpoint (cost/DoS guard).
    return NextResponse.json(all.map(toCourseListItem), {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return serverError("GET list", err);
  }
}

/**
 * POST /api/courses — bulk upsert, secret-gated (ADR-007).
 * Body: { courses?: CourseUpsertRow[], courseDetails?: CourseDetailUpsertRow[] }
 * Header: X-Api-Key must equal API_WRITE_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!secretMatches(request.headers.get("x-api-key"), process.env.API_WRITE_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CourseUpsertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const courses = Array.isArray(body?.courses) ? body.courses : [];
  const courseDetails = Array.isArray(body?.courseDetails) ? body.courseDetails : [];
  if (courses.length === 0 && courseDetails.length === 0) {
    return NextResponse.json(
      { error: "body must include a non-empty `courses` and/or `courseDetails` array" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const upsertedCourses = await upsertBatches(supabase, "courses", courses, "code,grade");
    const upsertedDetails = await upsertBatches(supabase, "course_details", courseDetails, "code");
    return NextResponse.json({
      upserted: { courses: upsertedCourses, courseDetails: upsertedDetails },
    });
  } catch (err) {
    return serverError("POST upsert", err);
  }
}
