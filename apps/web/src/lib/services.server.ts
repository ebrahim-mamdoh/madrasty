import "server-only";
import { cache } from "react";
import { createServices } from "@madrasty/api";
import { createAdminServices } from "@madrasty/api/admin";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

/** RLS-scoped services for the current request (memoized per request). */
export const getServerServices = cache(async () => createServices(await createServerSupabase()));

/** Service-role services. Authorize the caller first — see lib/auth.ts. */
export function getAdminServices() {
  return createAdminServices(createAdminSupabase());
}
