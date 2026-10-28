import type { TypedSupabaseClient } from "./client";
import { createSchoolsService } from "./services/schools";
import { createSessionService } from "./services/session";

/**
 * Entry point of the service layer. Host apps create a Supabase client for their platform
 * (cookies on web, secure storage on mobile) and get back backend-agnostic services.
 */
export function createServices(client: TypedSupabaseClient) {
  return {
    session: createSessionService(client),
    schools: createSchoolsService(client),
  };
}

export type Services = ReturnType<typeof createServices>;

export { STORAGE_BUCKETS, type TypedSupabaseClient } from "./client";
export { toAppError } from "./errors";
export type { Database } from "./database.types";
export type { SessionClaims } from "./services/session";
export type { SchoolsListParams } from "./services/schools";
