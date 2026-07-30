import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import { FILTER_SET_COLUMNS, toSavedFilterSet } from "@/lib/user-mapper";
import type { Filters } from "@/lib/search";

function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/user/filters/[id]] ${context}:`, err);
  return NextResponse.json({ error: "internal server error" }, { status: 500 });
}

const STRING_ARRAY_KEYS: (keyof Omit<Filters, "query">)[] = ["grades", "categories", "languages", "subjects", "credits"];

function isValidFilters(v: unknown): v is Filters {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Record<string, unknown>;
  if (typeof f.query !== "string") return false;
  return STRING_ARRAY_KEYS.every(
    (key) => Array.isArray(f[key]) && (f[key] as unknown[]).every((x) => typeof x === "string")
  );
}

/** PATCH /api/user/filters/[id] — update name, filters, and/or default status. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const patch: { name?: string; filters?: Filters; is_default?: boolean } = {};
  if ("name" in b) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    patch.name = name;
  }
  if ("filters" in b) {
    if (!isValidFilters(b.filters)) return NextResponse.json({ error: "filters must be a valid Filters object" }, { status: 400 });
    patch.filters = b.filters;
  }
  if ("isDefault" in b) {
    if (typeof b.isDefault !== "boolean") return NextResponse.json({ error: "isDefault must be a boolean" }, { status: 400 });
    patch.is_default = b.isDefault;
  }

  try {
    const supabase = createServerClient();

    const { data: existing, error: existingError } = await supabase
      .from("saved_filter_sets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.userId)
      .maybeSingle();
    if (existingError) return serverError("PATCH ownership check", existingError);
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (patch.is_default === true) {
      const { error: clearError } = await supabase
        .from("saved_filter_sets")
        .update({ is_default: false })
        .eq("user_id", user.userId)
        .eq("is_default", true);
      if (clearError) return serverError("PATCH clear old default", clearError);
    }

    const { data, error } = await supabase
      .from("saved_filter_sets")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.userId)
      .select(FILTER_SET_COLUMNS)
      .single();
    if (error) {
      if (error.message.includes("one_default_per_user")) {
        return NextResponse.json({ error: "conflict, please retry" }, { status: 409 });
      }
      return serverError("PATCH update", error);
    }
    return NextResponse.json(toSavedFilterSet(data));
  } catch (err) {
    return serverError("PATCH", err);
  }
}

/** DELETE /api/user/filters/[id] — delete one of the logged-in user's saved filter sets. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("saved_filter_sets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.userId)
      .select("id")
      .maybeSingle();
    if (error) return serverError("DELETE", error);
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE", err);
  }
}
