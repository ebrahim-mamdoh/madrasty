"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { subjectSchema, type Subject, type SubjectInput } from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSaveSubject } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "subject-form";

export type SubjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
};

export function SubjectFormDialog({ open, onOpenChange, subject }: SubjectFormDialogProps) {
  const t = useTranslations("structure.subjects");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveSubject();

  const defaults: SubjectInput = { name: subject?.name ?? "", code: subject?.code ?? "" };
  const form = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: subject?.id, input },
      {
        onSuccess: () => {
          notifySuccess(tc("saved"));
          close();
        },
        onError: (error) => applyFieldErrors(form.setError, error),
      },
    ),
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={subject ? t("edit_title") : t("create_title")}
      formId={FORM_ID}
      isPending={save.isPending}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <TextField
            control={form.control}
            name="name"
            label={t("name")}
            placeholder={t("name_placeholder")}
            autoFocus
          />
          <TextField
            control={form.control}
            name="code"
            label={t("code")}
            description={t("code_hint")}
            dir="ltr"
            autoComplete="off"
          />
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
