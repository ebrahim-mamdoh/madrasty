"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import {
  EXAM_KINDS,
  EXAM_MODES,
  examSchema,
  type Exam,
  type ExamFormValues,
  type ExamInput,
} from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { TextareaField } from "@/components/shared/form/TextareaField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSaveExam } from "@/hooks/queries/exams/useExams";
import { useMyAssignments } from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { useFeature } from "@/hooks/useSession";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "exam-form";

function nextWeekMorning(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  return toDateTimeInput(date.toISOString());
}

export type ExamFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a draft for one of the teacher's class subjects. */
  exam: Exam | null;
  onCreated?: (id: string) => void;
};

export function ExamFormDialog({ open, onOpenChange, exam, onCreated }: ExamFormDialogProps) {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const onlineEnabled = useFeature("online_exams");
  const assignments = useMyAssignments();
  const save = useSaveExam();

  const defaults: ExamFormValues = {
    classSubjectId: exam?.classSubjectId ?? "",
    title: exam?.title ?? "",
    kind: exam?.kind ?? "monthly",
    mode: exam?.mode ?? "paper",
    startsAt: exam ? toDateTimeInput(exam.startsAt) : nextWeekMorning(),
    durationMinutes: String(exam?.durationMinutes ?? 45),
    maxScore: String(exam?.maxScore ?? 20),
    instructions: exam?.instructions ?? "",
  };
  const form = useForm<ExamFormValues, unknown, ExamInput>({
    resolver: zodResolver(examSchema),
    defaultValues: defaults,
  });
  const mode = useWatch({ control: form.control, name: "mode" });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) => {
    const classId =
      exam?.classId ?? assignments.data?.find((a) => a.classSubjectId === input.classSubjectId)?.classId;
    if (!classId) return;
    save.mutate(
      { id: exam?.id, classId, input: { ...input, startsAt: fromDateTimeInput(input.startsAt) } },
      {
        onSuccess: (id) => {
          notifySuccess(exam ? tc("saved") : t("created"));
          close();
          if (!exam) onCreated?.(id);
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={exam ? t("edit_title") : t("create_title")}
      description={exam ? `${exam.className} — ${exam.subjectName}` : t("create_hint")}
      formId={FORM_ID}
      isPending={save.isPending}
      submitLabel={exam ? undefined : tc("create")}
      className="sm:max-w-2xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {!exam && (
            <SelectField
              control={form.control}
              name="classSubjectId"
              label={t("for_class")}
              placeholder={t("choose_class")}
              options={(assignments.data ?? []).map((a) => ({
                value: a.classSubjectId,
                label: `${a.className} — ${a.subjectName}`,
              }))}
            />
          )}
          <TextField control={form.control} name="title" label={t("title_field")} autoFocus />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={form.control}
              name="kind"
              label={t("kind")}
              options={EXAM_KINDS.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
            />
            <SelectField
              control={form.control}
              name="mode"
              label={t("mode")}
              options={EXAM_MODES.filter((m) => m === "paper" || onlineEnabled || exam?.mode === m).map(
                (m) => ({ value: m, label: t(`modes.${m}`) }),
              )}
            />
            <TextField
              control={form.control}
              name="startsAt"
              label={t("starts_at")}
              type="datetime-local"
              dir="ltr"
            />
            <TextField
              control={form.control}
              name="durationMinutes"
              label={t("duration")}
              description={mode === "online" ? t("duration_online_hint") : undefined}
              type="number"
              inputMode="numeric"
              dir="ltr"
            />
            <TextField
              control={form.control}
              name="maxScore"
              label={t("max_score")}
              type="number"
              inputMode="decimal"
              dir="ltr"
            />
          </div>
          <TextareaField
            control={form.control}
            name="instructions"
            label={t("instructions")}
            rows={3}
            maxLength={2000}
          />
          {save.isError && !hasFieldErrors(save.error) && <FieldError>{toMessage(save.error)}</FieldError>}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
