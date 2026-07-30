import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Resolves the logged-in user's id + email from the Clerk session, or null
 * if there is no session (or the session read fails). Every /api/user/* route
 * calls this first to scope its DB queries to the acting user.
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
