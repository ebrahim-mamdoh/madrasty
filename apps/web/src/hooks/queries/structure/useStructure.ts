"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AcademicYearInput,
  GradeLevelInput,
  SchoolClassInput,
  SubjectInput,
} from "@madrasty/core";
import type { Services } from "@madrasty/api";
import { useSchoolId } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const structureQueryKey = ["structure"] as const;
export const academicYearsQueryKey = [...structureQueryKey, "years"] as const;
export const gradeLevelsQueryKey = [...structureQueryKey, "grade-levels"] as const;
export const subjectsQueryKey = [...structureQueryKey, "subjects"] as const;
export const classesQueryKey = (academicYearId: string) =>
  [...structureQueryKey, "classes", academicYearId] as const;
export const teacherOptionsQueryKey = [...structureQueryKey, "teacher-options"] as const;

type StructureService = Services["structure"];

const structure = () => getBrowserServices().structure;

/**
 * Every structure write can change counts shown on other tabs (classes per year/grade…),
 * so a successful mutation refreshes the whole structure cache.
 */
function useStructureMutation<TVariables>(
  run: (service: StructureService, schoolId: string, variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();

  return useMutation({
    mutationFn: (variables: TVariables) => run(structure(), schoolId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: structureQueryKey }),
  });
}

type SaveVariables<TInput> = { id?: string; input: TInput };

// ------------------------------------------------------------------ reads
export function useAcademicYears() {
  return useQuery({
    queryKey: academicYearsQueryKey,
    queryFn: () => structure().listAcademicYears(),
  });
}

export function useGradeLevels() {
  return useQuery({ queryKey: gradeLevelsQueryKey, queryFn: () => structure().listGradeLevels() });
}

export function useSubjects() {
  return useQuery({ queryKey: subjectsQueryKey, queryFn: () => structure().listSubjects() });
}

export function useClasses(academicYearId: string | undefined) {
  return useQuery({
    queryKey: classesQueryKey(academicYearId ?? ""),
    queryFn: () => structure().listClasses(academicYearId!),
    enabled: Boolean(academicYearId),
  });
}

export function useTeacherOptions() {
  return useQuery({
    queryKey: teacherOptionsQueryKey,
    queryFn: () => structure().listTeacherOptions(),
    staleTime: 5 * 60 * 1000,
  });
}

// ----------------------------------------------------------------- writes
export function useSaveAcademicYear() {
  return useStructureMutation(
    (service, schoolId, { id, input }: SaveVariables<AcademicYearInput>) =>
      id ? service.updateAcademicYear(id, input) : service.createAcademicYear(schoolId, input),
  );
}

export function useDeleteAcademicYear() {
  return useStructureMutation((service, _schoolId, id: string) => service.deleteAcademicYear(id));
}

export function useSetCurrentAcademicYear() {
  return useStructureMutation((service, _schoolId, id: string) =>
    service.setCurrentAcademicYear(id),
  );
}

export function useSaveGradeLevel() {
  return useStructureMutation((service, schoolId, { id, input }: SaveVariables<GradeLevelInput>) =>
    id ? service.updateGradeLevel(id, input) : service.createGradeLevel(schoolId, input),
  );
}

export function useDeleteGradeLevel() {
  return useStructureMutation((service, _schoolId, id: string) => service.deleteGradeLevel(id));
}

export function useReorderGradeLevels() {
  return useStructureMutation((service, _schoolId, orderedIds: string[]) =>
    service.reorderGradeLevels(orderedIds),
  );
}

export function useSaveSubject() {
  return useStructureMutation((service, schoolId, { id, input }: SaveVariables<SubjectInput>) =>
    id ? service.updateSubject(id, input) : service.createSubject(schoolId, input),
  );
}

export function useDeleteSubject() {
  return useStructureMutation((service, _schoolId, id: string) => service.deleteSubject(id));
}

export function useSaveClass() {
  return useStructureMutation(
    (service, schoolId, { id, input }: SaveVariables<SchoolClassInput>) =>
      id ? service.updateClass(id, input) : service.createClass(schoolId, input),
  );
}

export function useDeleteClass() {
  return useStructureMutation((service, _schoolId, id: string) => service.deleteClass(id));
}

// --------------------------------------------------------- class subjects
export const classSubjectsQueryKey = (classId: string) =>
  [...structureQueryKey, "class-subjects", classId] as const;

export function useClassSubjects(classId: string | undefined) {
  return useQuery({
    queryKey: classSubjectsQueryKey(classId ?? ""),
    queryFn: () => structure().listClassSubjects(classId!),
    enabled: Boolean(classId),
  });
}

export function useAddClassSubjects() {
  return useStructureMutation(
    (service, schoolId, { classId, subjectIds }: { classId: string; subjectIds: string[] }) =>
      service.addClassSubjects(schoolId, classId, subjectIds),
  );
}

export function useSetClassSubjectTeacher() {
  return useStructureMutation(
    (service, _schoolId, { id, teacherId }: { id: string; teacherId: string | null }) =>
      service.setClassSubjectTeacher(id, teacherId),
  );
}

export function useRemoveClassSubject() {
  return useStructureMutation((service, _schoolId, id: string) => service.removeClassSubject(id));
}
