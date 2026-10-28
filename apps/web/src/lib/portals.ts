import { ROLE_PORTAL, type AppRole, type Portal } from "@madrasty/core";

export const PORTAL_HOME: Record<Portal, string> = {
  platform: "/platform",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/** Landing page for a role, or null for roles without web access (parents use the mobile app). */
export function homeForRole(role: AppRole): string | null {
  const portal = ROLE_PORTAL[role];
  return portal ? PORTAL_HOME[portal] : null;
}
