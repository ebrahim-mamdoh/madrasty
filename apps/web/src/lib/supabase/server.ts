import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { TypedSupabaseClient } from "@madrasty/api";
import type { Database } from "@madrasty/api/database";
import { env } from "@/env";

/** Per-request client bound to the caller's auth cookies. RLS applies. */
export async function createServerSupabase(): Promise<TypedSupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // The proxy refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
