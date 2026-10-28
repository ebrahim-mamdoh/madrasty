"use client";

import { Library, ListChecks, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { Exam, ExamQuestion } from "@madrasty/core";
import { BankImportDialog } from "@/components/exams/BankImportDialog";
import { QuestionFormDialog } from "@/components/exams/QuestionFormDialog";
import { QuestionList } from "@/components/exams/QuestionList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteQuestion,
  useExamQuestions,
  useImportQuestions,
  useSaveQuestion,
} from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { notifyError, notifySuccess } from "@/lib/utils";

/** The online paper: built while the exam is a draft, read-only afterwards. */
export function QuestionsSection({ exam, editable }: { exam: Exam; editable: boolean }) {
  const t = useTranslations("exams.questions");
  const tc = useTranslations("common");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const questions = useExamQuestions(exam.id, true);
  const save = useSaveQuestion();
  const remove = useDeleteQuestion();
  const importQuestions = useImportQuestions();

  const [editing, setEditing] = useState<ExamQuestion | "new" | null>(null);
  const [deleting, setDeleting] = useState<ExamQuestion | null>(null);
  const [importing, setImporting] = useState(false);

  const rows = questions.data ?? [];
  const total = rows.reduce((sum, q) => sum + q.points, 0);
  const nextPosition = (rows.at(-1)?.position ?? 0) + 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("summary", { count: rows.length, points: format.number(total), max: format.number(exam.maxScore) })}
          </p>
        </div>
        {editable && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <Library aria-hidden />
              {t("from_bank")}
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden />
              {t("add")}
            </Button>
          </div>
        )}
      </div>

      {questions.isLoading ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ListChecks} title={t("empty")} description={editable ? t("empty_hint") : undefined} />
      ) : (
        <QuestionList
          questions={rows}
          onEdit={editable ? (q) => setEditing(q) : undefined}
          onDelete={editable ? (q) => setDeleting(q) : undefined}
        />
      )}

      {editable && (
        <>
          <QuestionFormDialog
            key={editing === "new" ? "new" : (editing?.id ?? "none")}
            open={editing !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditing(null);
                save.reset();
              }
            }}
            question={editing === "new" ? null : editing}
            isPending={save.isPending}
            error={save.error}
            onSave={(input) =>
              save.mutate(
                {
                  examId: exam.id,
                  id: editing && editing !== "new" ? editing.id : undefined,
                  position: editing && editing !== "new" ? editing.position : nextPosition,
                  input,
                },
                {
                  onSuccess: () => {
                    notifySuccess(tc("saved"));
                    setEditing(null);
                  },
                },
              )
            }
          />
          <BankImportDialog
            key={importing ? "open" : "closed"}
            open={importing}
            onOpenChange={setImporting}
            subjectId={exam.subjectId}
            isPending={importQuestions.isPending}
            onImport={(picked) =>
              importQuestions.mutate(
                { examId: exam.id, start: nextPosition, questions: picked },
                {
                  onSuccess: () => {
                    notifySuccess(t("imported", { n: picked.length }));
                    setImporting(false);
                  },
                  onError: (error) => notifyError(toMessage(error)),
                },
              )
            }
          />
          <ConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => !open && setDeleting(null)}
            title={t("delete_title")}
            description={t("delete_description")}
            isPending={remove.isPending}
            onConfirm={() =>
              deleting &&
              remove.mutate(deleting.id, {
                onSuccess: () => notifySuccess(tc("deleted")),
                onError: (error) => notifyError(toMessage(error)),
                onSettled: () => setDeleting(null),
              })
            }
          />
        </>
      )}
    </section>
  );
}
