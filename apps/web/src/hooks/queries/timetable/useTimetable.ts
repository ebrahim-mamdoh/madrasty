"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { PeriodInput, TimetableSlot } from "@madrasty/core";
import { useSchoolId, useSession } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const timetableQueryKey = ["timetable"] as const;
export const periodsQueryKey = [...timetableQueryKey, "periods"] as const;
export const classTimetableQueryKey = (classId: string) =>
  [...timetableQueryKey, "class", classId] as const;
export const teacherScheduleQueryKey = (teacherId: string) =>
  [...timetableQueryKey, "teacher", teacherId] as const;
export const studentClassQueryKey = (studentId: string) =>
  [...timetableQueryKey, "student-class", studentId] as const;
export const classSubjectsWithTeachersQueryKey = (classId: string) =>
  [...timetableQueryKey, "class-subjects", classId] as const;

const timetable = () => getBrowserServices().timetable;

function useInvalidateTimetable() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: timetableQueryKey });
}

// ------------------------------------------------------------------ reads
export function usePeriods() {
  return useQuery({ queryKey: periodsQueryKey, queryFn: () => timetable().listPeriods() });
}

export function useClassTimetable(classId: string | undefined) {
  return useQuery({
    queryKey: classTimetableQueryKey(classId ?? ""),
    queryFn: () => timetable().listClassEntries(classId!),
    enabled: Boolean(classId),
  });
}

/** The signed-in teacher's week. */
export function useMySchedule() {
  const { profile } = useSession();
  return useQuery({
    queryKey: teacherScheduleQueryKey(profile.id),
    queryFn: () => timetable().listTeacherEntries(profile.id),
  });
}

/** The signed-in student's class this year (null when not placed in one). */
export function useMyClass() {
  const { profile } = useSession();
  return useQuery({
    queryKey: studentClassQueryKey(profile.id),
    queryFn: () => timetable().getStudentClass(profile.id),
  });
}

export function useClassSubjectsWithTeachers(classId: string | undefined) {
  return useQuery({
    queryKey: classSubjectsWithTeachersQueryKey(classId ?? ""),
    queryFn: () => timetable().listClassSubjectsWithTeachers(classId!),
    enabled: Boolean(classId),
  });
}

// ----------------------------------------------------------------- writes
export function useSavePeriod() {
  const invalidate = useInvalidateTimetable();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PeriodInput }) => {
      if (id) await timetable().updatePeriod(id, input);
      else await timetable().createPeriod(schoolId, input);
    },
    onSuccess: invalidate,
  });
}

export function useDeletePeriod() {
  const invalidate = useInvalidateTimetable();
  return useMutation({
    mutationFn: (id: string) => timetable().deletePeriod(id),
    onSuccess: invalidate,
  });
}

/** Study days live on the school (session), so the server-rendered shell is refreshed too. */
export function useSetStudyDays() {
  const router = useRouter();
  return useMutation({
    mutationFn: (days: number[]) => timetable().setStudyDays(days),
    onSuccess: () => router.refresh(),
  });
}

export function useSetSlot() {
  const invalidate = useInvalidateTimetable();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({ slot, classSubjectId }: { slot: TimetableSlot; classSubjectId: string }) =>
      timetable().setSlot(schoolId, slot, classSubjectId),
    onSuccess: invalidate,
  });
}

export function useClearSlot() {
  const invalidate = useInvalidateTimetable();
  return useMutation({
    mutationFn: (slot: TimetableSlot) => timetable().clearSlot(slot),
    onSuccess: invalidate,
  });
}
