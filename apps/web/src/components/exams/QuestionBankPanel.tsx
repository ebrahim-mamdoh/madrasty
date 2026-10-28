"use client";

import { Library, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { BankQuestion } from "@madrasty/core";
import { ClassPicker } from "@/components/attendance/ClassPicker";
import { QuestionFormDialog } from "@/components/exams/QuestionFormDialog";
import { QuestionList } from "@/components/exams/QuestionList";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteBankQuestion,
  useQuestionBank,
  useSaveBankQuestion,
} from "@/hooks/queries/exams/useExams";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useUrlState } from "@/hooks/useUrlState";
import { notifyError, notifySuccess } from "@/lib/utils";

/** A teacher's reusable questions per subject they teach. */
export function QuestionBankPanel({ subjects }: { subjects: { id: string; name: string }[] }) {
  const t = useTranslations("exams.questions");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const { searchParams, setParams } = useUrlState();
  const requested = searchParams.get("subject");
  const subjectId = subjects.some((s) => s.id === requested) ? requested! : subjects[0]?.id;

  const bank = useQuestionBank(subjectId);
  const save = useSaveBankQuestion();
  const remove = useDeleteBankQuestion();
  const [editing, setEditing] = useState<BankQuestion | "new" | null>(null);
  const [deleting, setDeleting] = useState<BankQuestion | null>(null);

  if (subjects.length === 0) {
    return <EmptyState icon={Library} title={t("no_subjects")} />;
  }

  const rows = bank.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClassPicker
          classes={subjects}
          value={subjectId}
          onChange={(value) => setParams({ subject: value })}
          label={t("subject")}
        />
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </div>

      {bank.isLoading ? (
        <Skeleton className="h-32" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Library} title={t("bank_empty")} description={t("bank_hint")} />
      ) : (
        <QuestionList questions={rows} onEdit={setEditing} onDelete={setDeleting} />
      )}

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
          subjectId &&
          save.mutate(
            { id: editing && editing !== "new" ? editing.id : undefined, subjectId, input },
            {
              onSuccess: () => {
                notifySuccess(tc("saved"));
                setEditing(null);
              },
            },
          )
        }
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("delete_title")}
        description={t("delete_bank_description")}
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
    </div>
  );
}
