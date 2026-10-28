/**
 * School-level permission catalog. Mirrors rows seeded into `public.permissions`.
 * `school_admin` implicitly holds all of them; staff/teachers get them via staff roles or direct grants.
 */
export const PERMISSION_KEYS = [
  "structure.view",
  "structure.manage",
  "students.view",
  "students.manage",
  "teachers.view",
  "teachers.manage",
  "parents.view",
  "parents.manage",
  "staff.view",
  "staff.manage",
  "roles.manage",
  "attendance.view",
  "attendance.record",
  "homework.view",
  "homework.manage",
  "exams.view",
  "exams.manage",
  "exams.approve",
  "grades.view",
  "grades.record",
  "grades.edit",
  "reports.view",
  "reports.send",
  "finance.view",
  "finance.manage",
  "monitoring.view",
  "settings.branding",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_MODULES = [
  "structure",
  "students",
  "teachers",
  "parents",
  "staff",
  "roles",
  "attendance",
  "homework",
  "exams",
  "grades",
  "reports",
  "finance",
  "monitoring",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export function permissionModule(key: PermissionKey): PermissionModule {
  return key.split(".")[0] as PermissionModule;
}

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && (PERMISSION_KEYS as readonly string[]).includes(value);
}
