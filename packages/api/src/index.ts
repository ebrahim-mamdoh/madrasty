import type { TypedSupabaseClient } from "./client";
import { createPeopleService } from "./services/people";
import { createSchoolsService } from "./services/schools";
import { createSessionService } from "./services/session";
import { createStructureService } from "./services/structure";
import { createTeachingService } from "./services/teaching";

/**
 * Entry point of the service layer. Host apps create a Supabase client for their platform
 * (cookies on web, secure storage on mobile) and get back backend-agnostic services.
 */
export function createServices(client: TypedSupabaseClient) {
  return {
    session: createSessionService(client),
    schools: createSchoolsService(client),
    structure: createStructureService(client),
    people: createPeopleService(client),
    teaching: createTeachingService(client),
  };
}

export type Services = ReturnType<typeof createServices>;

export { STORAGE_BUCKETS, type TypedSupabaseClient } from "./client";
export { toAppError } from "./errors";
export type { Database } from "./database.types";
export type { SessionClaims } from "./services/session";
export type { SchoolsListParams } from "./services/schools";
export type { PeopleListParams } from "./services/people";
