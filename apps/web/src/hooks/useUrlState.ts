"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Filters and pagination live in the URL (shareable, back/forward friendly).
 * `setParams` merges; empty values are removed.
 */
export function useUrlState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, setParams };
}
