import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { ROLE_PORTAL, type PermissionKey, type Portal, type SessionContext } from "@madrasty/core";
import { redirect } from "@/i18n/navigation";
import { homeForRole } from "@/lib/portals";
import { getServerServices } from "@/lib/services.server";

/** The signed-in user's context, or null. Memoized per request. */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const services = await getServerServices();
  return services.session.getContext().catch(() => null);
});

async function redirectTo(href: string): Promise<never> {
  return redirect({ href, locale: await getLocale() });
}

/** Server-side gate for a portal layout: signed in AND the role belongs to this portal. */
export async function requirePortal(portal: Portal): Promise<SessionContext> {
  const session = await getSession();
  if (!session) return redirectTo("/login");

  if (ROLE_PORTAL[session.profile.role] !== portal) {
    return redirectTo(homeForRole(session.profile.role) ?? "/login");
  }
  return session;
}

/** Server-side gate for a page inside the admin portal. */
export async function requirePermission(permission: PermissionKey): Promise<SessionContext> {
  const session = await requirePortal("admin");
  if (!session.permissions.includes(permission)) {
    return redirectTo("/admin");
  }
  return session;
}
