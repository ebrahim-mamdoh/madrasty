import type { TypedSupabaseClient } from "./client";
import { createPeopleService } from "./services/people";
import { createRolesService } from "./services/roles";
import { createSchoolsService } from "./services/schools";
import { createSessionService } from "./services/session";
import { createStructureService } from "./services/structure";
import { createTeachingService } from "./services/teaching";
import { createTimetableService } from "./services/timetable";
import { createAttendanceService } from "./services/attendance";
import { createHomeworkService } from "./services/homework";
import { createExamsService } from "./services/exams";
import { createReportsService } from "./services/reports";

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
    roles: createRolesService(client),
    timetable: createTimetableService(client),
    attendance: createAttendanceService(client),
    homework: createHomeworkService(client),
    exams: createExamsService(client),
    reports: createReportsService(client),
  };
}

export type Services = ReturnType<typeof createServices>;

export { STORAGE_BUCKETS, type TypedSupabaseClient } from "./client";
export { toAppError } from "./errors";
export type { Database } from "./database.types";
export type { SessionClaims } from "./services/session";
export type { SchoolsListParams } from "./services/schools";
export type { PeopleListParams } from "./services/people";
export type { HomeworkWrite, NewAttachment } from "./services/homework";
export type { ExamTransition, ExamWrite, Gradebook } from "./services/exams";
