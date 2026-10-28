import { createBrowserClient } from "@supabase/ssr";
import type { TypedSupabaseClient } from "@madrasty/api";
import type { Database } from "@madrasty/api/database";
import { env } from "@/env";

let client: TypedSupabaseClient | undefined;

/** Singleton browser client — session lives in cookies shared with the server. */
export function getBrowserSupabase(): TypedSupabaseClient {
  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return client;
}
