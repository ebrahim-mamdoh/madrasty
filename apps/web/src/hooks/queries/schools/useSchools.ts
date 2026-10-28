"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppError, type CreateSchoolInput, type SchoolStatus } from "@madrasty/core";
import type { SchoolsListParams } from "@madrasty/api";
import { createSchoolAction } from "@/actions/schools";
import { getBrowserServices } from "@/lib/services.client";

export const schoolsQueryKey = ["schools"] as const;
export const schoolsListQueryKey = (params: SchoolsListParams) =>
  [...schoolsQueryKey, "list", params] as const;
export const platformStatsQueryKey = [...schoolsQueryKey, "stats"] as const;

export function useSchools(params: SchoolsListParams) {
  return useQuery({
    queryKey: schoolsListQueryKey(params),
    queryFn: () => getBrowserServices().schools.list(params),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: platformStatsQueryKey,
    queryFn: () => getBrowserServices().schools.platformStats(),
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSchoolInput) => {
      const result = await createSchoolAction(input);
      if (!result.ok) {
        throw new AppError(result.error.code, result.error.message, result.error.fieldErrors);
      }
      return result.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}

export function useSetSchoolStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SchoolStatus }) =>
      getBrowserServices().schools.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey }),
  });
}
