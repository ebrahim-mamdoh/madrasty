"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { academicYearSchema, type AcademicYear, type AcademicYearInput } from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSaveAcademicYear } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "academic-year-form";
const EMPTY: AcademicYearInput = { name: "", startsOn: "", endsOn: "" };

export type AcademicYearFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The year being edited; null creates a new one. */
  year: AcademicYear | null;
};

export function AcademicYearFormDialog({ open, onOpenChange, year }: AcademicYearFormDialogProps) {
  const t = useTranslations("structure.years");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveAcademicYear();

  const defaults: AcademicYearInput = year
    ? { name: year.name, startsOn: year.startsOn, endsOn: year.endsOn }
    : EMPTY;
  const form = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: year?.id, input },
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
      title={year ? t("edit_title") : t("create_title")}
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
            dir="ltr"
            autoFocus
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="startsOn" label={t("starts_on")} type="date" />
            <TextField control={form.control} name="endsOn" label={t("ends_on")} type="date" />
          </div>
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
