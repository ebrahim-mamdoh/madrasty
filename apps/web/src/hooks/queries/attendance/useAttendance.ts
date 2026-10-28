"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SaveAttendanceInput } from "@madrasty/core";
import { useSchoolId, useSession } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const attendanceQueryKey = ["attendance"] as const;
export const attendanceDayQueryKey = (classId: string, date: string) =>
  [...attendanceQueryKey, "day", classId, date] as const;
export const attendanceSummaryQueryKey = (classId: string, from: string, to: string) =>
  [...attendanceQueryKey, "summary", classId, from, to] as const;
export const studentAttendanceQueryKey = (studentId: string, from: string, to: string) =>
  [...attendanceQueryKey, "student", studentId, from, to] as const;

const attendance = () => getBrowserServices().attendance;

export function useAttendanceDay(classId: string | undefined, date: string) {
  return useQuery({
    queryKey: attendanceDayQueryKey(classId ?? "", date),
    queryFn: () => attendance().getDay(classId!, date),
    enabled: Boolean(classId && date),
  });
}

export function useAttendanceSummary(classId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: attendanceSummaryQueryKey(classId ?? "", from, to),
    queryFn: () => attendance().summary(classId!, from, to),
    enabled: Boolean(classId),
    placeholderData: keepPreviousData,
  });
}

/** The signed-in student's own history in a date range. */
export function useMyAttendance(range: { from: string; to: string } | undefined) {
  const { profile } = useSession();
  return useQuery({
    queryKey: studentAttendanceQueryKey(profile.id, range?.from ?? "", range?.to ?? ""),
    queryFn: () => attendance().listStudentRecords(profile.id, range!.from, range!.to),
    enabled: Boolean(range),
  });
}

/** A saved sheet changes that day, the class reports and the students' histories. */
export function useSaveAttendance() {
  const queryClient = useQueryClient();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: (input: SaveAttendanceInput) => attendance().saveDay(schoolId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceQueryKey }),
  });
}
