import { createAuthClient } from "@/lib/supabase-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json({ email: user?.email ?? null });
  } catch {
    return NextResponse.json({ email: null });
  }
}
