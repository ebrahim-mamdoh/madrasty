"use server";

import {
  AppError,
  addSchoolAdminSchema,
  createSchoolSchema,
  isAppError,
  resetPasswordSchema,
  type AddSchoolAdminInput,
  type CreateSchoolInput,
  type ResetPasswordInput,
} from "@madrasty/core";
import { parseInput, runAction, type ActionResult } from "@/lib/actions";
import { getAdminServices, getServerServices } from "@/lib/services.server";

/** Only the platform owner may call these actions. */
async function authorizeOwner() {
  const services = await getServerServices();
  const claims = await services.session.getClaims();
  if (claims?.role !== "super_admin") throw new AppError("forbidden");
  return services;
}

/** The target must be an existing school admin (the owner's RLS sees every profile). */
async function authorizeSchoolAdminTarget(profileId: string) {
  const services = await authorizeOwner();
  const target = await services.people.getRef(profileId);
  if (!target || target.role !== "school_admin") throw new AppError("not_found");
  return target;
}

/**
 * Super Admin → creates a school and its first admin account.
 * Uses the service role only for the auth user; the school row itself is written through RLS.
 */
export async function createSchoolAction(
  input: CreateSchoolInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const services = await authorizeOwner();
    const data = parseInput(createSchoolSchema, input);
    const id = await getAdminServices().createSchoolWithAdmin(services, data);
    return { id };
  });
}

/** Super Admin → adds another admin account to an existing school. */
export async function addSchoolAdminAction(
  schoolId: string,
  input: AddSchoolAdminInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const services = await authorizeOwner();
    const data = parseInput(addSchoolAdminSchema, input);
    // Confirms the school exists (and is visible) before creating an account in it.
    await services.schools.getById(schoolId);
    try {
      const id = await getAdminServices().users.create({
        ...data,
        role: "school_admin",
        schoolId,
      });
      return { id };
    } catch (error) {
      if (isAppError(error) && error.message === "errors.email_exists") {
        throw new AppError("conflict", "errors.email_exists", { email: "errors.email_exists" });
      }
      throw error;
    }
  });
}

export async function setSchoolAdminActiveAction(
  profileId: string,
  active: boolean,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const target = await authorizeSchoolAdminTarget(profileId);
    await getAdminServices().users.setActive(target.id, active);
  });
}

export async function resetSchoolAdminPasswordAction(
  profileId: string,
  input: ResetPasswordInput,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const { password } = parseInput(resetPasswordSchema, input);
    const target = await authorizeSchoolAdminTarget(profileId);
    await getAdminServices().users.setPassword(target.id, password);
  });
}
