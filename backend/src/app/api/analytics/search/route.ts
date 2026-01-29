import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { analyticsSearchSchema } from "@/lib/validation";
import { handleDatabaseError, handleValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = analyticsSearchSchema.safeParse(body);

    if (!validated.success) {
      return handleValidationError(new Error(validated.error.message));
    }

    const { query, filters, resultCount, responseTimeMs } = validated.data;

    // Log to search_logs table
    const { error } = await supabase.from("search_logs").insert({
      query,
      filters: filters || null,
      result_count: resultCount,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      // Log error but don't fail the request - analytics is non-critical
      console.error("Failed to log search analytics:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error but return success - analytics should not block
    console.error("Analytics error:", error);
    return NextResponse.json({ success: true });
  }
}
