"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GradeInput,
  Homework,
  HomeworkAttachment,
  HomeworkSubmission,
} from "@madrasty/core";
import type { HomeworkWrite, NewAttachment } from "@madrasty/api";
import { useSchoolId, useSession } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const homeworkQueryKey = ["homework"] as const;
export const myAssignmentsQueryKey = (teacherId: string) =>
  [...homeworkQueryKey, "assignments", teacherId] as const;
export const teacherHomeworkQueryKey = (teacherId: string) =>
  [...homeworkQueryKey, "teacher", teacherId] as const;
export const classHomeworkQueryKey = (classId: string) =>
  [...homeworkQueryKey, "class", classId] as const;
export const studentHomeworkQueryKey = (studentId: string, classId: string) =>
  [...homeworkQueryKey, "student", studentId, classId] as const;
export const homeworkDetailQueryKey = (id: string) => [...homeworkQueryKey, "detail", id] as const;
export const submissionsQueryKey = (id: string) => [...homeworkQueryKey, "submissions", id] as const;

const homework = () => getBrowserServices().homework;

function useInvalidateHomework() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: homeworkQueryKey });
}

// ------------------------------------------------------------------ reads
export function useMyAssignments() {
  const { profile } = useSession();
  return useQuery({
    queryKey: myAssignmentsQueryKey(profile.id),
    queryFn: () => homework().listMyAssignments(profile.id),
  });
}

export function useTeacherHomework() {
  const { profile } = useSession();
  return useQuery({
    queryKey: teacherHomeworkQueryKey(profile.id),
    queryFn: () => homework().listForTeacher(profile.id),
  });
}

export function useClassHomework(classId: string | undefined) {
  return useQuery({
    queryKey: classHomeworkQueryKey(classId ?? ""),
    queryFn: () => homework().listForClass(classId!),
    enabled: Boolean(classId),
  });
}

export function useStudentHomework(classId: string | undefined) {
  const { profile } = useSession();
  return useQuery({
    queryKey: studentHomeworkQueryKey(profile.id, classId ?? ""),
    queryFn: () => homework().listForStudent(profile.id, classId!),
    enabled: Boolean(classId),
  });
}

export function useHomeworkDetail(id: string) {
  return useQuery({ queryKey: homeworkDetailQueryKey(id), queryFn: () => homework().get(id) });
}

export function useSubmissions(item: Homework | undefined) {
  return useQuery({
    queryKey: submissionsQueryKey(item?.id ?? ""),
    queryFn: () => homework().listSubmissions(item!),
    enabled: Boolean(item),
  });
}

// ----------------------------------------------------------------- writes
export function useCreateHomework() {
  const invalidate = useInvalidateHomework();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({
      classId,
      input,
      files,
    }: {
      classId: string;
      input: HomeworkWrite;
      files: NewAttachment[];
    }) => homework().create(schoolId, classId, input, files),
    onSuccess: invalidate,
  });
}

export function useUpdateHomework() {
  const invalidate = useInvalidateHomework();
  const schoolId = useSchoolId();
  return useMutation({
    mutationFn: ({
      item,
      input,
      kept,
      files,
    }: {
      item: Homework;
      input: Omit<HomeworkWrite, "classSubjectId">;
      kept: HomeworkAttachment[];
      files: NewAttachment[];
    }) => homework().update(schoolId, item, input, kept, files),
    onSuccess: invalidate,
  });
}

export function useDeleteHomework() {
  const invalidate = useInvalidateHomework();
  return useMutation({
    mutationFn: (item: Homework) => homework().remove(item),
    onSuccess: invalidate,
  });
}

export function useSubmitHomework() {
  const invalidate = useInvalidateHomework();
  const schoolId = useSchoolId();
  const { profile } = useSession();
  return useMutation({
    mutationFn: ({
      homeworkId,
      body,
      kept,
      files,
      previous,
    }: {
      homeworkId: string;
      body: string;
      kept: HomeworkAttachment[];
      files: NewAttachment[];
      previous: HomeworkSubmission | null;
    }) => homework().submit(schoolId, homeworkId, profile.id, body, kept, files, previous),
    onSuccess: invalidate,
  });
}

export function useGradeSubmission() {
  const invalidate = useInvalidateHomework();
  return useMutation({
    mutationFn: ({ submissionId, input }: { submissionId: string; input: GradeInput }) =>
      homework().grade(submissionId, input),
    onSuccess: invalidate,
  });
}

/**
 * Downloads a private attachment through a short-lived signed URL. The response is served as an
 * attachment, so the browser saves it without leaving the page (and no popup blocker is involved).
 */
export function useDownloadHomeworkFile() {
  return useMutation({
    mutationFn: async (attachment: HomeworkAttachment) => {
      window.location.assign(await homework().fileUrl(attachment));
    },
  });
}
