"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const teachingQueryKey = ["teaching"] as const;

/** The signed-in teacher's classes this year. */
export function useMyClasses() {
  const { profile } = useSession();
  return useQuery({
    queryKey: [...teachingQueryKey, "my-classes", profile.id],
    queryFn: () => getBrowserServices().teaching.listMyClasses(profile.id),
  });
}
