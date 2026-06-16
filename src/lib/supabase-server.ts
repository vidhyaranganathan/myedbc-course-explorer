import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service_role key.
 *
 * This is the ONLY path to the database (ADR-007). It must never be imported
 * into client components — the `server-only` import above makes such a mistake
 * a build error. The service_role key bypasses RLS, so it stays server-side.
 *
 * Created lazily per request so a missing env var surfaces as a 500 from the
 * route handler rather than crashing at module load (and so tests can mock it).
 */
export function createServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: SUPABASE_URL and SUPABASE_SECRET_KEY must be set"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
