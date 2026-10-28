"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import {
  schoolClassSchema,
  type GradeLevel,
  type PersonOption,
  type SchoolClass,
  type SchoolClassInput,
} from "@madrasty/core";
import { FormDialog } from "@/components/shared/FormDialog";
import { SelectField } from "@/components/shared/form/SelectField";
import { TextField } from "@/components/shared/form/TextField";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { useSaveClass } from "@/hooks/queries/structure/useStructure";
import { useErrorMessage } from "@/hooks/useErrorMessage";
import { applyFieldErrors, hasFieldErrors } from "@/lib/forms";
import { notifySuccess } from "@/lib/utils";

const FORM_ID = "class-form";

export type ClassFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass | null;
  /** New classes are created in the year currently selected on the page. */
  academicYearId: string;
  gradeLevels: GradeLevel[];
  teachers: PersonOption[];
};

export function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
  academicYearId,
  gradeLevels,
  teachers,
}: ClassFormDialogProps) {
  const t = useTranslations("structure.classes");
  const tc = useTranslations("common");
  const toMessage = useErrorMessage();
  const save = useSaveClass();

  const defaults: SchoolClassInput = {
    academicYearId: schoolClass?.academicYearId ?? academicYearId,
    gradeLevelId: schoolClass?.gradeLevel.id ?? "",
    name: schoolClass?.name ?? "",
    homeroomTeacherId: schoolClass?.homeroomTeacher?.id ?? "",
  };
  const form = useForm<SchoolClassInput>({
    resolver: zodResolver(schoolClassSchema),
    defaultValues: defaults,
  });

  const close = () => {
    onOpenChange(false);
    form.reset(defaults);
    save.reset();
  };

  const onSubmit = form.handleSubmit((input) =>
    save.mutate(
      { id: schoolClass?.id, input },
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
      title={schoolClass ? t("edit_title") : t("create_title")}
      formId={FORM_ID}
      isPending={save.isPending}
    >
      <form id={FORM_ID} noValidate onSubmit={onSubmit}>
        <FieldGroup>
          <SelectField
            control={form.control}
            name="gradeLevelId"
            label={t("grade")}
            placeholder={t("grade_placeholder")}
            options={gradeLevels.map((grade) => ({ value: grade.id, label: grade.name }))}
          />
          <TextField
            control={form.control}
            name="name"
            label={t("name")}
            placeholder={t("name_placeholder")}
          />
          <SelectField
            control={form.control}
            name="homeroomTeacherId"
            label={t("homeroom")}
            emptyOptionLabel={t("homeroom_none")}
            options={teachers.map((teacher) => ({ value: teacher.id, label: teacher.fullName }))}
          />
          {save.isError && !hasFieldErrors(save.error) && (
            <FieldError>{toMessage(save.error)}</FieldError>
          )}
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
