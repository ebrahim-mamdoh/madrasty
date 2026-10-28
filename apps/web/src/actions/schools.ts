"use server";

import { AppError, createSchoolSchema, type CreateSchoolInput } from "@madrasty/core";
import { parseInput, runAction, type ActionResult } from "@/lib/actions";
import { getAdminServices, getServerServices } from "@/lib/services.server";

/**
 * Super Admin → creates a school and its first admin account.
 * Uses the service role only for the auth user; the school row itself is written through RLS.
 */
export async function createSchoolAction(
  input: CreateSchoolInput,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const services = await getServerServices();
    const claims = await services.session.getClaims();
    if (claims?.role !== "super_admin") throw new AppError("forbidden");

    const data = parseInput(createSchoolSchema, input);
    const id = await getAdminServices().createSchoolWithAdmin(services, data);
    return { id };
  });
}
