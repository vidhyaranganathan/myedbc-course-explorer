import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { courseCodeSchema } from "@/lib/validation";
import {
  handleDatabaseError,
  handleValidationError,
  createErrorResponse,
} from "@/lib/errors";
import type { Course } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const validated = courseCodeSchema.safeParse({ code });

    if (!validated.success) {
      return handleValidationError(new Error(validated.error.message));
    }

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("code", code);

    if (error) {
      return handleDatabaseError(error);
    }

    if (!data || data.length === 0) {
      return createErrorResponse(
        "NOT_FOUND",
        `Course with code '${code}' not found`
      );
    }

    // Return all courses with this code (may have multiple for different grades)
    const courses = data as Course[];

    // If single result, return the course directly
    // If multiple results (same code, different grades), return array
    if (courses.length === 1) {
      return NextResponse.json(courses[0]);
    }

    return NextResponse.json({
      code,
      courses,
      message: "Multiple courses found with the same code (different grades)",
    });
  } catch (error) {
    return handleDatabaseError(error);
  }
}
