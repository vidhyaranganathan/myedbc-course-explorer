import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import { PROFILE_COLUMNS, toProfile } from "@/lib/user-mapper";
import { PROFILE_ROLES, VALID_GRADES, type Profile } from "@/lib/user-types";

function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/user/profile] ${context}:`, err);
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

const EMPTY_PROFILE: Profile = { role: null, gradeInterest: null, school: null, district: null };

/** GET /api/user/profile — the logged-in user's profile row. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.userId)
      .maybeSingle();
    if (error) return serverError("GET", error);
    return NextResponse.json(data ? toProfile(data) : EMPTY_PROFILE);
  } catch (err) {
    return serverError("GET", err);
  }
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

/**
 * Validates and narrows the PATCH body to only known profile fields.
 * Returns an error message string if invalid, or the DB row patch otherwise.
 */
function parseProfilePatch(
  body: unknown
): { error: string } | { role?: string | null; grade_interest?: number[] | null; school?: string | null; district?: string | null } {
  if (typeof body !== "object" || body === null) return { error: "invalid body" };
  const b = body as Record<string, unknown>;
  const patch: { role?: string | null; grade_interest?: number[] | null; school?: string | null; district?: string | null } = {};

  if ("role" in b) {
    const role = b.role;
    if (role !== null && !PROFILE_ROLES.includes(role as (typeof PROFILE_ROLES)[number])) {
      return { error: `role must be one of ${PROFILE_ROLES.join(", ")}, or null` };
    }
    patch.role = role as string | null;
  }
  if ("gradeInterest" in b) {
    const grades = b.gradeInterest;
    if (grades !== null) {
      if (!Array.isArray(grades) || !grades.every((g) => VALID_GRADES.includes(g))) {
        return { error: `gradeInterest must be a subset of ${VALID_GRADES.join(", ")}, or null` };
      }
    }
    patch.grade_interest = grades as number[] | null;
  }
  if ("school" in b) {
    if (!isStringOrNull(b.school)) return { error: "school must be a string or null" };
    patch.school = b.school;
  }
  if ("district" in b) {
    if (!isStringOrNull(b.district)) return { error: "district must be a string or null" };
    patch.district = b.district;
  }
  return patch;
}

/** PATCH /api/user/profile — update the logged-in user's role/gradeInterest/school/district. */
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const patch = parseProfilePatch(body);
  if ("error" in patch) return NextResponse.json({ error: patch.error }, { status: 400 });

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) return serverError("PATCH", error);

    if (!data) {
      // Self-healing fallback: the signup trigger should have created this row already.
      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: user.userId, ...patch }, { onConflict: "id" })
        .select(PROFILE_COLUMNS)
        .single();
      if (upsertError) return serverError("PATCH upsert fallback", upsertError);
      return NextResponse.json(toProfile(upserted));
    }

    return NextResponse.json(toProfile(data));
  } catch (err) {
    return serverError("PATCH", err);
  }
}
