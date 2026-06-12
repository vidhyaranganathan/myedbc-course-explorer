import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  COURSE_COLUMNS,
  COURSE_DETAIL_COLUMNS,
  toCourseListItem,
  toCourseDetail,
} from "@/lib/courses-mapper";

function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/courses/[code]] ${context}:`, err);
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

/**
 * GET /api/courses/[code] — one course + its details (for the expanded card).
 *
 * `code` is effectively unique in this dataset, but the table PK is (code, grade);
 * to stay correct even if a code ever spans grades we take the lowest-grade row
 * (`.limit(1)`) instead of erroring on multiple matches. `course_details` is keyed
 * by `code` alone.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const supabase = createServerClient();

    const { data: courseRows, error: courseError } = await supabase
      .from("courses")
      .select(COURSE_COLUMNS)
      .eq("code", code)
      .order("grade", { ascending: true })
      .limit(1);
    if (courseError) return serverError("course lookup", courseError);
    const courseRow = courseRows?.[0];
    if (!courseRow) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { data: detailRow, error: detailError } = await supabase
      .from("course_details")
      .select(COURSE_DETAIL_COLUMNS)
      .eq("code", code)
      .maybeSingle();
    if (detailError) return serverError("detail lookup", detailError);

    return NextResponse.json({
      course: toCourseListItem(courseRow),
      details: detailRow ? toCourseDetail(detailRow) : null,
    });
  } catch (err) {
    return serverError("GET by code", err);
  }
}
