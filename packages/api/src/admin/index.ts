import { AppError, type CreateSchoolInput, type SchoolRole } from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError } from "../errors";
import type { Services } from "../index";

/** Re-throws a uniqueness failure as a field error so the form can highlight the right input. */
function onConflict(error: unknown, field: string, message: string): AppError {
  const appError = toAppError(error);
  const isDuplicate = appError.code === "conflict" || appError.message === "errors.email_exists";
  return isDuplicate ? new AppError("conflict", message, { [field]: message }) : appError;
}

/**
 * Privileged operations. `adminClient` MUST be created with the service-role key and this module
 * MUST only be imported from server-only code. Callers authorize the actor before calling in.
 */
export function createAdminServices(adminClient: TypedSupabaseClient) {
  const users = {
    async create(input: {
      email: string;
      password: string;
      fullName: string;
      role: SchoolRole;
      schoolId: string;
    }): Promise<string> {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        // app_metadata is writable only by the service role; a DB trigger turns it into the profile row.
        app_metadata: { role: input.role, school_id: input.schoolId },
        user_metadata: { full_name: input.fullName },
      });
      if (error || !data.user) throw toAppError(error);
      return data.user.id;
    },
  };

  return {
    users,

    /**
     * Creates the tenant through the caller's RLS-scoped services, then its first admin account.
     * If the account cannot be created, the school is rolled back.
     */
    async createSchoolWithAdmin(services: Services, input: CreateSchoolInput): Promise<string> {
      let schoolId: string;
      try {
        schoolId = await services.schools.create({
          name: input.name,
          slug: input.slug,
          features: input.features,
        });
      } catch (error) {
        // The slug is the only unique column a new school can collide on.
        throw onConflict(error, "slug", "errors.slug_taken");
      }

      try {
        await users.create({ ...input.admin, role: "school_admin", schoolId });
      } catch (error) {
        await services.schools.remove(schoolId).catch(() => undefined);
        throw onConflict(error, "admin.email", "errors.email_exists");
      }
      return schoolId;
    },
  };
}

export type AdminServices = ReturnType<typeof createAdminServices>;
