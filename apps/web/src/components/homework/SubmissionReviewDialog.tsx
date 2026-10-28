"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  gradeSchema,
  type GradeFormValues,
  type GradeInput,
  type Homework,
  type SubmissionRosterEntry,
} from "@madrasty/core";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { TextareaField } from "@/components/shared/form/TextareaField";
import { FieldError, FieldGroup, FieldTitle } from "@/components/ui/field";
import { useGradeSubmission } from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "grade-form";

export type SubmissionReviewDialogProps = {
  homework: Homework;
  entry: SubmissionRosterEntry | null;
  canGrade: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Reads a student's answer and (for graders) records the score and feedback. */
export function SubmissionReviewDialog({
  homework,
  entry,
  canGrade,
  onOpenChange,
}: SubmissionReviewDialogProps) {
  const t = useTranslations("homework");
  const format = useFormatter();
  const toMessage = useErrorMessage();
  const grade = useGradeSubmission();
  const submission = entry?.submission ?? null;

  const defaults: GradeFormValues = {
    score: submission?.score?.toString() ?? "",
    feedback: submission?.feedback ?? "",
  };
  const form = useForm<GradeFormValues, unknown, GradeInput>({
    resolver: zodResolver(gradeSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    grade.reset();
  };

  const onSubmit = form.handleSubmit((input) => {
    if (!submission) return;
    grade.mutate(
      { submissionId: submission.id, input },
      {
        onSuccess: () => {
          notifySuccess(t("graded_done"));
          close();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    );
  });

  const late = submission && new Date(submission.submittedAt) > new Date(homework.dueAt);

  return (
    <FormDialog
      open={Boolean(entry)}
      onOpenChange={(next) => !next && close()}
      title={entry?.fullName ?? ""}
      description={
        submission
          ? `${t("submitted_at", {
              time: format.dateTime(new Date(submission.submittedAt), {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}${late ? ` — ${t("late_note")}` : ""}`
          : t("not_submitted")
      }
      formId={FORM_ID}
      isPending={grade.isPending}
      submitLabel={t("save_grade")}
      className="sm:max-w-2xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {submission && (
            <div className="space-y-3">
              <FieldTitle>{t("answer")}</FieldTitle>
              {submission.body ? (
                <p className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap" dir="auto">
                  {submission.body}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("no_text")}</p>
              )}
              <AttachmentList attachments={submission.attachments} />
            </div>
          )}
          {submission && canGrade && (
            <>
              <TextField
                control={form.control}
                name="score"
                label={
                  homework.maxScore
                    ? t("score_out_of", { max: format.number(homework.maxScore) })
                    : t("score")
                }
                type="number"
                inputMode="decimal"
                dir="ltr"
              />
              <TextareaField
                control={form.control}
                name="feedback"
                label={t("feedback")}
                rows={3}
                maxLength={1000}
              />
            </>
          )}
          {grade.isError && !hasFieldErrors(grade.error) && (
            <FieldError>{toMessage(grade.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
