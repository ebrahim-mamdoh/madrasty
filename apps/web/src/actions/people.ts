"use server";

import {
  AppError,
  createPersonSchema,
  isAppError,
  resetPasswordSchema,
  type CreatePersonInput,
  type ManagedPersonRole,
  type PermissionKey,
  type ResetPasswordInput,
} from "@madrasty/core";
import { getSession } from "@/lib/auth";
import { parseInput, runAction, type ActionResult } from "@/lib/actions";
import { getAdminServices, getServerServices } from "@/lib/services.server";

const MANAGE_PERMISSION: Record<ManagedPersonRole, PermissionKey> = {
  teacher: "teachers.manage",
  student: "students.manage",
  parent: "parents.manage",
};

function isManagedRole(role: string): role is ManagedPersonRole {
  return role in MANAGE_PERMISSION;
}

/** The caller must be signed in to a school and hold `permission`. Never trust the client. */
async function authorize(permission: PermissionKey) {
  const session = await getSession();
  if (!session?.school || !session.permissions.includes(permission)) {
    throw new AppError("forbidden");
  }
  return { session, schoolId: session.school.id, services: await getServerServices() };
}

/**
 * Resolves the target account through the caller's RLS-scoped client: if the caller cannot see
 * it, or it belongs to another school, it does not exist for them.
 */
async function authorizeTarget(personId: string) {
  const services = await getServerServices();
  const target = await services.people.getRef(personId);
  if (!target || !isManagedRole(target.role)) throw new AppError("not_found");

  const { session, schoolId } = await authorize(MANAGE_PERMISSION[target.role]);
  if (target.schoolId !== schoolId) throw new AppError("not_found");
  if (target.id === session.profile.id) throw new AppError("forbidden");
  return target;
}

/** Creates a teacher / student / parent account, then places or links them. Rolls back on failure. */
export async function createPersonAction(
  input: CreatePersonInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = parseInput(createPersonSchema, input);
    const { schoolId, services } = await authorize(MANAGE_PERMISSION[data.role]);
    const admin = getAdminServices();

    let userId: string;
    try {
      userId = await admin.users.create({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone || undefined,
        role: data.role,
        schoolId,
      });
    } catch (error) {
      if (isAppError(error) && error.message === "errors.email_exists") {
        throw new AppError("conflict", "errors.email_exists", { email: "errors.email_exists" });
      }
      throw error;
    }

    try {
      if (data.role === "student" && data.classId) {
        const yearId = await services.structure.getClassYearId(data.classId);
        await services.people.setStudentClass(schoolId, userId, yearId, data.classId);
      }
      if (data.role === "parent" && data.studentIds.length > 0) {
        await services.people.setParentChildren(schoolId, userId, data.studentIds);
      }
    } catch (error) {
      // Never leave an account behind that the form reported as failed.
      await admin.users.remove(userId).catch(() => undefined);
      throw error;
    }

    return { id: userId };
  });
}

export async function setPersonActiveAction(
  personId: string,
  active: boolean,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const target = await authorizeTarget(personId);
    await getAdminServices().users.setActive(target.id, active);
  });
}

export async function resetPersonPasswordAction(
  personId: string,
  input: ResetPasswordInput,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const { password } = parseInput(resetPasswordSchema, input);
    const target = await authorizeTarget(personId);
    await getAdminServices().users.setPassword(target.id, password);
  });
}
