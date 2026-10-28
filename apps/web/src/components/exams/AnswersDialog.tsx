"use client";

import { Check, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ExamQuestion, ExamResultEntry } from "@madrasty/core";
import { AppDialogContent } from "@/components/shared/AppDialogContent";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useExamQuestions } from "@/hooks/queries/exams/useExams";
import { cn } from "@/lib/utils";

/** One student's online answers next to the correct ones (short answers are for the teacher to judge). */
export function AnswersDialog({
  examId,
  entry,
  onOpenChange,
}: {
  examId: string;
  entry: ExamResultEntry | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("exams.questions");
  const te = useTranslations("exams");
  const format = useFormatter();
  const questions = useExamQuestions(examId, Boolean(entry));
  const answers = entry?.attempt?.answers ?? {};

  const shown = (question: ExamQuestion) => {
    const answer = answers[question.id];
    if (answer === undefined || answer === "") return null;
    if (question.type === "mcq") return question.options[Number(answer)] ?? String(answer);
    if (question.type === "true_false") return answer === true ? t("true") : t("false");
    return String(answer);
  };

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <AppDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entry?.fullName}</DialogTitle>
          <DialogDescription>
            {typeof entry?.attempt?.autoScore === "number" &&
              te("auto_score", { score: format.number(entry.attempt.autoScore) })}
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {(questions.data ?? []).map((question, index) => {
            const answer = shown(question);
            const autoGraded = question.type !== "short";
            const correct = autoGraded && answers[question.id] === question.correctAnswer;
            return (
              <li key={question.id} className="rounded-lg border p-3 text-sm">
                <p className="mb-2 font-medium" dir="auto">
                  {index + 1}. {question.text}
                </p>
                <p
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1",
                    autoGraded && (correct ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"),
                  )}
                  dir="auto"
                >
                  {autoGraded &&
                    (correct ? (
                      <Check aria-label={t("right")} className="size-4" />
                    ) : (
                      <X aria-label={t("wrong")} className="size-4" />
                    ))}
                  {answer ?? <span className="text-muted-foreground">{t("no_answer")}</span>}
                </p>
              </li>
            );
          })}
        </ol>
      </AppDialogContent>
    </Dialog>
  );
}
