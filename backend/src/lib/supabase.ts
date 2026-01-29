import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

// Client for public API access (respects RLS)
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Convenience getter (for backwards compatibility)
export const supabase = {
  from: (table: string) => getSupabase().from(table),
};

// Admin client for import scripts (bypasses RLS)
export function getServiceClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }

  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_KEY environment variable");
  }

  return createClient(supabaseUrl, serviceKey);
}
