import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ email: user?.email ?? null, isSignedIn: user !== null });
}
