import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";

const intlMiddleware = createIntlMiddleware(routing);

/** Paths reachable without a session (after the locale prefix is stripped). */
const PUBLIC_PATHS = ["/login", "/language"];

function splitLocale(pathname: string): { prefix: string; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return { prefix: `/${first}`, path: `/${rest.join("/")}` };
  }
  return { prefix: "", path: pathname };
}

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const { isAuthenticated } = await refreshSession(request, response);

  const { prefix, path } = splitLocale(request.nextUrl.pathname);
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isAuthenticated && !isPublic) {
    const redirect = NextResponse.redirect(new URL(`${prefix}/login`, request.url));
    // Carry refreshed/cleared auth cookies over to the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  // Everything except API routes, Next internals and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
