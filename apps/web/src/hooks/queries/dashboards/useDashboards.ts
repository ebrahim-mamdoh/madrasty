"use client";

import { useQuery } from "@tanstack/react-query";
import { getBrowserServices } from "@/lib/services.client";

/** Every module's writes change these numbers, so they're always fetched fresh on mount. */
export const dashboardsQueryKey = ["dashboards"] as const;

const dashboards = () => getBrowserServices().dashboards;

export function useAdminDashboard() {
  return useQuery({
    queryKey: [...dashboardsQueryKey, "admin"],
    queryFn: () => dashboards().admin(),
    refetchOnMount: "always",
  });
}

export function useTeacherDashboard() {
  return useQuery({
    queryKey: [...dashboardsQueryKey, "teacher"],
    queryFn: () => dashboards().teacher(),
    refetchOnMount: "always",
  });
}

export function useTeacherMonitoring() {
  return useQuery({
    queryKey: [...dashboardsQueryKey, "monitoring"],
    queryFn: () => dashboards().monitoring(),
    refetchOnMount: "always",
  });
}
