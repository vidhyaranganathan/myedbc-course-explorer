import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { COURSE_COLUMNS, toCourseListItem } from "@/lib/courses-mapper";
import type { CourseUpsertBody } from "@/lib/types";

const BATCH_SIZE = 200;

/** GET /api/courses — all courses (no details). Feeds the grid + in-memory filtering. */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.from("courses").select(COURSE_COLUMNS);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json((data ?? []).map(toCourseListItem));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/courses — bulk upsert, secret-gated (ADR-007).
 * Body: { courses?: CourseUpsertRow[], courseDetails?: CourseDetailUpsertRow[] }
 * Header: X-Api-Key must equal API_WRITE_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.API_WRITE_SECRET;
  if (!secret || request.headers.get("x-api-key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CourseUpsertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const courses = body?.courses;
  const courseDetails = body?.courseDetails;
  if (!Array.isArray(courses) && !Array.isArray(courseDetails)) {
    return NextResponse.json(
      { error: "body must include a `courses` and/or `courseDetails` array" },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    let upsertedCourses = 0;
    let upsertedDetails = 0;

    if (Array.isArray(courses) && courses.length > 0) {
      for (let i = 0; i < courses.length; i += BATCH_SIZE) {
        const batch = courses.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("courses").upsert(batch, { onConflict: "code,grade" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        upsertedCourses += batch.length;
      }
    }

    if (Array.isArray(courseDetails) && courseDetails.length > 0) {
      for (let i = 0; i < courseDetails.length; i += BATCH_SIZE) {
        const batch = courseDetails.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("course_details").upsert(batch, { onConflict: "code" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        upsertedDetails += batch.length;
      }
    }

    return NextResponse.json({
      upserted: { courses: upsertedCourses, courseDetails: upsertedDetails },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
