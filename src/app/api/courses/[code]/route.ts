import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { COURSE_COLUMNS, toCourseListItem } from "@/lib/courses-mapper";

function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/courses/[code]] ${context}:`, err);
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

/**
 * GET /api/courses/[code] — one course from the `courses` table.
 *
 * This is the REST get-by-id, not a details lookup — `course_details` is not
 * surfaced (ADR-009). `code` is effectively unique, but the PK is (code, grade),
 * so we take the lowest-grade row via `.limit(1)` to stay robust.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_COLUMNS)
      .eq("code", code)
      .order("grade", { ascending: true })
      .limit(1);
    if (error) return serverError("course lookup", error);
    const row = data?.[0];
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(toCourseListItem(row));
  } catch (err) {
    return serverError("GET by code", err);
  }
}
