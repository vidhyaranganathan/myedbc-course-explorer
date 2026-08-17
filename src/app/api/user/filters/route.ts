import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import { FILTER_SET_COLUMNS, toSavedFilterSet } from "@/lib/user-mapper";
import type { Filters } from "@/lib/search";
import type { SavedFilterSetDbRow } from "@/lib/user-types";

function serverError(context: string, err: unknown): NextResponse {
  console.error(`[api/user/filters] ${context}:`, err);
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

/** GET /api/user/filters — list the logged-in user's saved filter sets, default first. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("saved_filter_sets")
      .select(FILTER_SET_COLUMNS)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return serverError("GET", error);
    return NextResponse.json((data ?? []).map(toSavedFilterSet));
  } catch (err) {
    return serverError("GET", err);
  }
}

/** POST /api/user/filters — create a new saved filter set. */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!isValidFilters(b.filters)) return NextResponse.json({ error: "filters must be a valid Filters object" }, { status: 400 });
  const isDefault = b.isDefault === true;

  try {
    const supabase = createServerClient();

    if (isDefault) {
      const { data, error } = (await supabase
        .rpc("insert_default_filter_set", { p_user_id: userId, p_name: name, p_filters: b.filters })
        .maybeSingle()) as { data: SavedFilterSetDbRow | null; error: { message: string } | null };
      if (error) {
        if (error.message.includes("one_default_per_user")) {
          return NextResponse.json({ error: "conflict, please retry" }, { status: 409 });
        }
        return serverError("POST insert", error);
      }
      return NextResponse.json(toSavedFilterSet(data!), { status: 201 });
    }

    const { data, error } = await supabase
      .from("saved_filter_sets")
      .insert({ user_id: userId, name, filters: b.filters, is_default: false })
      .select(FILTER_SET_COLUMNS)
      .single();
    if (error) return serverError("POST insert", error);
    return NextResponse.json(toSavedFilterSet(data), { status: 201 });
  } catch (err) {
    return serverError("POST", err);
  }
}
