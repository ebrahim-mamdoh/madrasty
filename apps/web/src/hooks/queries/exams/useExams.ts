"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BankQuestion,
  Exam,
  ExamAnswers,
  ExamStatus,
  QuestionInput,
} from "@madrasty/core";
import type { ExamTransition, ExamWrite } from "@madrasty/api";
import { useSchoolId, useSession } from "@/hooks/useSession";
import { getBrowserServices } from "@/lib/services.client";

export const examsQueryKey = ["exams"] as const;
const key = (...parts: (string | undefined)[]) => [...examsQueryKey, ...parts.map((p) => p ?? "")];

const exams = () => getBrowserServices().exams;

/** Every exam write can move lists, details, results and grade books: refresh them all. */
function useExamMutation<TVariables, TResult = unknown>(
  run: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: examsQueryKey }),
  });
}

// ------------------------------------------------------------------ reads
export function useTeacherExams() {
  const { profile } = useSession();
  return useQuery({
    queryKey: key("teacher", profile.id),
    queryFn: () => exams().listForTeacher(profile.id),
  });
}

export function useSchoolExams(status?: ExamStatus) {
  return useQuery({
    queryKey: key("school", status),
    queryFn: () => exams().listForSchool(status),
  });
}

export function useStudentExams(classId: string | undefined) {
  const { profile } = useSession();
  return useQuery({
    queryKey: key("student", profile.id, classId),
    queryFn: () => exams().listForStudent(profile.id, classId!),
    enabled: Boolean(classId),
  });
}

export function useExam(id: string) {
  return useQuery({ queryKey: key("detail", id), queryFn: () => exams().get(id) });
}

export function useExamQuestions(examId: string, enabled: boolean) {
  return useQuery({
    queryKey: key("questions", examId),
    queryFn: () => exams().listQuestions(examId),
    enabled,
  });
}

export function useQuestionBank(subjectId: string | undefined) {
  return useQuery({
    queryKey: key("bank", subjectId),
    queryFn: () => exams().listBank(subjectId),
    enabled: Boolean(subjectId),
  });
}

export function useExamResults(exam: Exam | undefined, enabled = true) {
  return useQuery({
    queryKey: key("results", exam?.id),
    queryFn: () => exams().listResults(exam!),
    enabled: Boolean(exam) && enabled,
  });
}

export function useMyGrades() {
  const { profile } = useSession();
  return useQuery({
    queryKey: key("my-grades", profile.id),
    queryFn: () => exams().listStudentGrades(profile.id),
  });
}

export function useGradebook(classSubjectId: string | undefined, classId: string | undefined) {
  return useQuery({
    queryKey: key("gradebook", classSubjectId),
    queryFn: () => exams().gradebook(classSubjectId!, classId!),
    enabled: Boolean(classSubjectId && classId),
  });
}

// ----------------------------------------------------------------- writes
export function useSaveExam() {
  const schoolId = useSchoolId();
  return useExamMutation(
    async ({ id, classId, input }: { id?: string; classId: string; input: ExamWrite }) => {
      if (id) {
        await exams().update(id, input);
        return id;
      }
      return exams().create(schoolId, classId, input);
    },
  );
}

export function useDeleteExam() {
  return useExamMutation((id: string) => exams().remove(id));
}

export function useExamTransition() {
  return useExamMutation(
    ({ id, action, note }: { id: string; action: ExamTransition; note?: string }) =>
      exams().transition(id, action, note),
  );
}

export function useSaveQuestion() {
  const schoolId = useSchoolId();
  return useExamMutation(
    async ({
      examId,
      id,
      position,
      input,
    }: {
      examId: string;
      id?: string;
      position: number;
      input: QuestionInput;
    }) => {
      if (id) await exams().updateQuestion(id, input);
      else await exams().addQuestion(schoolId, examId, position, input);
    },
  );
}

export function useDeleteQuestion() {
  return useExamMutation((id: string) => exams().removeQuestion(id));
}

export function useImportQuestions() {
  const schoolId = useSchoolId();
  return useExamMutation(
    ({ examId, start, questions }: { examId: string; start: number; questions: BankQuestion[] }) =>
      exams().importQuestions(schoolId, examId, start, questions),
  );
}

export function useSaveBankQuestion() {
  const schoolId = useSchoolId();
  return useExamMutation(
    async ({ id, subjectId, input }: { id?: string; subjectId: string; input: QuestionInput }) => {
      if (id) await exams().updateBank(id, input);
      else await exams().addToBank(schoolId, subjectId, input);
    },
  );
}

export function useDeleteBankQuestion() {
  return useExamMutation((id: string) => exams().removeFromBank(id));
}

export function useSaveResults() {
  const schoolId = useSchoolId();
  return useExamMutation(
    ({ examId, rows }: { examId: string; rows: { studentId: string; score: number | null }[] }) =>
      exams().saveResults(schoolId, examId, rows),
  );
}

export function useStartExam() {
  return useMutation({ mutationFn: (examId: string) => exams().start(examId) });
}

export function useSubmitExam() {
  return useExamMutation(({ examId, answers }: { examId: string; answers: ExamAnswers }) =>
    exams().submit(examId, answers),
  );
}
