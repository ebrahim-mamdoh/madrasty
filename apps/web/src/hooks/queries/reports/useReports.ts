"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportInput } from "@madrasty/core";
import { useSchoolId } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const reportsQueryKey = ["reports"] as const;
export const reportSheetQueryKey = (classId: string, month: string) =>
  [...reportsQueryKey, "sheet", classId, month] as const;

const reports = () => getBrowserServices().reports;

function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: reportsQueryKey });
}

/** `month` is the stored first day (`YYYY-MM-01`). */
export function useReportSheet(classId: string | undefined, month: string) {
  return useQuery({
    queryKey: reportSheetQueryKey(classId ?? "", month),
    queryFn: () => reports().getSheet(classId!, month),
    enabled: Boolean(classId),
  });
}

export function useSaveReport() {
  const invalidate = useInvalidateReports();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({
      classId,
      studentId,
      month,
      input,
    }: {
      classId: string;
      studentId: string;
      month: string;
      input: ReportInput;
    }) => reports().save(schoolId, classId, studentId, month, input),
    onSuccess: invalidate,
  });
}

export function useSendReports() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (ids: string[]) => reports().send(ids),
    onSuccess: invalidate,
  });
}
