"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type {
  AddSchoolAdminInput,
  CreateSchoolInput,
  FeatureKey,
  ResetPasswordInput,
  SchoolSettingsInput,
  SchoolStatus,
  UpdateSchoolInput,
} from "@madrasty/core";
import type { SchoolsListParams } from "@madrasty/api";
import {
  addSchoolAdminAction,
  createSchoolAction,
  resetSchoolAdminPasswordAction,
  setSchoolAdminActiveAction,
} from "@/actions/schools";
import { useSchoolId } from "@/hooks/useSession";
import { unwrapAction } from "@/lib/action-result";
import { getBrowserServices } from "@/lib/services.client";

export const schoolsQueryKey = ["schools"] as const;
export const schoolsListQueryKey = (params: SchoolsListParams) =>
  [...schoolsQueryKey, "list", params] as const;
export const platformStatsQueryKey = [...schoolsQueryKey, "stats"] as const;
export const schoolQueryKey = (id: string) => [...schoolsQueryKey, "detail", id] as const;
export const schoolAdminsQueryKey = (id: string) => [...schoolQueryKey(id), "admins"] as const;

const schools = () => getBrowserServices().schools;

function useInvalidateSchools() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: schoolsQueryKey });
}

// ------------------------------------------------------------------ reads
export function useSchools(params: SchoolsListParams) {
  return useQuery({
    queryKey: schoolsListQueryKey(params),
    queryFn: () => schools().list(params),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: platformStatsQueryKey,
    queryFn: () => schools().platformStats(),
  });
}

export function useSchool(id: string) {
  return useQuery({ queryKey: schoolQueryKey(id), queryFn: () => schools().getById(id) });
}

export function useSchoolAdmins(schoolId: string) {
  return useQuery({
    queryKey: schoolAdminsQueryKey(schoolId),
    queryFn: () => schools().listAdmins(schoolId),
  });
}

// ------------------------------------------------- platform owner writes
export function useCreateSchool() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: (input: CreateSchoolInput) => unwrapAction(createSchoolAction(input)),
    onSuccess: invalidate,
  });
}

export function useSetSchoolStatus() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SchoolStatus }) =>
      schools().setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useUpdateSchool() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSchoolInput }) =>
      schools().update(id, input),
    onSuccess: invalidate,
  });
}

export function useSetSchoolFeatures() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: ({ id, features }: { id: string; features: FeatureKey[] }) =>
      schools().setFeatures(id, features),
    onSuccess: invalidate,
  });
}

export function useAddSchoolAdmin() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: ({ schoolId, input }: { schoolId: string; input: AddSchoolAdminInput }) =>
      unwrapAction(addSchoolAdminAction(schoolId, input)),
    onSuccess: invalidate,
  });
}

export function useSetSchoolAdminActive() {
  const invalidate = useInvalidateSchools();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      unwrapAction(setSchoolAdminActiveAction(id, active)),
    onSuccess: invalidate,
  });
}

export function useResetSchoolAdminPassword() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResetPasswordInput }) =>
      unwrapAction(resetSchoolAdminPasswordAction(id, input)),
  });
}

// ------------------------------------------------------- school admin writes
export type SchoolLogoChange = { file: File; extension: string } | "remove" | undefined;

/**
 * Admin → Settings. Branding lives in the server-rendered shell (CSS vars, logo, name),
 * so a successful save refreshes the route to re-brand every portal surface at once.
 */
export function useUpdateSchoolSettings() {
  const router = useRouter();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({ input, logo }: { input: SchoolSettingsInput; logo: SchoolLogoChange }) =>
      schools().updateOwnSettings(schoolId, input, logo),
    onSuccess: () => router.refresh(),
  });
}
