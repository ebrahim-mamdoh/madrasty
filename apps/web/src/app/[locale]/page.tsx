import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/portals";

/** Entry point: send everyone to their own portal. */
export default async function IndexPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  const home = session ? homeForRole(session.profile.role) : null;
  return redirect({ href: home ?? "/login", locale });
}
