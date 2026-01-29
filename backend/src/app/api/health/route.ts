import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { HealthStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check database connection and get course count
    const { count, error } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Health check failed:", error);
      const response: HealthStatus = {
        status: "unhealthy",
        database: "disconnected",
        courseCount: 0,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 503 });
    }

    const response: HealthStatus = {
      status: "healthy",
      database: "connected",
      courseCount: count || 0,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Health check error:", error);
    const response: HealthStatus = {
      status: "unhealthy",
      database: "disconnected",
      courseCount: 0,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response, { status: 503 });
  }
}
