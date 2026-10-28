import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@madrasty/api/database";
import { env } from "@/env";

/**
 * Refreshes the auth session on every request and writes rotated cookies onto `response`.
 * Returns whether a verified user is present.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<{ isAuthenticated: boolean }> {
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run code between client creation and getClaims — it must be the first auth call.
  const { data } = await supabase.auth.getClaims();
  return { isAuthenticated: Boolean(data?.claims.sub) };
}
