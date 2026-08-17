import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Resolves the logged-in user's id from the Clerk session token — no Clerk
 * Backend API round-trip. Use this in routes that only need the id (every
 * /api/user/* route); use getSessionUser() only where the email is needed.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the logged-in user's id + email from the Clerk session, or null
 * if there is no session (or the session read fails). Calls Clerk's
 * currentUser(), which makes a Backend API round-trip — reserve this for
 * places that render the email (Header, /api/auth/me, profile page).
 */
export async function getSessionUser(): Promise<{ userId: string; email: string | null } | null> {
  try {
    const user = await currentUser();
    if (!user) return null;
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;
    return { userId: user.id, email: primaryEmail ?? null };
  } catch {
    return null;
  }
}
