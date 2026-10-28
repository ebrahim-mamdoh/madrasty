import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { TypedSupabaseClient } from "@madrasty/api";
import type { Database } from "@madrasty/api/database";
import { env } from "@/env";

/**
 * Service-role client — bypasses RLS. Only for operations Postgres cannot authorize on its own
 * (creating auth users). Always authorize the caller BEFORE using it.
 */
export function createAdminSupabase(): TypedSupabaseClient {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
