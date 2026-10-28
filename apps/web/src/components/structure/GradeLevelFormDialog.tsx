"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { gradeLevelSchema, type GradeLevel, type GradeLevelInput } from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSaveGradeLevel } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "grade-level-form";

export type GradeLevelFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradeLevel: GradeLevel | null;
};

export function GradeLevelFormDialog({
  open,
  onOpenChange,
  gradeLevel,
}: GradeLevelFormDialogProps) {
  const t = useTranslations("structure.grades");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveGradeLevel();

  const defaults: GradeLevelInput = { name: gradeLevel?.name ?? "" };
  const form = useForm<GradeLevelInput>({
    resolver: zodResolver(gradeLevelSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: gradeLevel?.id, input },
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
      title={gradeLevel ? t("edit_title") : t("create_title")}
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
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
