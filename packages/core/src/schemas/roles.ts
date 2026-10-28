import { z } from "zod";
import { PERMISSION_KEYS } from "../permissions";

/** A school-defined group of permissions (e.g. "Academic supervisor", "Accountant"). */
export const staffRoleSchema = z.object({
  name: z.string().trim().min(2, "validation.name_min").max(60, "validation.name_max"),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});

export type StaffRoleInput = z.infer<typeof staffRoleSchema>;

/** What one staff member / teacher holds: role groups plus individual extra permissions. */
export const personAccessSchema = z.object({
  roleIds: z.array(z.uuid()),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
});

export type PersonAccessInput = z.infer<typeof personAccessSchema>;
