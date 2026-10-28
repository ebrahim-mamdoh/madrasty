import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** The only Supabase client type services accept. Created by the host app (web/mobile) and injected. */
export type TypedSupabaseClient = SupabaseClient<Database>;

export const STORAGE_BUCKETS = {
  schoolBranding: "school-branding",
} as const;
