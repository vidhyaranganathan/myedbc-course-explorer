import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedPage = createRouteMatcher(["/profile(.*)"]);
const isProtectedApi = createRouteMatcher(["/api/user(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId) {
    if (isProtectedPage(req)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (isProtectedApi(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
