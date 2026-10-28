"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { AppError, type LoginInput } from "@madrasty/core";
import { useRouter } from "@/i18n/navigation";
import { homeForRole } from "@/lib/portals";
import { getBrowserServices } from "@/lib/services.client";

/**
 * Signs in from the browser so Supabase Auth sees the user's real IP (per-IP rate limiting),
 * then routes to the portal for the user's role.
 */
export function useSignIn() {
  const router = useRouter();
  const locale = useLocale();

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { session } = getBrowserServices();
      await session.signIn(input);

      const claims = await session.getClaims();
      const home = claims?.role ? homeForRole(claims.role) : null;
      if (!home) {
        await session.signOut();
        throw new AppError(
          "forbidden",
          claims?.role === "parent" ? "errors.no_web_access" : "errors.no_access",
        );
      }
      return home;
    },
    onSuccess: (home) => {
      router.replace(home, { locale });
      router.refresh();
    },
  });
}

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => getBrowserServices().session.signOut(),
    onSettled: () => {
      // Never keep another user's data in memory after sign-out.
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
