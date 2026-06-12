import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import {
  COURSE_COLUMNS,
  COURSE_DETAIL_COLUMNS,
  toCourseListItem,
  toCourseDetail,
} from "@/lib/courses-mapper";

/**
 * GET /api/courses/[code] — one course + its details (for the expanded card).
 * `code` is globally unique in this dataset (see ADR-008), so this returns a
 * single object, not an array.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const supabase = createServerClient();

    const { data: courseRow, error: courseError } = await supabase
      .from("courses")
      .select(COURSE_COLUMNS)
      .eq("code", code)
      .maybeSingle();
    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 500 });
    }
    if (!courseRow) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { data: detailRow, error: detailError } = await supabase
      .from("course_details")
      .select(COURSE_DETAIL_COLUMNS)
      .eq("code", code)
      .maybeSingle();
    if (detailError) {
      return NextResponse.json({ error: detailError.message }, { status: 500 });
    }

    return NextResponse.json({
      course: toCourseListItem(courseRow),
      details: detailRow ? toCourseDetail(detailRow) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
