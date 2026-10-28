/** Account roles. Mirrors the `public.app_role` Postgres enum. */
export const APP_ROLES = [
  "super_admin",
  "school_admin",
  "staff",
  "teacher",
  "student",
  "parent",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Roles that belong to a school (everyone except the platform owner). */
export type SchoolRole = Exclude<AppRole, "super_admin">;

/** Web portal each role lands on. Parents use the mobile app only. */
export type Portal = "platform" | "admin" | "teacher" | "student";

export const ROLE_PORTAL: Record<AppRole, Portal | null> = {
  super_admin: "platform",
  school_admin: "admin",
  staff: "admin",
  teacher: "teacher",
  student: "student",
  parent: null,
};

export const PORTAL_ROLES: Record<Portal, readonly AppRole[]> = {
  platform: ["super_admin"],
  admin: ["school_admin", "staff"],
  teacher: ["teacher"],
  student: ["student"],
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
