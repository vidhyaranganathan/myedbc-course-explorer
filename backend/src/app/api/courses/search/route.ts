import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { searchParamsSchema, parseSearchParams } from "@/lib/validation";
import { handleDatabaseError, handleValidationError } from "@/lib/errors";
import type { Course, CourseSearchResult } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.nextUrl.searchParams);
    const validated = searchParamsSchema.safeParse(params);

    if (!validated.success) {
      return handleValidationError(new Error(validated.error.message));
    }

    const { q, grade, category, language, subject, credits, limit, offset } =
      validated.data;

    // Build query
    let query = supabase.from("courses").select("*", { count: "exact" });

    // Apply text search if query provided
    if (q && q.trim()) {
      // Search across course_title, code, and hst_sub_category using ilike
      query = query.or(
        `course_title.ilike.%${q}%,code.ilike.%${q}%,hst_sub_category.ilike.%${q}%`
      );
    }

    // Apply filters
    if (grade) {
      query = query.eq("grade", grade);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (language) {
      query = query.eq("language", language);
    }

    if (subject) {
      query = query.eq("hst_main_category", subject);
    }

    if (credits) {
      query = query.eq("credit_value", credits);
    }

    // Apply pagination
    query = query
      .order("grade", { ascending: true })
      .order("course_title", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return handleDatabaseError(error);
    }

    const response: CourseSearchResult = {
      courses: (data as Course[]) || [],
      total: count || 0,
      limit,
      offset,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleDatabaseError(error);
  }
}
