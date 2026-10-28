"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePersonInput,
  ManagedPersonRole,
  ResetPasswordInput,
  UpdatePersonInput,
} from "@madrasty/core";
import type { PeopleListParams } from "@madrasty/api";
import {
  createPersonAction,
  resetPersonPasswordAction,
  setPersonActiveAction,
} from "@/actions/people";
import { structureQueryKey } from "@/hooks/queries/structure/useStructure";
import { useSession } from "@/hooks/useSession";
import { unwrapAction } from "@/lib/action-result";
import { getBrowserServices } from "@/lib/services.client";

export const peopleQueryKey = ["people"] as const;
export const peopleListQueryKey = (role: ManagedPersonRole, params: PeopleListParams) =>
  [...peopleQueryKey, role, "list", params] as const;
export const studentOptionsQueryKey = (academicYearId?: string) =>
  [...peopleQueryKey, "student-options", academicYearId ?? ""] as const;
export const parentChildIdsQueryKey = (parentId: string) =>
  [...peopleQueryKey, "children", parentId] as const;

const people = () => getBrowserServices().people;

/** People changes move class headcounts too, so both caches refresh. */
function useInvalidatePeople() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: peopleQueryKey }),
      queryClient.invalidateQueries({ queryKey: structureQueryKey }),
    ]);
}

// ------------------------------------------------------------------ reads
export function usePeople(role: ManagedPersonRole, params: PeopleListParams) {
  return useQuery({
    queryKey: peopleListQueryKey(role, params),
    queryFn: () => people().list(role, params),
    placeholderData: keepPreviousData,
  });
}

export function useStudentOptions(academicYearId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: studentOptionsQueryKey(academicYearId),
    queryFn: () => people().listStudentOptions(academicYearId),
    enabled,
  });
}

export function useParentChildIds(parentId: string | undefined) {
  return useQuery({
    queryKey: parentChildIdsQueryKey(parentId ?? ""),
    queryFn: () => people().listChildIds(parentId!),
    enabled: Boolean(parentId),
  });
}

// ----------------------------------------------------------------- writes
export function useCreatePerson() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: (input: CreatePersonInput) => unwrapAction(createPersonAction(input)),
    onSuccess: invalidate,
  });
}

export type UpdatePersonVariables = {
  id: string;
  input: UpdatePersonInput;
  /** Students: new class in `academicYearId` ("" removes the placement). Omit to leave as is. */
  placement?: { academicYearId: string; classId: string };
  /** Parents: the complete new set of linked children. Omit to leave as is. */
  childIds?: string[];
};

/** Display fields go through RLS (no privileged action needed), then placement / links. */
export function useUpdatePerson() {
  const invalidate = useInvalidatePeople();
  const { school } = useSession();

  return useMutation({
    mutationFn: async ({ id, input, placement, childIds }: UpdatePersonVariables) => {
      const service = people();
      await service.update(id, input);
      if (placement && school) {
        await service.setStudentClass(
          school.id,
          id,
          placement.academicYearId,
          placement.classId || null,
        );
      }
      if (childIds && school) await service.setParentChildren(school.id, id, childIds);
    },
    onSuccess: invalidate,
  });
}

export function useSetPersonActive() {
  const invalidate = useInvalidatePeople();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      unwrapAction(setPersonActiveAction(id, active)),
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResetPasswordInput }) =>
      unwrapAction(resetPersonPasswordAction(id, input)),
  });
}
