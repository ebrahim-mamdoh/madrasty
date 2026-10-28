"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  homeworkSchema,
  type Homework,
  type HomeworkFormValues,
  type HomeworkInput,
} from "@madrasty/core";
import { AttachmentsField, type AttachmentsValue } from "@/components/homework/AttachmentsField";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { TextareaField } from "@/components/shared/form/TextareaField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import {
  useCreateHomework,
  useMyAssignments,
  useUpdateHomework,
} from "@/hooks/queries/homework/useHomework";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { fromDateTimeInput, toDateTimeInput } from "@/lib/dates";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "homework-form";

/** Tomorrow at 20:00 local time — a sensible default deadline. */
function defaultDueAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(20, 0, 0, 0);
  return toDateTimeInput(date.toISOString());
}

export type HomeworkFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new homework (teachers pick one of their class subjects). */
  homework: Homework | null;
  onCreated?: (id: string) => void;
};

export function HomeworkFormDialog({
  open,
  onOpenChange,
  homework,
  onCreated,
}: HomeworkFormDialogProps) {
  const t = useTranslations("homework");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const assignments = useMyAssignments();
  const create = useCreateHomework();
  const update = useUpdateHomework();
  const mutation = homework ? update : create;

  const defaults: HomeworkFormValues = {
    classSubjectId: homework?.classSubjectId ?? "",
    title: homework?.title ?? "",
    body: homework?.body ?? "",
    dueAt: homework ? toDateTimeInput(homework.dueAt) : defaultDueAt(),
    maxScore: homework?.maxScore?.toString() ?? "10",
  };
  const form = useForm<HomeworkFormValues, unknown, HomeworkInput>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: defaults,
  });
  const [files, setFiles] = useState<AttachmentsValue>({
    kept: homework?.attachments ?? [],
    added: [],
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    setFiles({ kept: homework?.attachments ?? [], added: [] });
    create.reset();
    update.reset();
  };

  const onError = (error: unknown) => applyFieldErrors(form.setError, error);

  const onSubmit = form.handleSubmit((input) => {
    const write = { ...input, dueAt: fromDateTimeInput(input.dueAt) };
    const added = files.added.map((file) => ({ file, name: file.name }));
    if (homework) {
      update.mutate(
        { item: homework, input: write, kept: files.kept, files: added },
        {
          onSuccess: () => {
            notifySuccess(tc("saved"));
            close();
          },
          onError,
        },
      );
      return;
    }
    const classId = assignments.data?.find((a) => a.classSubjectId === input.classSubjectId)?.classId;
    if (!classId) return;
    create.mutate(
      { classId, input: write, files: added },
      {
        onSuccess: (id) => {
          notifySuccess(t("created"));
          close();
          onCreated?.(id);
        },
        onError,
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={homework ? t("edit_title") : t("create_title")}
      description={homework ? `${homework.className} — ${homework.subjectName}` : undefined}
      formId={FORM_ID}
      isPending={mutation.isPending}
      submitLabel={homework ? undefined : t("publish")}
      className="sm:max-w-2xl"
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          {!homework && (
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
          <TextareaField
            control={form.control}
            name="body"
            label={t("body")}
            placeholder={t("body_placeholder")}
            rows={5}
            maxLength={5000}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="dueAt"
              label={t("due_at")}
              type="datetime-local"
              dir="ltr"
            />
            <TextField
              control={form.control}
              name="maxScore"
              label={t("max_score")}
              description={t("max_score_hint")}
              type="number"
              inputMode="decimal"
              dir="ltr"
            />
          </div>
          <AttachmentsField
            label={t("attachments")}
            value={files}
            onChange={setFiles}
            disabled={mutation.isPending}
          />
          {mutation.isError && !hasFieldErrors(mutation.error) && (
            <FieldError>{toMessage(mutation.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
