import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { suggestParamsSchema, parseSearchParams } from "@/lib/validation";
import { handleDatabaseError, handleValidationError } from "@/lib/errors";
import type { SuggestResult } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.nextUrl.searchParams);
    const validated = suggestParamsSchema.safeParse(params);

    if (!validated.success) {
      return handleValidationError(new Error(validated.error.message));
    }

    const { q, limit } = validated.data;
    const searchTerm = q.trim();

    // Search for matching courses by title or code
    // Using ilike for case-insensitive matching
    const { data, error } = await supabase
      .from("courses")
      .select("code, course_title, grade")
      .or(`course_title.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .order("course_title", { ascending: true })
      .limit(limit);

    if (error) {
      return handleDatabaseError(error);
    }

    // Deduplicate by code and format response
    const seen = new Set<string>();
    const suggestions = (data || [])
      .filter((course) => {
        if (seen.has(course.code)) return false;
        seen.add(course.code);
        return true;
      })
      .map((course) => ({
        code: course.code,
        title: course.course_title,
        grade: course.grade,
      }));

    const response: SuggestResult = {
      suggestions,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleDatabaseError(error);
  }
}
