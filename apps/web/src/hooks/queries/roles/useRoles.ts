"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PersonAccessInput, StaffRoleInput } from "@madrasty/core";
import { useSchoolId } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const rolesQueryKey = ["roles"] as const;
export const staffRolesQueryKey = [...rolesQueryKey, "list"] as const;
export const peopleAccessQueryKey = [...rolesQueryKey, "access"] as const;

const roles = () => getBrowserServices().roles;

/** Role edits change what people inherit, so every write refreshes both lists. */
function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: rolesQueryKey });
}

// ------------------------------------------------------------------ reads
export function useStaffRoles() {
  return useQuery({ queryKey: staffRolesQueryKey, queryFn: () => roles().listRoles() });
}

export function usePeopleAccess() {
  return useQuery({ queryKey: peopleAccessQueryKey, queryFn: () => roles().listPeopleAccess() });
}

// ----------------------------------------------------------------- writes
export function useSaveStaffRole() {
  const invalidate = useInvalidateRoles();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: StaffRoleInput }) => {
      if (id) await roles().updateRole(schoolId, id, input);
      else await roles().createRole(schoolId, input);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteStaffRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: string) => roles().deleteRole(id),
    onSuccess: invalidate,
  });
}

export function useSetPersonAccess() {
  const invalidate = useInvalidateRoles();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PersonAccessInput }) =>
      roles().setPersonAccess(schoolId, id, input),
    onSuccess: invalidate,
  });
}
